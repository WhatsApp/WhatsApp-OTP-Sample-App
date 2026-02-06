# WhatsApp OTP Setup Scripts

This folder contains interactive setup scripts that configure your WhatsApp Business API credentials for the OTP sample servers.

## Purpose

Before running any of the OTP server implementations (Python, JavaScript, Go, or Java), you must run one of these setup scripts. The setup script:

1. **Collects your WhatsApp Business API credentials**:
   - WhatsApp Business Account (WABA) ID
   - System User access token
   - Phone number ID

2. **Creates an authentication message template** via the WhatsApp Graph API

3. **Generates `whatsapp-info.json`** containing all the configuration needed by the OTP servers

## Choose Your Setup Script

| Script | Language | Dependencies |
|--------|----------|--------------|
| `setup.py` | Python 3 | `requests`, `phonenumbers` |
| `setup.sh` | Bash | `curl`, `jq` |
| `setup.js` | Node.js | `node-fetch`, `readline` |

All scripts produce identical output (`whatsapp-info.json`) and can be used interchangeably.

## Running the Setup

### Python (Recommended)

```bash
pip3 install -r requirements.txt
python3 setup.py
```

### Bash

```bash
chmod +x setup.sh
./setup.sh
```

Requires `curl` and `jq` to be installed.

### JavaScript (Node.js)

```bash
npm install
node setup.js
```

## Output

After successful completion, you'll have a `whatsapp-info.json` file:

```json
{
    "waba_id": "YOUR_WABA_ID",
    "access_token": "YOUR_ACCESS_TOKEN",
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "template_id": "YOUR_TEMPLATE_ID"
}
```

This file is read by all OTP server implementations to send WhatsApp messages.

> **Tip:** A template `whatsapp-info.json` with placeholder values is included. You can either run a setup script to populate it automatically, or edit it manually if you already have an approved authentication template.

## Prerequisites

Before running setup, you need:

1. A **WhatsApp Business Account (WABA)** with an associated address in Meta Business Manager
2. A **System User access token** with these permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
3. A **phone number** associated with your WABA

See the main [Server README](../README.md) for detailed setup instructions.

## Security Note

The `whatsapp-info.json` file contains sensitive credentials. In production:
- Never commit this file to version control
- Use environment variables or a secrets manager instead
- The file is already in `.gitignore`
