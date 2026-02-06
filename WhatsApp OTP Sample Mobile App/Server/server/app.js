/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import axios from 'axios';
import bodyParser from 'body-parser';
import { assert } from 'console';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import { exit } from 'process';

const app = express();

const port = 3000;

const codeLength = 6;
const codeLifetimeInMinutes = 5;
const maxVerificationAttempts = 3;

const filename = "whatsapp-info.json";

const apiVersion = "v21.0";

let activeCodes = {};

/**
 * Generate a cryptographically secure OTP code.
 * Uses crypto.randomInt() which provides uniform distribution.
 */
function generateCode() {
  // Generate a random number between 100000 and 999999 (6 digits)
  return crypto.randomInt(10 ** (codeLength - 1), 10 ** codeLength).toString();
}

/**
 * Hash an OTP code using SHA-256.
 * The plaintext code is never stored - only the hash.
 */
function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a code using constant-time comparison to prevent timing attacks.
 */
function verifyCode(providedCode, storedHash) {
  const providedHash = hashCode(providedCode);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(storedHash, 'hex'),
      Buffer.from(providedHash, 'hex')
    );
  } catch {
    return false;
  }
}

let data;
try {
  const filepath = new URL(`../setup/${filename}`, import.meta.url);
  const rawData = fs.readFileSync(filepath);
  data = JSON.parse(rawData);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.log(`Missing ${filename} file. Please run setup.py first.`);
    exit();
  }
  console.log(
    `Could not read ${filename} file or it was in the wrong format.`
  );
  throw (err);
}

const wabaID = data?.waba_id;
assert(wabaID != null, `Missing WABA ID in ${filename} file.`);
const accessToken = data?.access_token;
assert(accessToken != null, `Missing access token in ${filename}.`);
const phoneNumberID = data?.phone_number_id;
assert(phoneNumberID != null, `Missing phone number ID in ${filename}`);
const templateID = data?.template_id;
assert(templateID != null, `Missing template ID in ${filename}.`);

let templatesURL =
  `https://graph.facebook.com/${apiVersion}/${wabaID}/message_templates` +
  `?access_token=${accessToken}`;
let template = null;
do {
  const templatesResponse = await axios.get(templatesURL);
  template = templatesResponse?.data?.data?.find(
    template => template?.id === templateID
  );
  templatesURL = templatesResponse?.data?.paging?.next;
} while (template == null && templatesURL != null);

if (template == null) {
  console.log(
    `Could not find template with ID ${templateID} for WABA ${wabaID}.`
  );
  exit();
} else if (template?.status !== 'APPROVED') {
  console.log(
    `Please wait until the template with ID ${templateID} is approved before ` +
    `running this script.`
  );
  exit();
}

const templateName = template?.name;
console.log(
  `Verified OTP template '${templateName}' with ID ${templateID} is approved ` +
  'and ready to send.'
);

app.use(bodyParser.json());

// Middleware that gets executed at the end of every request
app.use((_req, res, next) => {
  console.log("Current time: ", new Date());
  res.on('finish', () => {
    console.log(`Response (${res.statusCode}): ${res.statusMessage}`);
    console.log("Active codes state (hashes shown, not plaintext):");
    // Show truncated hashes for readability
    const displayCodes = {};
    for (const [phone, data] of Object.entries(activeCodes)) {
      displayCodes[phone] = {
        codeHash: data.codeHash.substring(0, 16) + '...',
        expirationTimestamp: data.expirationTimestamp,
        attempts: data.attempts
      };
    }
    console.table(displayCodes);
    console.log()
  });

  next();
})

app.get('/otp/:phone_number', async (req, res) => {
  const phone = req.params.phone_number;
  console.log(`OTP requested for phone # ${phone}`);

  const code = generateCode();
  const expirationTimestamp = new Date();
  expirationTimestamp.setMinutes(
    expirationTimestamp.getMinutes() + codeLifetimeInMinutes
  );

  const sendMessageURL =
    `https://graph.facebook.com/${apiVersion}/${phoneNumberID}/messages`;
  const config = {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  };
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en_US",
        policy: "deterministic"
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: code
            }
          ]
        },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [
            {
              type: "text",
              text: code
            }
          ]
        }
      ]
    }
  };

  await axios.post(sendMessageURL, payload, config).then((_res) => {
    // Store the hash of the code, not the plaintext
    activeCodes[phone] = {
      codeHash: hashCode(code),
      expirationTimestamp,
      attempts: 0
    };
    res.send();
  }).catch((error) => {
    const errorCode = error.response?.status;
    const errorText = error.response?.data?.error?.error_data?.details;
    console.log(`Error (${errorCode}) from calling send message API: ${errorText}`);

    res.status(500).send('Error calling send message API. Check server logs.');
  });
});

app.post('/otp/:phone_number', (req, res) => {
  const phone = req.params.phone_number;
  console.log(`OTP validation request for phone # ${phone}`);

  const activeCode = activeCodes[phone];
  if (activeCode == null) {
    return res.status(404).send(`No active code for phone # ${phone}`);
  }

  const { codeHash, expirationTimestamp, attempts } = activeCode;

  const actualCode = req.body?.code;
  if (actualCode == null) {
    return res.status(400).send("No code provided.");
  }

  // Check if code has expired
  if (expirationTimestamp < Date.now()) {
    delete activeCodes[phone];
    return res.status(401).send("Code has expired, please request another.");
  }

  // Check if max attempts exceeded
  if (attempts >= maxVerificationAttempts) {
    delete activeCodes[phone];
    return res.status(401).send("Too many failed attempts, please request a new code.");
  }

  // Verify the code using constant-time comparison
  if (!verifyCode(actualCode, codeHash)) {
    // Increment attempt counter
    activeCodes[phone].attempts = attempts + 1;

    // Check if this was the last attempt
    if (activeCodes[phone].attempts >= maxVerificationAttempts) {
      delete activeCodes[phone];
      return res.status(401).send("Too many failed attempts, please request a new code.");
    }

    const remainingAttempts = maxVerificationAttempts - activeCodes[phone].attempts;
    return res.status(401).send(`Incorrect code. ${remainingAttempts} attempt(s) remaining.`);
  }

  // Success - delete the code (one-time use)
  delete activeCodes[phone];
  res.send();
});

app.listen(port, () => {
  console.log(`Sample app listening on port ${port}`);
});
