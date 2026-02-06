# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note:** This project is located in the `WhatsApp OTP Sample React App/` subdirectory of the repository.

## Project Overview

WhatsApp OTP Sample React App contains multiple Next.js implementations for adding WhatsApp OTP verification to web applications. All variants use:
- **Next.js 14+** (App Router)
- **TypeScript** for type safety
- **Upstash Redis** for serverless OTP storage
- **Meta Graph API v21.0** for WhatsApp message delivery
- **Tailwind CSS** for styling

## Project Variants

| Project | Description |
|---------|-------------|
| `projects/nodejs-whatsapp` | Pure WhatsApp OTP auth, any Node.js host |
| `projects/nodejs-clerk-whatsapp` | Clerk + WhatsApp 2FA, any Node.js host |
| `projects/vercel-whatsapp` | Pure WhatsApp OTP auth, Vercel optimized |
| `projects/vercel-clerk-whatsapp` | Clerk + WhatsApp 2FA, Vercel optimized |

## Build Commands

All projects use the same commands:

```bash
cd "WhatsApp OTP Sample React App/projects/<variant>"
npm install                    # Install dependencies
npm run dev                    # Run development server (port 3000)
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint
```

## Architecture

### Pure WhatsApp OTP (nodejs-whatsapp, vercel-whatsapp)

Phone number IS the identity. No passwords, no email.

```
PhoneInput → POST /api/otp/send → OTPInput → POST /api/otp/verify → Dashboard
                    │                              │
                    ▼                              ▼
              WhatsApp API                   Redis verify
              + Redis store                  + JWT session
```

### Clerk + WhatsApp 2FA (nodejs-clerk-whatsapp, vercel-clerk-whatsapp)

Clerk handles primary auth. WhatsApp OTP is a second factor.

```
Clerk SignIn → Middleware check → WhatsApp 2FA → Dashboard
                    │
                    ├── whatsapp_verified? → Allow access
                    └── Not verified? → /verify-whatsapp
```

### Key Components

**API Routes:**
- `/api/otp/send` (or `/api/whatsapp-otp/send`) - Generate OTP, store in Redis, send via WhatsApp
- `/api/otp/verify` (or `/api/whatsapp-otp/verify`) - Verify OTP, issue session/update Clerk metadata

**Library Files:**
- `lib/redis.ts` - Upstash Redis client
- `lib/otp.ts` - OTP generation, storage, verification logic
- `lib/whatsapp.ts` - Meta Graph API helper for sending templates
- `lib/session.ts` - JWT session management (pure OTP projects only)

**Middleware:**
- `middleware.ts` - Route protection, session/2FA enforcement

## Configuration

### Environment Variables (`.env.local`)

Core variables (all projects):
```bash
# WhatsApp Cloud API
WA_PHONE_NUMBER_ID=123456789012345
WA_ACCESS_TOKEN=EAAxxxxxxxxx...
WA_TEMPLATE_NAME=login_otp
WA_TEMPLATE_LANG=en_US

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxx...

# OTP Settings
OTP_LENGTH=6
OTP_EXPIRY_SECONDS=600
OTP_MAX_ATTEMPTS=3
```

Additional for Clerk projects:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

Additional for pure OTP projects:
```bash
JWT_SECRET=your-256-bit-secret
```

### Clerk Dashboard Setup (Clerk projects only)

Add custom session claim to expose `publicMetadata`:
```json
{
  "metadata": "{{user.public_metadata}}"
}
```

## Key Patterns

### OTP Storage (Redis)
```typescript
// Key format: otp:{phoneNumber} or otp:{userId}
// Value: { code, attempts, createdAt }
// TTL: OTP_EXPIRY_SECONDS
```

### Rate Limiting
- Max 5 OTPs per phone per hour
- 60-second cooldown between requests

### WhatsApp Template Payload
```json
{
  "messaging_product": "whatsapp",
  "to": "14155551234",
  "type": "template",
  "template": {
    "name": "login_otp",
    "language": { "code": "en_US" },
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "123456" }] },
      { "type": "button", "sub_type": "url", "index": 0, "parameters": [{ "type": "text", "text": "123456" }] }
    ]
  }
}
```

### Meta Graph API
- **Endpoint**: `https://graph.facebook.com/v21.0/{WA_PHONE_NUMBER_ID}/messages`
- **Authentication**: Bearer token via `WA_ACCESS_TOKEN`

## Testing

1. Use Meta's test phone number with up to 5 pre-registered test recipients during development
2. Switch to Live mode when ready for production
3. Test the full flow: phone input → receive WhatsApp message → enter code → access protected page

## Dependencies

Core (all projects):
- `next` - React framework
- `@upstash/redis` - Serverless Redis client
- `libphonenumber-js` - Phone number validation
- `jose` - JWT handling (pure OTP projects)

Clerk projects additionally use:
- `@clerk/nextjs` - Clerk authentication

## Documentation

- [WhatsApp_Auth_Setup_Guide.md](./WhatsApp_Auth_Setup_Guide.md) - Meta account and WhatsApp API setup
- [WhatsApp_OTP_React_Spec.md](./WhatsApp_OTP_React_Spec.md) - Technical specification
