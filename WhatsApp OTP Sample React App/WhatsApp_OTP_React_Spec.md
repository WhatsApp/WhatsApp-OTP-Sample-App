# WhatsApp OTP React Project Specification

> Two Next.js projects: **Project A** (pure WhatsApp OTP) and **Project B** (Clerk + WhatsApp 2FA). Both use the WhatsApp Cloud API authentication templates. Designed for simplicity with minimal dependencies.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Shared Infrastructure](#2-shared-infrastructure)
3. [Project A: Pure WhatsApp OTP](#3-project-a-pure-whatsapp-otp)
4. [Project B: Clerk + WhatsApp 2FA](#4-project-b-clerk--whatsapp-2fa)
5. [WhatsApp API Layer](#5-whatsapp-api-layer)
6. [WhatsApp Template Languages](#6-whatsapp-template-languages)
7. [OTP Logic (Stateless)](#7-otp-logic-stateless)
8. [Security Best Practices](#8-security-best-practices)
9. [Environment Variables](#9-environment-variables)
10. [Deployment](#10-deployment)
11. [Optional: i18next for Multi-Language UI](#11-optional-i18next-for-multi-language-ui)
12. [Optional: Redis for Production](#12-optional-redis-for-production)

---

## 1. Architecture Overview

### Project A: Pure WhatsApp OTP

The entire authentication flow is WhatsApp-based. No passwords, no email. Phone number IS the identity.

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER                                                        │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │ PhoneInput   │───►│ OTPInput     │───►│ Authenticated     │   │
│  │ + language   │    │ 6-digit code │    │ Dashboard         │   │
│  └─────────────┘    └──────────────┘    └───────────────────┘   │
│         │                   │                                    │
└─────────┼───────────────────┼────────────────────────────────────┘
          │ POST /api/otp/send│ POST /api/otp/verify
          ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVERLESS FUNCTIONS                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ /api/otp/send        │  │ /api/otp/verify      │             │
│  │ - validate phone     │  │ - verify challenge   │             │
│  │ - generate 6-digit   │  │ - constant-time      │             │
│  │ - create challenge   │  │   comparison         │             │
│  │ - call WhatsApp API  │  │ - issue JWT session  │             │
│  │ - return challenge   │  │                      │             │
│  └──────────┬───────────┘  └──────────────────────┘             │
│             │                                                    │
│             ▼                                                    │
│  ┌──────────────────────┐                                       │
│  │ WhatsApp Cloud API   │                                       │
│  │ POST /{phone_id}/    │                                       │
│  │      messages        │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Project B: Clerk + WhatsApp 2FA

Clerk handles primary authentication (email/password, social login). WhatsApp OTP is a second factor triggered after Clerk sign-in.

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER                                                        │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │ Clerk SignIn │───►│ WhatsApp 2FA │───►│ Authenticated     │   │
│  │ (email/pass) │    │ OTPInput     │    │ Dashboard         │   │
│  └─────────────┘    └──────────────┘    └───────────────────┘   │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │ POST /api/whatsapp-otp/send
                             │ POST /api/whatsapp-otp/verify
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  SERVERLESS FUNCTIONS                                           │
│  ┌──────────────────────────────────────────────┐               │
│  │ middleware.ts                                 │               │
│  │ - Clerk auth check                           │               │
│  │ - if signed in but !whatsapp_verified:       │               │
│  │   redirect to /verify-whatsapp               │               │
│  └──────────────────────────────────────────────┘               │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ Clerk SDK            │  │ WhatsApp Cloud API   │             │
│  │ - primary auth       │  │ - OTP delivery       │             │
│  │ - session claims     │  │                      │             │
│  │ - user metadata      │  │                      │             │
│  └──────────────────────┘  └──────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Shared Infrastructure

### Tech Stack (both projects)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Hosting | Vercel, Railway, or any Node.js host |
| OTP Storage | **Stateless** (signed challenge tokens) |
| WhatsApp API | Direct HTTP to Graph API v21.0 |
| Phone validation | libphonenumber-js |
| Styling | Tailwind CSS |

### Core Packages

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "jose": "^5.0.0",
    "libphonenumber-js": "^1.10.0"
  }
}
```

Project B additionally needs:
```json
{
  "@clerk/nextjs": "^4.0.0"
}
```

> **Best Practice:** Keep dependencies minimal. The stateless approach requires only `jose` for JWT signing — no database or Redis needed for basic deployments.

---

## 3. Project A: Pure WhatsApp OTP

### File Structure

```
project-a/
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Login page (PhoneInput → OTPInput)
│   ├── dashboard/
│   │   └── page.tsx             # Protected authenticated page
│   └── api/
│       └── otp/
│           ├── send/route.ts    # Generate + send OTP, return challenge
│           └── verify/route.ts  # Verify OTP + issue session
├── lib/
│   ├── otp.ts                   # Stateless OTP: challenge tokens
│   ├── whatsapp.ts              # WhatsApp API client
│   └── session.ts               # JWT session management
├── middleware.ts                 # Session validation for protected routes
├── .env.local
└── package.json
```

### Session Management

> **Best Practice:** Use HTTP-only cookies with signed JWTs. Never expose tokens to JavaScript.

```typescript
// lib/session.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function createSession(phoneNumber: string): Promise<string> {
  return new SignJWT({ phone: phoneNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifySession(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { phone: string };
  } catch {
    return null;
  }
}
```

---

## 4. Project B: Clerk + WhatsApp 2FA

### File Structure

```
project-b/
├── app/
│   ├── layout.tsx               # ClerkProvider wrapper
│   ├── page.tsx                 # Landing / marketing
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── verify-whatsapp/
│   │   └── page.tsx             # WhatsApp 2FA verification page
│   ├── (protected)/
│   │   ├── layout.tsx           # Protected routes layout
│   │   └── dashboard/page.tsx   # Protected page (requires Clerk + 2FA)
│   └── api/
│       └── whatsapp-otp/
│           ├── send/route.ts    # Generate + send OTP (requires Clerk session)
│           └── verify/route.ts  # Verify OTP + update Clerk metadata
├── lib/
│   ├── otp.ts                   # Stateless OTP with userId binding
│   └── whatsapp.ts              # WhatsApp API client
├── middleware.ts                 # Clerk auth + 2FA enforcement
└── package.json
```

### Middleware (Clerk + 2FA)

> **Best Practice:** Check 2FA status in middleware to enforce it globally, not per-page.

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const is2FARoute = createRouteMatcher(['/verify-whatsapp']);

export default clerkMiddleware(async (auth, request) => {
  const session = await auth();

  if (isProtectedRoute(request)) {
    if (!session.userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const whatsappVerified = session.sessionClaims?.metadata?.whatsapp_verified;
    if (!whatsappVerified && !is2FARoute(request)) {
      return NextResponse.redirect(new URL('/verify-whatsapp', request.url));
    }
  }

  if (is2FARoute(request) && !session.userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
});
```

---

## 5. WhatsApp API Layer

### `lib/whatsapp.ts`

> **Best Practice:** Always use authentication templates (category: AUTHENTICATION) for OTP. They have special delivery priority and built-in "Copy Code" buttons.

```typescript
interface SendOTPParams {
  to: string;           // Phone number without + (e.g., "15551234567")
  code: string;         // The OTP code
  languageCode: string; // WhatsApp template language (e.g., "en_US", "es", "ru")
}

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0';

export async function sendWhatsAppOTP(params: SendOTPParams): Promise<void> {
  const { to, code, languageCode } = params;

  const url = `${WHATSAPP_API_BASE}/${process.env.WA_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: process.env.WA_TEMPLATE_NAME,
      language: {
        code: languageCode,
        policy: 'deterministic',
      },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: code }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: code }],
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WA_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${error.error?.message || 'Unknown'}`);
  }
}
```

---

## 6. WhatsApp Template Languages

WhatsApp authentication templates must be created **per language** in the Meta Business Suite. Each language version of the same template shares the template name but has a different language code.

### Supported Language Codes

Configure available languages via environment variable:

```bash
# .env.local
# Comma-separated list of supported WhatsApp template language codes
WA_SUPPORTED_LANGUAGES=en_US,es,pt_BR,ru,fr,de
```

### Language Selection in Frontend

Add a language selector to your login page so users can choose their preferred WhatsApp message language:

```tsx
// Simple language selector component
const WHATSAPP_LANGUAGES = [
  { code: 'en_US', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt_BR', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
];

function WhatsAppLanguageSelector({ value, onChange }: {
  value: string;
  onChange: (lang: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-3 py-2"
    >
      {WHATSAPP_LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
```

### API Route with Language Parameter

```typescript
// app/api/otp/send/route.ts
import { NextResponse } from 'next/server';
import { createOTP } from '@/lib/otp';
import { sendWhatsAppOTP } from '@/lib/whatsapp';

// Validate against supported languages
const SUPPORTED_LANGUAGES = (process.env.WA_SUPPORTED_LANGUAGES || 'en_US').split(',');

export async function POST(request: Request) {
  const { phoneNumber, whatsappLanguage } = await request.json();

  if (!phoneNumber) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 });
  }

  // Validate language, fallback to en_US
  const languageCode = SUPPORTED_LANGUAGES.includes(whatsappLanguage)
    ? whatsappLanguage
    : 'en_US';

  const { code, challenge } = await createOTP(phoneNumber);

  await sendWhatsAppOTP({
    to: phoneNumber,
    code,
    languageCode,
  });

  return NextResponse.json({ success: true, challenge });
}
```

### Creating Templates for Each Language

Each language requires a separate template submission in Meta Business Suite. All templates share the same name but have different language codes:

```bash
# Template name: auth_verify_code
# Languages to create:
# - en_US (English - US)
# - es (Spanish)
# - pt_BR (Portuguese - Brazil)
# - ru (Russian)
# - fr (French)
# - de (German)
```

> **Best Practice:** Create templates for all languages you plan to support before going live. Template approval can take 24-48 hours.

---

## 7. OTP Logic (Stateless)

> **Best Practice:** Use stateless challenge tokens instead of storing OTPs in a database. This eliminates external dependencies and scales infinitely.

### How It Works

1. **Send:** Generate OTP, create a signed JWT containing `hash(phone)` and `hash(otp)`, return this "challenge" token to the client
2. **Verify:** Client sends back challenge + their code guess. Server verifies JWT signature, checks expiry, compares hashed values

### Implementation

```typescript
// lib/otp.ts
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS || '300');
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Best Practice: Use crypto.randomInt for uniform distribution.
 */
function generateOTP(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Create OTP and return both the code (to send) and challenge token (to return to client).
 */
export async function createOTP(phoneNumber: string): Promise<{ code: string; challenge: string }> {
  const code = generateOTP();

  const challenge = await new SignJWT({
    phoneHash: sha256(phoneNumber),
    otpHash: sha256(code),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_EXPIRY_SECONDS}s`)
    .sign(secret);

  return { code, challenge };
}

/**
 * Verify OTP using the challenge token.
 * Best Practice: Use constant-time comparison to prevent timing attacks.
 */
export async function verifyOTP(
  phoneNumber: string,
  inputCode: string,
  challenge: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { payload } = await jwtVerify(challenge, secret);

    const phoneHash = sha256(phoneNumber);
    const codeHash = sha256(inputCode);

    // Constant-time comparison
    const phoneMatch = crypto.timingSafeEqual(
      Buffer.from(payload.phoneHash as string),
      Buffer.from(phoneHash)
    );
    const codeMatch = crypto.timingSafeEqual(
      Buffer.from(payload.otpHash as string),
      Buffer.from(codeHash)
    );

    if (!phoneMatch || !codeMatch) {
      return { success: false, error: 'invalid' };
    }

    return { success: true };
  } catch (err) {
    if ((err as Error).name === 'JWTExpired') {
      return { success: false, error: 'expired' };
    }
    return { success: false, error: 'invalid' };
  }
}
```

---

## 8. Security Best Practices

### OTP Security

| Practice | Implementation |
|----------|---------------|
| **Cryptographic randomness** | Use `crypto.randomInt()` for uniform distribution |
| **Hash storage** | Never store plaintext OTP — use SHA-256 hashes |
| **Constant-time comparison** | Use `crypto.timingSafeEqual()` to prevent timing attacks |
| **Short expiry** | 5 minutes maximum (300 seconds) |
| **Never return OTP** | API never returns the generated code |

### Session Security

| Practice | Implementation |
|----------|---------------|
| **HTTP-only cookies** | Session token not accessible to JavaScript |
| **Secure flag** | Cookie only sent over HTTPS in production |
| **SameSite=Lax** | CSRF protection |
| **Signed JWTs** | Tokens are cryptographically signed |

### Phone Validation

| Practice | Implementation |
|----------|---------------|
| **Use libphonenumber-js** | Validates format before sending |
| **E.164 format** | Store/send without `+` prefix for WhatsApp API |

### Rate Limiting

> **Best Practice:** For production, add rate limiting at the edge (Vercel, Cloudflare) or use Redis. The stateless approach doesn't limit attempts per OTP, but with 6 digits (1M combinations) and 5-minute expiry, brute force is impractical.

---

## 9. Environment Variables

### Required Variables

```bash
# .env.local

# WhatsApp Cloud API (Required)
WA_ACCESS_TOKEN=EAAxxxxxxx          # Permanent system user token
WA_PHONE_NUMBER_ID=123456789        # Your registered phone number's ID
WA_TEMPLATE_NAME=auth_verify_code   # Your approved auth template name

# Supported WhatsApp Template Languages (Required)
# Comma-separated list of language codes you've created templates for
WA_SUPPORTED_LANGUAGES=en_US,es,pt_BR,ru

# Session & OTP Signing (Required)
JWT_SECRET=your-random-secret-at-least-32-chars
# Generate with: openssl rand -base64 32

# Optional
OTP_EXPIRY_SECONDS=300              # Default: 5 minutes
```

### Clerk Variables (Project B only)

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxxx
CLERK_SECRET_KEY=sk_xxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/verify-whatsapp
```

---

## 10. Deployment

### Any Node.js Host

```bash
# Build
npm run build

# Start
npm run start
```

Works on: Vercel, Railway, Render, DigitalOcean, AWS, etc.

### Vercel-specific notes

- Hobby plan has 10-second function timeout — plenty for WhatsApp API calls
- Cold starts are ~200ms — negligible for auth flows
- Edge runtime: replace `crypto.randomInt` with Web Crypto API if needed

### Pre-deployment Checklist

1. Create WhatsApp templates for all supported languages
2. Wait for template approval (24-48 hours)
3. Set all required environment variables
4. Generate a secure `JWT_SECRET` with `openssl rand -base64 32`

---

## 11. Optional: i18next for Multi-Language UI

By default, the projects use English-only UI. If you need a multi-language user interface (not just WhatsApp messages), add i18next:

### Installation

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### When to Add i18next

| Need | Without i18next | With i18next |
|------|-----------------|--------------|
| WhatsApp message languages | ✅ Language selector | ✅ Language selector |
| UI text in multiple languages | ❌ English only | ✅ Full translation |
| Auto-detect browser language | ❌ | ✅ |

> **Best Practice:** Start with English-only UI. Add i18next later if you need translated buttons, labels, and error messages.

### Basic Setup

```typescript
// lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { /* English strings */ } },
      es: { translation: { /* Spanish strings */ } },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
```

---

## 12. Optional: Redis for Production

The default stateless implementation requires **no database**. However, for high-security production deployments, you may want Redis for:

- **Rate limiting** — Limit OTP requests per phone/IP
- **Attempt tracking** — Lock out after 3 failed attempts
- **Per-session 2FA** — Verify every sign-in instead of once

### When to Add Redis

| Use Case | Stateless | With Redis |
|----------|-----------|------------|
| Basic OTP auth | ✅ | ✅ |
| Attempt limiting | ❌ | ✅ |
| Rate limiting | Edge/CDN | Server-side |
| Per-session 2FA | ❌ | ✅ |
| Horizontal scaling | ✅ Automatic | ✅ Shared state |

### Redis Implementation

If you need Redis, add `@upstash/redis`:

```bash
npm install @upstash/redis
```

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

Environment variables for Redis:
```bash
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxx
```

Then modify `lib/otp.ts` to store OTP hashes in Redis with TTL and track attempts.

> **Best Practice:** Start with stateless. Add Redis only when you need rate limiting or attempt tracking.

---

*This specification covers the complete implementation. For Meta account setup, template creation, and business verification, see the companion Setup Guide document.*
