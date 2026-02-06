# WhatsApp Authentication Templates: Complete Setup Guide

> A step-by-step walkthrough for setting up WhatsApp OTP delivery using the Cloud API — from zero accounts to production-ready. Implementation agnostic.

---

## Table of Contents

1. [How It Actually Works](#1-how-it-actually-works)
2. [Prerequisites Checklist](#2-prerequisites-checklist)
3. [Phase 1: Create All Accounts](#3-phase-1-create-all-accounts)
4. [Phase 2: Create a Developer App](#4-phase-2-create-a-developer-app)
5. [Phase 3: Privacy Policy, Terms of Service & Going Live](#5-phase-3-privacy-policy-terms-of-service--going-live)
6. [Phase 4: Add a Phone Number & Payment Method](#6-phase-4-add-a-phone-number--payment-method)
7. [Phase 5: Verify Your Business](#7-phase-5-verify-your-business)
8. [Phase 6: Create Authentication Templates](#8-phase-6-create-authentication-templates)
9. [Phase 7: System Users & Access Tokens](#9-phase-7-system-users--access-tokens)
10. [Phase 8: Set Up Webhooks](#10-phase-8-set-up-webhooks)
11. [Pricing](#11-pricing)
12. [Messaging Limits & Scaling](#12-messaging-limits--scaling)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. How It Actually Works

A common misconception is that WhatsApp generates or manages OTP codes. **It does not.** Your server generates the OTP, your server verifies it. WhatsApp is purely the delivery channel — a replacement for SMS.

### The Flow

```
User clicks         Your server          WhatsApp Cloud API        User's phone
"Send Code"  ──►  generates OTP  ──►  POST /{phone_id}/messages  ──►  WhatsApp message
                  stores OTP                                         "847291 is your
                  with expiry                                         verification code"

User enters         Your server
the code     ──►  compares code  ──►  Success / Failure
                  from storage
```

### What the Authentication Template Does

The authentication template is a **pre-approved message format** with fixed text. You cannot customize the body — it's always:

```
*{CODE}* is your verification code.
```

Optionally followed by:
- Security disclaimer: `For your security, do not share this code.`
- Expiration warning: `This code expires in {N} minutes.`

And a button: **Copy Code**, **One-Tap Autofill** (Android), or **Zero-Tap** (Android).

The fixed text is **automatically localized** to whatever language you specified when creating the template. If you created it with `language: "es"`, the user sees it in Spanish. You don't translate anything — the platform handles the localization of the preset text.

### Three Button Types

| Type | Platform | User Experience |
|------|----------|----------------|
| **Copy Code** | All platforms | User taps button → code copied to clipboard → user pastes into your app |
| **One-Tap** | Android only | User taps button → your app opens automatically with the code passed via intent |
| **Zero-Tap** | Android only | Code is broadcast to your app automatically — user never leaves your app |

One-Tap and Zero-Tap fall back to Copy Code on non-Android devices.

---

## 2. Prerequisites Checklist

| Item | Notes |
|------|-------|
| **Personal Facebook account** | For creating developer/business accounts |
| **Personal phone number** | For Facebook account verification |
| **Business phone number** | The number WhatsApp messages will come FROM. Cannot already be registered on WhatsApp personal or business app. Can be a landline (verified via voice call). |
| **Business website** | Needed for display name approval and business verification |
| **Business email** | For developer account and notifications |
| **Credit/debit card** | For billing — messages are charged per-message |
| **Privacy policy URL** | Hosted on your domain — required to switch app to Live mode |
| **Terms of service URL** | Hosted on your domain — required to switch app to Live mode |
| **Business registration documents** | For business verification (incorporation certificate, tax ID, utility bill, etc.) |

---

## 3. Phase 1: Create All Accounts

You need three accounts. They're all interconnected but created separately.

### 3.1 Facebook Account

If you don't already have one, create a Facebook account at [facebook.com](https://facebook.com). This acts as the identity layer for everything else.

### 3.2 Meta Business Portfolio (formerly Business Manager)

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **"Create an account"** (or "Create a business portfolio")
3. Enter:
   - Business portfolio name (your company name)
   - Your name
   - Business email
4. Follow the verification steps

This is where all your WhatsApp assets (phone numbers, templates, billing) live.

### 3.3 Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **"Get Started"**
3. Log in with your Facebook account
4. Accept the terms
5. Verify your phone number
6. Select your role (e.g., "Developer")

---

## 4. Phase 2: Create a Developer App

### Create the App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **"Create App"**
3. Under **"Use cases"**, select **"Other"**
4. Click Next
5. Under **"App type"**, select **"Business"**
6. Click Next
7. Fill in:
   - **App name**: e.g., "MyApp Auth" (do not include "WhatsApp" or other trademarks)
   - **App contact email**: your business email
   - **Business portfolio**: select the one you created
8. Click **"Create App"**

### Add the WhatsApp Product

1. In the app dashboard, find **"WhatsApp"** and click **"Set up"**
2. Select your business portfolio → **"Continue"**
3. A WhatsApp Business Account (WABA) is automatically created

You'll land on the **WhatsApp > API Setup** page showing:
- A **temporary access token** (24-hour lifetime — only for quick testing)
- A **test phone number** (for sandbox testing)
- A **Phone Number ID** and **WhatsApp Business Account ID**

Save these values.

---

## 5. Phase 3: Privacy Policy, Terms of Service & Going Live

Your app starts in **Development mode** — it can only message up to 5 pre-registered test numbers. To go Live, you need policy URLs.

### What Your Privacy Policy Must Cover

- What data you collect (phone numbers, verification metadata)
- Why you collect it (identity verification via OTP)
- How you store it (encryption, retention periods)
- Third-party sharing (phone numbers are transmitted to the WhatsApp Business Platform for message delivery)
- User rights (data deletion, opt-out)
- Contact information for privacy inquiries

### What Your Terms of Service Must Cover

- Description of your service
- User obligations (providing a valid WhatsApp phone number)
- Messaging consent (by requesting an OTP, users consent to receiving a WhatsApp message)
- Limitations of service

### Entering the URLs

1. In the developer dashboard, go to **App Settings > Basic**
2. Fill in:
   - **Privacy Policy URL**: `https://yourdomain.com/privacy`
   - **Terms of Service URL**: `https://yourdomain.com/terms`
   - **App Domains**: `yourdomain.com`
   - **Category**: select **"Messaging"**
3. Click **"Save Changes"**

### Switching to Live Mode

1. At the top of the dashboard, find the toggle: **"App Mode: Development"**
2. Click to switch to **"Live"**
3. Confirm when prompted

**What changes in Live mode:**
- You can message any WhatsApp user (not just test numbers)
- Messages incur real charges
- Templates are subject to quality enforcement

---

## 6. Phase 4: Add a Phone Number & Payment Method

### Add Your Business Phone Number

1. In the developer console, go to **WhatsApp > API Setup**
2. Click **"Add phone number"**
3. Enter your business details and phone number with country code
4. Verify via SMS or voice call
5. Your number is now linked to the WABA

**Display name rules:**
- Must include your actual business name
- Must match what's on your website
- Gets re-verified as messaging limits increase

### Set Up a Payment Method

Without a payment method, you cannot send messages to real users.

**From the Developer Console:**
1. Go to **WhatsApp > API Setup**
2. Look for the yellow banner about payment — click the link
3. This redirects to the Business Manager billing page

**From Business Manager directly:**
1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. Navigate to **Accounts > WhatsApp Accounts**
3. Click your WABA → three-dot menu → **"Payment Settings"**

**Complete the setup:**
1. Click **"Add Payment Method"**
2. Select billing country/region and currency (cannot be changed later)
3. Select timezone
4. Enter credit/debit card details
5. Save

**How billing works:**
- Pre-paid model — your card is charged in advance, creating a credit balance
- Auto top-up when balance drops below a threshold
- Manual top-up available at any time
- Invoices available monthly in Business Manager

**If your card is declined:**
- WhatsApp billing originates from Meta Platforms (Ireland or US) — ensure international transactions are enabled
- Try disabling pop-up blockers for 3D Secure verification
- Virtual/prepaid cards may not work — use a standard Visa/Mastercard

---

## 7. Phase 5: Verify Your Business

Business verification is required to exceed the initial messaging limits (250 unique users per 24 hours).

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. Navigate to **Security Center** → **"Start Verification"**
3. Enter legal business name, address, phone, website
4. Verify your domain (DNS TXT record, meta tag, or HTML file upload)
5. Upload documents (incorporation certificate, tax ID, utility bill, or bank statement)
6. Wait for review (typically 2 days to 2 weeks)

---

## 8. Phase 6: Create Authentication Templates

Authentication templates are the core of WhatsApp OTP. They have fixed body text — you only configure options and supply the code at send time.

### Template Structure

Every authentication template consists of:

```
┌──────────────────────────────────────┐
│ BODY (fixed, cannot be customized)   │
│ "*{CODE}* is your verification code."│
│                                      │
│ + optional security disclaimer:      │
│ "For your security, do not share     │
│  this code."                         │
├──────────────────────────────────────┤
│ FOOTER (optional)                    │
│ "This code expires in {N} minutes."  │
├──────────────────────────────────────┤
│ BUTTON                               │
│ [Copy Code] or [Autofill] or zero-tap│
└──────────────────────────────────────┘
```

All text is **automatically localized** to the template's language.

### Creating via API

**Endpoint:** `POST https://graph.facebook.com/v21.0/{WABA_ID}/message_templates`

#### Copy Code Template (simplest, works on all platforms)

```json
{
  "name": "auth_code_copy",
  "language": "en_US",
  "category": "AUTHENTICATION",
  "message_send_ttl_seconds": 300,
  "components": [
    {
      "type": "BODY",
      "add_security_recommendation": true
    },
    {
      "type": "FOOTER",
      "code_expiration_minutes": 5
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "OTP",
          "otp_type": "COPY_CODE",
          "text": "Copy Code"
        }
      ]
    }
  ]
}
```

#### One-Tap Template (Android autofill with copy code fallback)

```json
{
  "name": "auth_code_onetap",
  "language": "en_US",
  "category": "AUTHENTICATION",
  "message_send_ttl_seconds": 300,
  "components": [
    {
      "type": "BODY",
      "add_security_recommendation": true
    },
    {
      "type": "FOOTER",
      "code_expiration_minutes": 5
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "OTP",
          "otp_type": "ONE_TAP",
          "text": "Copy Code",
          "autofill_text": "Autofill",
          "package_name": "com.yourcompany.yourapp",
          "signature_hash": "your_app_hash"
        }
      ]
    }
  ]
}
```

#### Zero-Tap Template (fully automatic on Android)

```json
{
  "name": "auth_code_zerotap",
  "language": "en_US",
  "category": "AUTHENTICATION",
  "message_send_ttl_seconds": 300,
  "components": [
    {
      "type": "BODY",
      "add_security_recommendation": true
    },
    {
      "type": "FOOTER",
      "code_expiration_minutes": 5
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "OTP",
          "otp_type": "ZERO_TAP",
          "text": "Copy Code",
          "autofill_text": "Autofill",
          "package_name": "com.yourcompany.yourapp",
          "signature_hash": "your_app_hash",
          "zero_tap_terms_accepted": true
        }
      ]
    }
  ]
}
```

### Complete Parameter Reference

#### Template Creation Parameters

| Parameter | Location | Required | Type | Description |
|-----------|----------|----------|------|-------------|
| `name` | root | Yes | string | Template name. Max 512 characters. Lowercase, numbers, underscores only. |
| `language` | root | Yes | string | Language/locale code (e.g., `en_US`, `es`, `pt_BR`, `ru`). The preset text is automatically localized. |
| `category` | root | Yes | string | Must be `"AUTHENTICATION"` |
| `message_send_ttl_seconds` | root | No | integer | How long delivery will be attempted before giving up. Range: 60–600 seconds. Default: 600 (10 min). |
| `add_security_recommendation` | BODY | No | boolean | If `true`, adds "For your security, do not share this code." Default: `false`. |
| `code_expiration_minutes` | FOOTER | No | integer | Minutes until code expires. Adds footer "This code expires in N minutes." and disables button after N minutes. Range: 1–90. If omitted, no footer shown, button disabled after 10 min. |
| `otp_type` | BUTTONS | Yes | string | `"COPY_CODE"`, `"ONE_TAP"`, or `"ZERO_TAP"` |
| `text` | BUTTONS | No | string | Copy code button label. Default: localized "Copy Code". Max 25 chars. |
| `autofill_text` | BUTTONS | No | string | One-tap/zero-tap autofill button label. Default: localized "Autofill". Max 25 chars. One-tap/zero-tap only. |
| `package_name` | BUTTONS | Yes* | string | Your Android app's package name. *Required for one-tap and zero-tap only. |
| `signature_hash` | BUTTONS | Yes* | string | Your app's signing key hash. *Required for one-tap and zero-tap only. |
| `zero_tap_terms_accepted` | BUTTONS | Yes* | boolean | Acknowledgement of WhatsApp Business ToS for zero-tap. *Required for zero-tap only. |

#### Message Sending Parameters

When sending the template message to a user, the OTP code must appear **twice** in the payload — once in the body parameters and once in the button parameters:

**Endpoint:** `POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`

```json
{
  "messaging_product": "whatsapp",
  "to": "15551234567",
  "type": "template",
  "template": {
    "name": "auth_code_copy",
    "language": {
      "code": "en_US",
      "policy": "deterministic"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "847291"
          }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "0",
        "parameters": [
          {
            "type": "text",
            "text": "847291"
          }
        ]
      }
    ]
  }
}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `messaging_product` | Yes | Must be `"whatsapp"` |
| `to` | Yes | Recipient's WhatsApp phone number in international format (no `+`) |
| `type` | Yes | Must be `"template"` |
| `template.name` | Yes | The name of your approved authentication template |
| `template.language.code` | Yes | Must match the language the template was created with |
| `template.language.policy` | Yes | Use `"deterministic"` — delivers in the exact language specified |
| `template.components[body].parameters[0].text` | Yes | The OTP code — appears in the message body |
| `template.components[button].sub_type` | Yes | Always `"url"` (the OTP button type is internally represented as a URL button) |
| `template.components[button].index` | Yes | `"0"` (first button) |
| `template.components[button].parameters[0].text` | Yes | The OTP code again — used by the button action |

**Important:** The button `sub_type` is always `"url"` regardless of whether your template uses copy code, one-tap, or zero-tap. This is because the OTP button is internally converted to a URL button upon template creation.

### Multi-Language Templates

You create **separate templates for each language** using the same `name` but different `language` values. When sending, you specify which language version to deliver via `template.language.code`.

Supported languages include (non-exhaustive): `af`, `sq`, `ar`, `az`, `bn`, `bg`, `ca`, `zh_CN`, `zh_HK`, `zh_TW`, `hr`, `cs`, `da`, `nl`, `en`, `en_GB`, `en_US`, `et`, `fil`, `fi`, `fr`, `de`, `el`, `gu`, `he`, `hi`, `hu`, `id`, `ga`, `it`, `ja`, `kn`, `kk`, `ko`, `lo`, `lv`, `lt`, `mk`, `ms`, `ml`, `mr`, `nb`, `fa`, `pl`, `pt_BR`, `pt_PT`, `pa`, `ro`, `ru`, `sr`, `sk`, `sl`, `es`, `es_AR`, `es_ES`, `es_MX`, `sw`, `sv`, `ta`, `te`, `th`, `tr`, `uk`, `ur`, `uz`, `vi`, `zu`.

Authentication templates are **typically auto-approved** within minutes since they use fixed text.

---

## 9. Phase 7: System Users & Access Tokens

### Token Types

| Token Type | Lifetime | Source | Use Case |
|---|---|---|---|
| **Temporary** | 24 hours | Developer Console > API Setup | Testing only. Never use in production. |
| **60-day** | 60 days | System User > Generate Token (with expiry) | Forced rotation for security compliance |
| **Permanent** | Never expires (until revoked) | System User > Generate Token ("Never" expiry) | Production. Recommended for server integrations. |

### Create a System User

1. Go to [business.facebook.com/settings](https://business.facebook.com/settings)
2. Navigate to **Users > System Users**
3. Accept the non-discrimination policy if prompted
4. Click **"Add"**
5. Enter a name (e.g., `whatsapp-otp-bot`)
6. Select role: **Admin** (required for template management + messaging)
7. Click **"Create System User"**

### Assign Assets

The System User needs access to both your **App** and your **WABA**.

**Assign the App:**
1. Select the system user → **"Add Assets"**
2. Click **"Apps"** → select your app
3. Enable **"Full Control"** → **"Save Changes"**

**Assign the WABA:**
1. **"Add Assets"** again → **"WhatsApp Accounts"**
2. Select your WABA → enable **"Full Control"** → **"Save Changes"**

### Generate the Token

1. Select the system user → **"Generate New Token"**
2. Select your app from the dropdown
3. Set expiration: **"Never"** (recommended) or **"60 days"**
4. Check these permissions:
   - `whatsapp_business_messaging` — send/receive messages
   - `whatsapp_business_management` — manage templates, phone numbers, webhooks
5. Click **"Generate Token"**
6. **Copy immediately** — it will not be shown again

### Verify the Token

```bash
curl -X GET \
  'https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}' \
  -H 'Authorization: Bearer {YOUR_TOKEN}'
```

### Debug a Token

Go to [developers.facebook.com/tools/debug/accesstoken](https://developers.facebook.com/tools/debug/accesstoken) and paste your token to see its permissions, expiry, and app association.

### Token Security

- Never commit tokens to version control
- Never expose tokens in frontend/client-side code
- Store in environment variables or a secrets manager
- Revoking is instant — go to System Users > token > **"Revoke"**
- Generating a new token does NOT revoke old ones — revoke explicitly

---

## 10. Phase 8: Set Up Webhooks

Webhooks let your server receive delivery status updates. Optional for basic OTP but recommended for production monitoring.

### Configure in Developer Console

1. Go to **WhatsApp > Configuration**
2. Set **Callback URL**: `https://yourdomain.com/webhook/whatsapp`
3. Set **Verify Token**: a random string you create (not your access token)
4. Subscribe to: `messages` (for delivery statuses)

### Webhook Verification

Your server must respond to a GET request:

```
GET /webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_VALUE
```

Return the `hub.challenge` value with HTTP 200 if the verify token matches.

### Delivery Status Updates

POST requests will contain status updates: `sent`, `delivered`, `read`, `failed`.

---

## 11. Pricing

As of July 2025, WhatsApp uses **per-message pricing** (replacing the previous conversation-based model).

Authentication messages are charged when delivered. Rates vary by recipient country:

| Country | Per Message (approx.) |
|---------|----------------------|
| India | $0.0014 |
| Indonesia | $0.0036 |
| Brazil | $0.0032 |
| US | $0.0135 |
| UK | $0.0390 |
| Germany | $0.0900 |

Volume discounts are available through tiered pricing — rates decrease as monthly volume per country increases.

**Free messages:** User-initiated service messages (responses within 24 hours of user contact) are free.

---

## 12. Messaging Limits & Scaling

New accounts start with a limit of **250 unique users per 24 hours**. This increases automatically based on quality:

| Tier | Unique Users / 24h |
|------|-------------------|
| Starting | 250 |
| Tier 1 | 1,000 |
| Tier 2 | 10,000 |
| Tier 3 | 100,000 |
| Unlimited | No limit |

**Quality rating** (visible in WhatsApp Manager) is affected by user blocks and reports. Keep it GREEN to maintain tier progression.

Business verification (Phase 5) is required to advance beyond 250.

---

## 13. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `(#131030) Recipient phone number not in allowed list` | App is in Development mode, number not registered as tester | Switch to Live mode, or add the number as a test recipient |
| `(#132015) Template does not exist` | Template name/language mismatch, or template not yet approved | Verify exact name and language code; check template status in WhatsApp Manager |
| `(#131026) Message undeliverable` | Various — recipient blocked you, number not on WhatsApp, per-user marketing limits | Check webhook for details; verify recipient has WhatsApp |
| `(#100) Invalid parameter` | Malformed request body — often missing the code in both body AND button components | Ensure OTP appears twice: once in body parameters, once in button parameters |
| `Invalid OAuth access token` | Token expired, revoked, or incorrectly copied | Regenerate token; verify full token string copied; check in token debugger |
| `(#200) Requires whatsapp_business_messaging permission` | System user token missing required permissions | Regenerate token with both `whatsapp_business_messaging` and `whatsapp_business_management` |
| Payment method errors | International transaction block, 3D Secure failure | Contact bank to allow Meta Platforms charges; try different browser |
| Template rejected | Name violates policy, or miscategorized | Don't include "whatsapp" in template names; ensure category is AUTHENTICATION |

### Testing Without Business Verification

You can test using the **test phone number** provided on the API Setup page:
- Add up to 5 recipient phone numbers in the test recipients list
- Send unlimited free messages from the test number
- Switch to your real number for production after verification

---

*This guide covers setup only. For implementation details (frontend, backend, code), see the companion React Project Specification document.*
