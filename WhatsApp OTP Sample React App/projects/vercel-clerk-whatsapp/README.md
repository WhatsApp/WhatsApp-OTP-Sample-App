# Vercel + Clerk + WhatsApp 2FA

A Next.js application that adds WhatsApp OTP as a second factor to Clerk authentication, optimized for Vercel deployment.

## Overview

This project demonstrates:
- **Clerk** for primary authentication (email/password, social login)
- **WhatsApp OTP** as a mandatory second factor after sign-in
- **Stateless OTP verification** using signed JWT challenge tokens (no database required)
- **Vercel** Edge Runtime compatible

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
                  │ 2. API generates OTP and signed challenge token
                  │ 3. API sends OTP via Meta Graph API → WhatsApp
                  │ 4. Client stores challenge token, user enters code
                  │ 5. API verifies code against challenge token
                  │ 6. On success, updates Clerk session
                  ▼
              Protected page loads
```

### Stateless OTP Verification

This implementation uses a stateless OTP verification system that eliminates the need for Redis or any database:

1. **OTP Generation**: When a user requests an OTP, the server:
   - Generates a cryptographically secure 6-digit code
   - Creates a JWT containing hashed userId, phone, and OTP
   - Signs the JWT with a secret key
   - Sends the OTP via WhatsApp
   - Returns the signed JWT (challenge token) to the client

2. **OTP Verification**: When the user enters the code:
   - Client sends the challenge token, code, and phone
   - Server verifies JWT signature and expiration
   - Server compares hashes of userId, phone, and code
   - All comparisons use constant-time algorithms

The challenge token is safe to store client-side because:
- All data is hashed (cannot be extracted)
- The token is signed (cannot be tampered with)
- It has a 5-minute expiration

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
- `OTP_JWT_SECRET` - Secret key for signing challenge tokens (min 32 characters)

Generate a secure JWT secret:
```bash
openssl rand -base64 32
```

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
│   │       ├── send/route.ts                  # Generate OTP + challenge token
│   │       └── verify/route.ts                # Verify OTP against challenge
│   ├── verify-whatsapp/
│   │   └── page.tsx                           # WhatsApp verification UI
│   ├── globals.css
│   ├── layout.tsx                             # Root layout with Clerk provider
│   └── page.tsx                               # Home page
├── lib/
│   ├── otp.ts                                 # Stateless OTP generation/verification
│   └── whatsapp.ts                            # Meta Graph API client
├── middleware.ts                              # 2FA enforcement
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
- No database or external storage required
- No file system dependencies

## Security

- Challenge tokens expire after 5 minutes (configurable via `OTP_EXPIRY_SECONDS`)
- OTP codes are 6 digits (configurable via `OTP_LENGTH`)
- All sensitive data (userId, phone, OTP) is hashed with SHA-256
- Constant-time comparison for all hash verifications (prevents timing attacks)
- Challenge tokens are signed with HS256 (cannot be tampered with)
- userId and phone are bound to the challenge (prevents token reuse)

### Security Considerations

Without server-side storage, we cannot limit verification attempts per OTP. However:
- With 6 digits (1,000,000 combinations) and a 5-minute window, brute force is impractical
- Rate limiting can be added at the edge/CDN level (e.g., Vercel Edge Config, Cloudflare)
- Consider adding IP-based rate limiting for production deployments

## License

MIT
