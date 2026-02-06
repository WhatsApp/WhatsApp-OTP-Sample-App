/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * WhatsApp OTP Setup Script (JavaScript/Node.js version)
 *
 * Creates an authentication message template and generates whatsapp-info.json
 * for use by the OTP sample servers.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_VERSION = 'v21.0';
const CONFIG_FILENAME = 'whatsapp-info.json';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompts the user for input.
 * @param {string} question - The question to ask
 * @returns {Promise<string>} The user's response
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompts the user to select from a list of options.
 * @param {string[]} options - Array of option labels
 * @returns {Promise<number>} Selected index
 */
async function promptOption(options) {
  options.forEach((opt, idx) => console.log(`[${idx}]: ${opt}`));

  while (true) {
    const answer = await prompt(`Enter a number between 0 and ${options.length - 1}: `);
    const idx = parseInt(answer, 10);
    if (!isNaN(idx) && idx >= 0 && idx < options.length) {
      return idx;
    }
  }
}

/**
 * Makes an HTTP request to the Graph API.
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<object>} JSON response
 */
async function graphRequest(url, options = {}) {
  const response = await fetch(url, options);
  return response.json();
}

async function main() {
  console.log('Welcome to the WhatsApp One-Time Password (OTP) Sample Application.');
  console.log('This set-up script will help you get the starter code working for your business.\n');
  console.log("Let's start by creating a new authentication message template.\n");

  const configPath = path.join(__dirname, CONFIG_FILENAME);

  // Load previous data if exists
  let previousData = {};
  if (fs.existsSync(configPath)) {
    try {
      previousData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`Loaded existing ${CONFIG_FILENAME}.\n`);
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Collect WABA ID
  console.log('Please enter your WhatsApp Business Account (WABA) ID:');
  console.log('(You can find the WABA ID at https://business.facebook.com/settings/whatsapp-business-accounts/)');
  if (previousData.waba_id) {
    console.log(`Leave blank to use the previously inputted WABA ${previousData.waba_id}.`);
  }
  let wabaId = await prompt('');
  wabaId = wabaId || previousData.waba_id;
  console.log();

  // Collect Access Token
  console.log('Please provide a System User access token linked to the business:');
  console.log('(See https://www.facebook.com/business/help/503306463479099 for how to create a new System User and token.)');
  if (previousData.access_token) {
    console.log('Leave blank to use the previously inputted access token.');
  }
  let accessToken = await prompt('');
  accessToken = accessToken || previousData.access_token;
  console.log();

  // Get phone numbers
  console.log('Thank you. Calling WhatsApp API to check available phone numbers...\n');

  const phoneNumbersUrl = `https://graph.facebook.com/${API_VERSION}/${wabaId}/phone_numbers?access_token=${accessToken}`;
  const phoneNumbersResponse = await graphRequest(phoneNumbersUrl);

  if (phoneNumbersResponse.error) {
    console.log('Error while checking available phone numbers.');
    console.log(JSON.stringify(phoneNumbersResponse.error, null, 2));
    process.exit(1);
  }

  const phoneNumbers = phoneNumbersResponse.data || [];
  if (phoneNumbers.length === 0) {
    console.log('Your WABA does not have any phone numbers associated with it.');
    process.exit(1);
  }

  console.log('Please select a phone number from the following list:\n');
  const phoneOptions = phoneNumbers.map((p) => p.display_phone_number);
  const selectedPhoneIdx = await promptOption(phoneOptions);
  const phoneNumberId = phoneNumbers[selectedPhoneIdx].id;
  console.log();

  // Select platform
  console.log('Please select which platform(s) you wish to test the sample app on.\n');
  const platformIdx = await promptOption(['Android', 'iOS', 'Both']);
  console.log();

  // Determine code submission method
  let codeMethod = 'copy_code';
  if (platformIdx !== 1) {
    // Not iOS-only
    console.log('Please select the code delivery method for Android:');
    console.log('(Note that iOS only supports "Copy code" at present.)\n');
    const methodIdx = await promptOption([
      'Copy code: Customers tap the button to copy the code',
      'One-tap autofill (recommended): Customers tap to fill the code'
    ]);
    codeMethod = methodIdx === 1 ? 'one_tap' : 'copy_code';
    console.log();
  }

  // Get template name
  const platformNames = ['android', 'ios', 'both'];
  const defaultTemplateName = `otp_${platformNames[platformIdx]}_${codeMethod}`;
  console.log('Please provide a name for your new authentication template:');
  console.log(`(Leave blank to use the default name '${defaultTemplateName}'.)`);
  let templateName = await prompt('');
  templateName = templateName || defaultTemplateName;
  console.log();

  // Build button component
  let button;
  if (codeMethod === 'one_tap') {
    const defaultSignature = 'K8a/AINcGX7';
    console.log('Please provide the app signature hash for the template:');
    console.log(`(Leave blank to use the default '${defaultSignature}')`);
    let signatureHash = await prompt('');
    signatureHash = signatureHash || defaultSignature;

    button = {
      type: 'OTP',
      otp_type: 'ONE_TAP',
      text: 'Copy code',
      autofill_text: 'Autofill',
      package_name: 'com.whatsapp.otp.sample',
      signature_hash: signatureHash
    };
  } else {
    button = {
      type: 'OTP',
      otp_type: 'COPY_CODE',
      text: 'Copy code'
    };
  }

  // Create template
  console.log('\nThank you. Calling WhatsApp API to create OTP template...\n');

  const payload = {
    name: templateName,
    language: 'en_US',
    category: 'AUTHENTICATION',
    components: [
      {
        type: 'BODY',
        add_security_recommendation: true
      },
      {
        type: 'FOOTER',
        code_expiration_minutes: 5
      },
      {
        type: 'BUTTONS',
        buttons: [button]
      }
    ]
  };

  const templateUrl = `https://graph.facebook.com/${API_VERSION}/${wabaId}/message_templates?access_token=${accessToken}`;
  const templateResponse = await graphRequest(templateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (templateResponse.id) {
    const templateId = templateResponse.id;
    console.log(`Your new template with ID ${templateId} was just created.`);

    // Write config file
    const config = {
      waba_id: wabaId,
      access_token: accessToken,
      phone_number_id: phoneNumberId,
      template_id: templateId
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    console.log(`Configuration saved to ${CONFIG_FILENAME}`);
  } else {
    console.log('Template not created.');
    console.log(JSON.stringify(templateResponse, null, 2));
    process.exit(1);
  }

  rl.close();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
