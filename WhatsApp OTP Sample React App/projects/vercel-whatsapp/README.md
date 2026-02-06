# Vercel + WhatsApp OTP

A Next.js application that uses WhatsApp OTP as the sole authentication method, optimized for Vercel deployment.

## Overview

This project demonstrates:
- **WhatsApp OTP** as the only authentication factor (phone number = identity)
- **JWT sessions** stored in HTTP-only cookies
- **Upstash Redis** for serverless OTP storage
- **Vercel** Edge Runtime compatible

No passwords, no email. Users authenticate solely with their WhatsApp phone number.

## Architecture

```
User enters phone number
  │
  │ POST /api/otp/send
  ▼
Generate OTP → Store in Redis → Send via WhatsApp
  │
  │ User receives WhatsApp message
  ▼
User enters code
  │
  │ POST /api/otp/verify
  ▼
Verify against Redis → Create JWT session → Set cookie
  │
  ▼
Access protected routes (e.g., /dashboard)
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `WA_PHONE_NUMBER_ID` - From Meta Developer Console
- `WA_ACCESS_TOKEN` - Permanent token from System User
- `WA_TEMPLATE_NAME` - Your approved authentication template
- `UPSTASH_REDIS_REST_URL` - From Upstash Console
- `UPSTASH_REDIS_REST_TOKEN` - From Upstash Console
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
├── app/
│   ├── api/
│   │   └── otp/
│   │       ├── send/route.ts              # Generate + send OTP
│   │       └── verify/route.ts            # Verify OTP + create session
│   ├── dashboard/
│   │   └── page.tsx                       # Protected dashboard
│   ├── globals.css
│   ├── layout.tsx                         # Root layout
│   └── page.tsx                           # Login page (phone + OTP input)
├── lib/
│   ├── otp.ts                             # OTP generation/verification
│   ├── redis.ts                           # Upstash client
│   ├── session.ts                         # JWT session management
│   └── whatsapp.ts                        # Meta Graph API client
├── middleware.ts                          # Route protection
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

The project uses Vercel-compatible patterns:
- Serverless API routes
- Upstash Redis (HTTP-based, no persistent connections)
- JWT sessions in cookies (no server-side session storage)

## Security

- OTPs expire after 10 minutes (configurable)
- Maximum 3 verification attempts per OTP
- Rate limiting: 5 OTPs per phone number per hour
- 60-second cooldown between OTP requests
- Constant-time comparison for OTP verification
- HTTP-only secure cookies for sessions
- All OTP data stored in Redis with TTL

## Differences from Clerk Version

| Feature | This Project | Clerk Version |
|---------|--------------|---------------|
| Primary Auth | WhatsApp OTP | Clerk (email/password/OAuth) |
| Session | Custom JWT | Clerk session |
| 2FA | N/A (OTP is primary) | WhatsApp OTP |
| User Management | Phone number only | Full Clerk user model |
| Dependencies | jose, libphonenumber-js | @clerk/nextjs |

## License

MIT
