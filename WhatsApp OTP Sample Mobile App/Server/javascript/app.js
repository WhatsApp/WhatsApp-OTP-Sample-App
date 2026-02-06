/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * @fileoverview WhatsApp OTP Sample Server
 *
 * A Node.js/Express server that generates and verifies OTP codes sent via
 * WhatsApp Business API authentication templates.
 *
 * @description Security features:
 * - Cryptographically secure OTP generation using crypto.randomInt()
 * - SHA-256 hashing for OTP storage (plaintext never persisted)
 * - Constant-time comparison to prevent timing attacks
 * - Maximum verification attempts (3) to prevent brute force
 * - OTP expiry after 5 minutes
 * - One-time use (code deleted after successful verification)
 *
 * @requires axios - HTTP client for WhatsApp Graph API calls
 * @requires express - Web framework
 * @requires crypto - Node.js cryptographic functions
 *
 * @author Meta Platforms, Inc.
 * @license MIT
 */

import axios from 'axios';
import bodyParser from 'body-parser';
import { assert } from 'console';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import { exit } from 'process';

/**
 * Express application instance.
 * @type {import('express').Application}
 */
const app = express();

/**
 * Server port number.
 * @constant {number}
 */
const port = 3000;

/**
 * Number of digits in the OTP code.
 * @constant {number}
 */
const codeLength = 6;

/**
 * OTP code expiry time in minutes.
 * @constant {number}
 */
const codeLifetimeInMinutes = 5;

/**
 * Maximum allowed verification attempts before OTP is invalidated.
 * @constant {number}
 */
const maxVerificationAttempts = 3;

/**
 * Filename for WhatsApp configuration JSON.
 * @constant {string}
 */
const filename = "whatsapp-info.json";

/**
 * WhatsApp Graph API version.
 * @constant {string}
 */
const apiVersion = "v21.0";

/**
 * In-memory storage for active OTP codes.
 * Maps phone numbers to their OTP data.
 *
 * @type {Object.<string, OTPData>}
 *
 * @typedef {Object} OTPData
 * @property {string} codeHash - SHA-256 hash of the OTP code
 * @property {Date} expirationTimestamp - When the code expires
 * @property {number} attempts - Number of verification attempts made
 */
let activeCodes = {};

/**
 * Generates a cryptographically secure OTP code.
 *
 * Uses crypto.randomInt() which provides uniform distribution across the range,
 * making it suitable for security-sensitive applications unlike Math.random().
 *
 * @returns {string} A 6-digit numeric OTP code as a string
 *
 * @example
 * const code = generateCode();
 * console.log(code); // "847293"
 */
function generateCode() {
  // Generate a random number between 100000 and 999999 (6 digits)
  return crypto.randomInt(10 ** (codeLength - 1), 10 ** codeLength).toString();
}

/**
 * Hashes an OTP code using SHA-256.
 *
 * The plaintext code is never stored in the system - only the hash is persisted.
 * This ensures that even if the storage is compromised, the actual codes cannot
 * be recovered.
 *
 * @param {string} code - The plaintext OTP code to hash
 * @returns {string} The SHA-256 hash as a hexadecimal string (64 characters)
 *
 * @example
 * const hash = hashCode("123456");
 * // Returns: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"
 */
function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verifies a provided OTP code against a stored hash using constant-time comparison.
 *
 * Uses crypto.timingSafeEqual() to prevent timing attacks, where an attacker could
 * measure response times to deduce correct characters in the code.
 *
 * @param {string} providedCode - The code submitted by the user for verification
 * @param {string} storedHash - The SHA-256 hash of the correct OTP code
 * @returns {boolean} True if the provided code matches the stored hash, false otherwise
 *
 * @example
 * const hash = hashCode("123456");
 * verifyCode("123456", hash); // true
 * verifyCode("654321", hash); // false
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

/**
 * @typedef {Object} WhatsAppConfig
 * @property {string} waba_id - WhatsApp Business Account ID
 * @property {string} access_token - System User access token
 * @property {string} phone_number_id - WhatsApp phone number ID
 * @property {string} template_id - Authentication template ID
 */

/**
 * Loaded WhatsApp configuration from setup.
 * @type {WhatsAppConfig}
 */
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

/** @type {string} WhatsApp Business Account ID */
const wabaID = data?.waba_id;
assert(wabaID != null, `Missing WABA ID in ${filename} file.`);

/** @type {string} System User access token for API calls */
const accessToken = data?.access_token;
assert(accessToken != null, `Missing access token in ${filename}.`);

/** @type {string} WhatsApp phone number ID for sending messages */
const phoneNumberID = data?.phone_number_id;
assert(phoneNumberID != null, `Missing phone number ID in ${filename}`);

/** @type {string} Authentication template ID */
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

/**
 * Logging middleware that executes after every request.
 *
 * Logs the current timestamp, response status, and a sanitized view of active
 * OTP codes (showing only truncated hashes for security).
 *
 * @param {import('express').Request} _req - Express request object (unused)
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
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

/**
 * Request OTP endpoint.
 *
 * Generates a new OTP code, stores its hash, and sends it via WhatsApp.
 *
 * @route GET /otp/:phone_number
 * @param {string} phone_number - Recipient phone number in international format without '+' (e.g., "15551234567")
 *
 * @returns {200} OTP sent successfully
 * @returns {500} Error calling WhatsApp send message API
 *
 * @example
 * // Request OTP for a phone number
 * curl -X GET http://127.0.0.1:3000/otp/15551234567/
 */
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

/**
 * Verify OTP endpoint.
 *
 * Validates the provided code against the stored hash using constant-time comparison.
 * Tracks attempts and invalidates the code after max attempts or on success.
 *
 * @route POST /otp/:phone_number
 * @param {string} phone_number - Phone number the OTP was sent to
 *
 * @body {Object} body
 * @body {string} body.code - The OTP code to verify
 *
 * @returns {200} OK - Verification successful
 * @returns {400} No code provided
 * @returns {401} Code has expired / Incorrect code / Too many failed attempts
 * @returns {404} No active code for this phone number
 *
 * @example
 * // Verify OTP code
 * curl -X POST http://127.0.0.1:3000/otp/15551234567/ \
 *   -d '{"code": "123456"}' \
 *   -H "Content-Type: application/json"
 */
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

/**
 * Start the Express server.
 *
 * Listens on the configured port and logs a startup message.
 */
app.listen(port, () => {
  console.log(`Sample app listening on port ${port}`);
});
