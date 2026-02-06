# WhatsApp OTP Sample Apps

This repository contains sample implementations for integrating WhatsApp OTP (One-Time Password) verification into your applications using WhatsApp Business APIs.

## Projects

### [WhatsApp OTP Sample Mobile App](./WhatsApp%20OTP%20Sample%20Mobile%20App/)

Native mobile implementation demonstrating WhatsApp OTP with "one-tap" autofill and copy-code functionality.

**Platforms:**
- **Android** - Java app with Dagger Hilt DI, one-tap autofill support
- **iOS** - Swift app using MVVM pattern, copy-code functionality
- **Server** - Node.js/Express backend for OTP generation and WhatsApp API communication

**Features:**
- One-tap autofill (Android)
- Copy-code button support
- WhatsApp SDK integration for handshake

[View Project](./WhatsApp%20OTP%20Sample%20Mobile%20App/)

---

### [WhatsApp OTP Sample React App](./WhatsApp%20OTP%20Sample%20React%20App/)

Modern web implementation for adding WhatsApp 2FA to React/Next.js applications.

**Stack:**
- **Next.js** (App Router) - Frontend and API routes
- **Clerk** - Primary authentication
- **Upstash Redis** - Serverless OTP storage
- **Vercel** - Deployment platform

**Features:**
- WhatsApp OTP as custom 2FA layer
- Serverless-compatible architecture
- Multiple verification modes (one-time, per-session, step-up)
- Comprehensive setup guide included

[View Project](./WhatsApp%20OTP%20Sample%20React%20App/)

---

## Getting Started

Each project has its own README with detailed setup instructions. Choose the implementation that matches your platform:

- For **native mobile apps** (Android/iOS), see [WhatsApp OTP Sample Mobile App](./WhatsApp%20OTP%20Sample%20Mobile%20App/)
- For **web applications** (React/Next.js), see [WhatsApp OTP Sample React App](./WhatsApp%20OTP%20Sample%20React%20App/)

## Documentation

- [WhatsApp Authentication Templates API Docs](https://developers.facebook.com/docs/whatsapp/business-management-api/authentication-templates)
- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Pricing](https://developers.facebook.com/docs/whatsapp/pricing)

## License

This repository is [MIT licensed](./LICENSE).
