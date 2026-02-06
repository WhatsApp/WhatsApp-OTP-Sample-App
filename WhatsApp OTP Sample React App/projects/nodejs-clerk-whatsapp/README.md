# Node.js + Clerk + WhatsApp 2FA

A Next.js application that adds WhatsApp OTP as a second factor to Clerk authentication, designed for traditional Node.js hosting.

## Overview

This project demonstrates:
- **Clerk** for primary authentication (email/password, social login)
- **WhatsApp OTP** as a mandatory second factor after sign-in
- **Upstash Redis** for OTP storage (or any Redis-compatible store)
- Compatible with **any Node.js hosting** (DigitalOcean, AWS EC2, Railway, Render, etc.)

## Architecture

```
User signs in via Clerk (email/password, Google, etc.)
  │
  │ Clerk session is created
  ▼
Middleware checks: has user completed WhatsApp 2FA?
  │
  ├── YES ──▶ Allow access to protected pages
  │
  └── NO  ──▶ Redirect to /verify-whatsapp
                  │
                  │ 1. User enters phone number
                  │ 2. API generates OTP, stores in Redis
                  │ 3. API sends OTP via Meta Graph API → WhatsApp
                  │ 4. User enters code from WhatsApp
                  │ 5. API verifies code, updates Clerk session
                  ▼
              Protected page loads
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
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk Dashboard
- `CLERK_SECRET_KEY` - From Clerk Dashboard
- `WA_PHONE_NUMBER_ID` - From Meta Developer Console
- `WA_ACCESS_TOKEN` - Permanent token from System User
- `WA_TEMPLATE_NAME` - Your approved authentication template
- `UPSTASH_REDIS_REST_URL` - From Upstash Console (or your Redis URL)
- `UPSTASH_REDIS_REST_TOKEN` - From Upstash Console

### 3. Configure Clerk

In your Clerk Dashboard, add a custom session claim to expose user metadata:

1. Go to **Sessions** > **Customize session token**
2. Add this claim:
   ```json
   {
     "metadata": "{{user.public_metadata}}"
   }
   ```

### 4. Run Development Server

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
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx   # Clerk sign-in
│   │   └── sign-up/[[...sign-up]]/page.tsx   # Clerk sign-up
│   ├── (protected)/
│   │   ├── layout.tsx                         # Protected layout
│   │   └── dashboard/page.tsx                 # Protected dashboard
│   ├── api/
│   │   └── whatsapp-otp/
│   │       ├── send/route.ts                  # Generate + send OTP
│   │       └── verify/route.ts                # Verify OTP
│   ├── verify-whatsapp/
│   │   └── page.tsx                           # WhatsApp verification UI
│   ├── globals.css
│   ├── layout.tsx                             # Root layout with Clerk provider
│   └── page.tsx                               # Home page
├── lib/
│   ├── otp.ts                                 # OTP generation/verification
│   ├── redis.ts                               # Redis client
│   └── whatsapp.ts                            # Meta Graph API client
├── middleware.ts                              # 2FA enforcement
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Differences from Vercel Version

This project is functionally identical to `vercel-clerk-whatsapp` but:
- Documentation focuses on traditional Node.js hosting
- Can be deployed anywhere Node.js runs
- Uses Upstash Redis by default (can be adapted for traditional Redis)

## Security

- OTPs expire after 10 minutes (configurable)
- Maximum 3 verification attempts per OTP
- Rate limiting: 5 OTPs per phone number per hour
- Constant-time comparison for OTP verification
- All sensitive data stored in Redis with TTL

## License

MIT
