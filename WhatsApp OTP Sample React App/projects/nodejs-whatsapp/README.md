# Node.js + WhatsApp OTP

A Next.js application that uses WhatsApp OTP as the sole authentication method, designed for traditional Node.js hosting.

## Overview

This project demonstrates:
- **WhatsApp OTP** as the only authentication factor (phone number = identity)
- **JWT sessions** stored in HTTP-only cookies
- **Upstash Redis** for OTP storage (or any Redis-compatible store)
- Compatible with **any Node.js hosting** (DigitalOcean, AWS EC2, Railway, Render, etc.)

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
- `UPSTASH_REDIS_REST_URL` - From Upstash Console (or your Redis URL)
- `UPSTASH_REDIS_REST_TOKEN` - From Upstash Console
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

### Deploy to Any Node.js Host

```bash
# Build
npm run build

# Start production server
npm run start
```

Configure your host to:
1. Set all environment variables from `.env.example`
2. Run `npm run build` during deployment
3. Run `npm run start` to start the server
4. Expose port 3000 (or configure via `PORT` env var)

### Example: Deploy to Railway

1. Push to GitHub
2. Connect repo in Railway
3. Add environment variables
4. Railway auto-detects Next.js and deploys

### Example: Deploy to DigitalOcean App Platform

1. Push to GitHub
2. Create new App in DigitalOcean
3. Select repo and branch
4. Add environment variables
5. Deploy

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
│   ├── redis.ts                           # Redis client
│   ├── session.ts                         # JWT session management
│   └── whatsapp.ts                        # Meta Graph API client
├── middleware.ts                          # Route protection
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Differences from Vercel Version

This project is functionally identical to `vercel-whatsapp` but:
- Documentation focuses on traditional Node.js hosting
- Can be deployed anywhere Node.js runs
- Uses Upstash Redis by default (can be adapted for traditional Redis)

## Differences from Clerk Versions

| Feature | This Project | Clerk Versions |
|---------|--------------|----------------|
| Primary Auth | WhatsApp OTP | Clerk (email/password/OAuth) |
| Session | Custom JWT | Clerk session |
| 2FA | N/A (OTP is primary) | WhatsApp OTP |
| User Management | Phone number only | Full Clerk user model |
| Dependencies | jose, libphonenumber-js | @clerk/nextjs |

## Security

- OTPs expire after 10 minutes (configurable)
- Maximum 3 verification attempts per OTP
- Rate limiting: 5 OTPs per phone number per hour
- 60-second cooldown between OTP requests
- Constant-time comparison for OTP verification
- HTTP-only secure cookies for sessions
- All OTP data stored in Redis with TTL

## License

MIT
