# WhatsApp OTP Sample React App

A collection of Next.js implementations for adding WhatsApp OTP verification to web applications using the WhatsApp Cloud API authentication templates.

## Overview

This project provides multiple implementation variants for integrating WhatsApp OTP into your web application:

| Project | Auth Method | Hosting | Use Case |
|---------|-------------|---------|----------|
| `nodejs-whatsapp` | WhatsApp OTP only | Any Node.js host | Standalone phone-based authentication |
| `nodejs-clerk-whatsapp` | Clerk + WhatsApp 2FA | Any Node.js host | Add WhatsApp 2FA to existing Clerk auth |
| `vercel-whatsapp` | WhatsApp OTP only | Vercel | Serverless phone-based authentication |
| `vercel-clerk-whatsapp` | Clerk + WhatsApp 2FA | Vercel | Serverless Clerk + WhatsApp 2FA |

## How WhatsApp OTP Works

WhatsApp does **not** generate or manage OTP codes. Your server generates the OTP, stores it, and verifies it. WhatsApp is purely the delivery channel — a more reliable and user-friendly replacement for SMS.

```
User clicks         Your server          WhatsApp Cloud API        User's phone
"Send Code"  ──►  generates OTP  ──►  POST /{phone_id}/messages  ──►  WhatsApp message
                  stores OTP                                         "847291 is your
                  with expiry                                         verification code"

User enters         Your server
the code     ──►  compares code  ──►  Success / Failure
                  from storage
```

## Authentication Template Button Types

| Type | Platform | User Experience |
|------|----------|----------------|
| **Copy Code** | All platforms | User taps button → code copied to clipboard → user pastes into your app |
| **One-Tap** | Android only | User taps button → your app opens automatically with code passed via intent |
| **Zero-Tap** | Android only | Code is broadcast to your app automatically — user never leaves your app |

One-Tap and Zero-Tap fall back to Copy Code on non-Android/non-mobile devices.

## Prerequisites

Before implementing any variant, you need:

1. **Meta Business Account** with WhatsApp Business API access
2. **WhatsApp Business phone number** (not currently registered on WhatsApp app)
3. **Approved Authentication Template** (see setup guide)
4. **Permanent Access Token** from a System User
5. **Upstash Redis database** (or equivalent) for OTP storage

See [WhatsApp_Auth_Setup_Guide.md](./WhatsApp_Auth_Setup_Guide.md) for complete setup instructions.

## Quick Start

Choose your implementation variant and navigate to its directory:

```bash
cd "WhatsApp OTP Sample React App/projects/<variant-name>"
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

## Project Structure

```
WhatsApp OTP Sample React App/
├── README.md                          # This file
├── CLAUDE.md                          # Claude Code guidance
├── WhatsApp_Auth_Setup_Guide.md       # Complete WhatsApp API setup walkthrough
├── WhatsApp_OTP_React_Spec.md         # Technical specification for implementations
└── projects/
    ├── nodejs-whatsapp/               # Pure WhatsApp OTP (Node.js)
    ├── nodejs-clerk-whatsapp/         # Clerk + WhatsApp 2FA (Node.js)
    ├── vercel-whatsapp/               # Pure WhatsApp OTP (Vercel)
    └── vercel-clerk-whatsapp/         # Clerk + WhatsApp 2FA (Vercel)
```

## Environment Variables

All projects share these core WhatsApp variables:

```bash
# WhatsApp Cloud API
WA_PHONE_NUMBER_ID=123456789012345
WA_ACCESS_TOKEN=EAAxxxxxxxxx...
WA_TEMPLATE_NAME=login_otp
WA_TEMPLATE_LANG=en_US

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxx...

# OTP Config
OTP_LENGTH=6
OTP_EXPIRY_SECONDS=600
OTP_MAX_ATTEMPTS=3
```

Clerk-based projects additionally require:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

## Cost

WhatsApp authentication messages are charged per-message. Example rates:
- US: ~$0.0135/message
- India: ~$0.0014/message
- Brazil: ~$0.0045/message

See [Meta's rate card](https://developers.facebook.com/docs/whatsapp/pricing) for current pricing.

## Documentation

- [WhatsApp_Auth_Setup_Guide.md](./WhatsApp_Auth_Setup_Guide.md) - Complete Meta account and WhatsApp API setup
- [WhatsApp_OTP_React_Spec.md](./WhatsApp_OTP_React_Spec.md) - Technical specification and architecture

## License

This project is [MIT licensed](../LICENSE).
