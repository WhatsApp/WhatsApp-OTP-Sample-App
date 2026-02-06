# WhatsApp OTP React Project Specification

> Two Next.js projects deployed on Vercel: **Project A** (pure WhatsApp OTP) and **Project B** (Clerk + WhatsApp 2FA). Both use the WhatsApp Cloud API authentication templates with full parameter coverage and i18next for multi-language UI.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Shared Infrastructure](#2-shared-infrastructure)
3. [Project A: Pure WhatsApp OTP](#3-project-a-pure-whatsapp-otp)
4. [Project B: Clerk + WhatsApp 2FA](#4-project-b-clerk--whatsapp-2fa)
5. [WhatsApp API Layer (shared)](#5-whatsapp-api-layer-shared)
6. [i18next Integration](#6-i18next-integration)
7. [Frontend Components](#7-frontend-components)
8. [Backend API Routes](#8-backend-api-routes)
9. [OTP Logic](#9-otp-logic)
10. [Security Hardening](#10-security-hardening)
11. [Environment Variables](#11-environment-variables)
12. [Deployment](#12-deployment)

---

## 1. Architecture Overview

### Project A: Pure WhatsApp OTP

The entire authentication flow is WhatsApp-based. No passwords, no email. Phone number IS the identity.

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER                                                        │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐   │
│  │ PhoneInput   │───►│ OTPInput     │───►│ Authenticated     │   │
│  │ + lang picker│    │ 6-digit code │    │ Dashboard         │   │
│  └─────────────┘    └──────────────┘    └───────────────────┘   │
│         │                   │                                    │
└─────────┼───────────────────┼────────────────────────────────────┘
          │ POST /api/otp/send│ POST /api/otp/verify
          ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  VERCEL SERVERLESS                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ /api/otp/send        │  │ /api/otp/verify      │             │
│  │ - validate phone     │  │ - lookup OTP in Redis │             │
│  │ - generate 6-digit   │  │ - constant-time compare│            │
│  │ - store in Redis     │  │ - issue JWT session   │             │
│  │ - call WhatsApp API  │  │ - delete OTP          │             │
│  └──────────┬───────────┘  └──────────────────────┘             │
│             │                                                    │
│             ▼                                                    │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │ WhatsApp Cloud API   │  │ Upstash Redis         │             │
│  │ POST /{phone_id}/    │  │ OTP storage + rate    │             │
│  │      messages        │  │ limiting              │             │
│  └──────────────────────┘  └──────────────────────┘             │
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
│  VERCEL SERVERLESS                                              │
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
| Hosting | Vercel (serverless) |
| OTP Storage | Upstash Redis (serverless-compatible) |
| WhatsApp API | Direct HTTP to Graph API v21.0 |
| i18n | i18next + react-i18next + i18next-browser-languagedetector |
| Phone validation | libphonenumber-js |
| Styling | Tailwind CSS |

### Shared Packages

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "@upstash/redis": "^1.28.0",
    "i18next": "^23.0.0",
    "react-i18next": "^14.0.0",
    "i18next-browser-languagedetector": "^7.0.0",
    "i18next-http-backend": "^2.4.0",
    "libphonenumber-js": "^1.10.0",
    "jose": "^5.0.0"
  }
}
```

Project B additionally needs:
```json
{
  "@clerk/nextjs": "^4.0.0"
}
```

---

## 3. Project A: Pure WhatsApp OTP

### File Structure

```
project-a/
├── public/
│   └── locales/
│       ├── en/
│       │   └── common.json
│       ├── es/
│       │   └── common.json
│       ├── pt-BR/
│       │   └── common.json
│       └── ru/
│           └── common.json
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout with i18n provider
│   │   ├── page.tsx                 # Login page (PhoneInput → OTPInput)
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Protected authenticated page
│   │   └── api/
│   │       └── otp/
│   │           ├── send/route.ts    # Generate + send OTP
│   │           └── verify/route.ts  # Verify OTP + issue session
│   ├── lib/
│   │   ├── redis.ts                 # Upstash client
│   │   ├── otp.ts                   # OTP generation, storage, verification
│   │   ├── whatsapp.ts              # WhatsApp API client (shared logic)
│   │   ├── session.ts               # JWT session management
│   │   └── rate-limit.ts            # Rate limiting logic
│   ├── components/
│   │   ├── PhoneInput.tsx           # Phone number entry with country selector
│   │   ├── OTPInput.tsx             # 6-digit code entry
│   │   ├── LanguageSwitcher.tsx     # i18next language picker
│   │   ├── CountdownTimer.tsx       # Resend cooldown
│   │   └── AuthFlow.tsx             # Orchestrates phone → OTP → success
│   ├── hooks/
│   │   ├── useOTPFlow.ts            # State machine for auth flow
│   │   └── useCountdown.ts          # Timer hook
│   └── i18n/
│       └── config.ts                # i18next initialization
├── middleware.ts                     # Session validation for protected routes
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### Session Management

Since there's no Clerk, this project manages its own sessions using signed JWTs stored in an HTTP-only cookie.

```typescript
// src/lib/session.ts
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

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // JWT verification happens in the page/API — middleware only checks presence
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## 4. Project B: Clerk + WhatsApp 2FA

### File Structure

```
project-b/
├── public/
│   └── locales/
│       ├── en/
│       │   └── common.json
│       ├── es/
│       │   └── common.json
│       ├── pt-BR/
│       │   └── common.json
│       └── ru/
│           └── common.json
├── src/
│   ├── app/
│   │   ├── layout.tsx               # ClerkProvider + i18n provider
│   │   ├── page.tsx                 # Landing / marketing
│   │   ├── sign-in/
│   │   │   └── [[...sign-in]]/
│   │   │       └── page.tsx         # Clerk sign-in page
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx         # Clerk sign-up page
│   │   ├── verify-whatsapp/
│   │   │   └── page.tsx             # WhatsApp 2FA verification page
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Protected page (requires Clerk + 2FA)
│   │   └── api/
│   │       └── whatsapp-otp/
│   │           ├── send/route.ts    # Generate + send OTP (requires Clerk session)
│   │           └── verify/route.ts  # Verify OTP + update Clerk metadata
│   ├── lib/
│   │   ├── redis.ts
│   │   ├── otp.ts
│   │   ├── whatsapp.ts              # Same WhatsApp API client
│   │   └── rate-limit.ts
│   ├── components/
│   │   ├── PhoneInput.tsx
│   │   ├── OTPInput.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── CountdownTimer.tsx
│   │   └── WhatsApp2FAFlow.tsx      # 2FA-specific orchestration
│   ├── hooks/
│   │   ├── useOTPFlow.ts
│   │   └── useCountdown.ts
│   └── i18n/
│       └── config.ts
├── middleware.ts                     # Clerk auth + 2FA enforcement
├── .env.local
└── package.json
```

### Middleware (Clerk + 2FA)

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);
const is2FARoute = createRouteMatcher(['/verify-whatsapp']);

export default clerkMiddleware(async (auth, request) => {
  const session = await auth();

  // Protected routes require sign-in
  if (isProtectedRoute(request)) {
    if (!session.userId) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Check if WhatsApp 2FA has been completed
    const whatsappVerified = session.sessionClaims?.metadata?.whatsapp_verified;
    if (!whatsappVerified && !is2FARoute(request)) {
      return NextResponse.redirect(new URL('/verify-whatsapp', request.url));
    }
  }

  // 2FA page requires sign-in but NOT 2FA completion (obviously)
  if (is2FARoute(request) && !session.userId) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return NextResponse.next();
});
```

### 2FA Verification Strategies

Three approaches, chosen by configuration:

**Strategy 1: One-Time Setup** — Verify once, trusted permanently
```typescript
// After successful OTP verification:
await clerkClient.users.updateUser(userId, {
  publicMetadata: {
    whatsapp_verified: true,
    whatsapp_phone: phoneNumber,
    whatsapp_verified_at: new Date().toISOString(),
  },
});
```

**Strategy 2: Per-Session** — Verify every sign-in
```typescript
// Store 2FA status in Redis keyed to Clerk session ID
await redis.set(`2fa:${sessionId}`, 'verified', { ex: 86400 }); // 24h

// In middleware, check Redis instead of user metadata
```

**Strategy 3: Step-Up Auth** — Verify only for sensitive actions
```typescript
// Frontend: before sensitive action, check if step-up is needed
const needs2FA = await fetch('/api/whatsapp-otp/check-step-up');
if (needs2FA) {
  // Show WhatsApp 2FA modal
}
```

---

## 5. WhatsApp API Layer (shared)

This module is identical in both projects.

### `src/lib/whatsapp.ts`

```typescript
interface SendAuthTemplateParams {
  to: string;                           // Recipient phone (international, no +)
  code: string;                         // The OTP code
  templateName: string;                 // e.g., "auth_code_copy"
  languageCode: string;                 // e.g., "en_US", "es", "ru"
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string; message_status: string }>;
}

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0';

export async function sendAuthenticationOTP(
  params: SendAuthTemplateParams
): Promise<WhatsAppResponse> {
  const { to, code, templateName, languageCode } = params;

  const url = `${WHATSAPP_API_BASE}/${process.env.WA_PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
        policy: 'deterministic',
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: code,
            },
          ],
        },
        {
          // The button sub_type is always "url" for OTP templates
          // regardless of whether the template uses copy_code, one_tap, or zero_tap
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: code,
            },
          ],
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
    throw new Error(
      `WhatsApp API error: ${error.error?.message || JSON.stringify(error)}`
    );
  }

  return response.json();
}
```

### Template-to-Language Mapping

Because each language is a separate template (same name, different language code), you need a configuration mapping your supported UI languages to WhatsApp template language codes:

```typescript
// src/lib/whatsapp.ts (continued)

// Map i18next locale → WhatsApp template language code
export const LOCALE_TO_WA_LANGUAGE: Record<string, string> = {
  'en':    'en_US',
  'en-US': 'en_US',
  'en-GB': 'en_GB',
  'es':    'es',
  'es-MX': 'es_MX',
  'es-AR': 'es_AR',
  'pt-BR': 'pt_BR',
  'pt':    'pt_PT',
  'ru':    'ru',
  'fr':    'fr',
  'de':    'de',
  'ja':    'ja',
  'ko':    'ko',
  'zh-CN': 'zh_CN',
  'hi':    'hi',
  'ar':    'ar',
};

export function getWhatsAppLanguage(i18nLocale: string): string {
  return LOCALE_TO_WA_LANGUAGE[i18nLocale]
    || LOCALE_TO_WA_LANGUAGE[i18nLocale.split('-')[0]]
    || 'en_US'; // fallback
}
```

### Creating Templates for Each Language (Setup Script)

Run this once to create templates for all supported languages:

```typescript
// scripts/create-templates.ts
// Run with: npx tsx scripts/create-templates.ts

const WABA_ID = process.env.WA_BUSINESS_ACCOUNT_ID;
const TOKEN = process.env.WA_ACCESS_TOKEN;

const LANGUAGES = ['en_US', 'es', 'pt_BR', 'ru', 'fr', 'de', 'ja', 'ko', 'zh_CN', 'hi', 'ar'];

async function createTemplate(language: string) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${WABA_ID}/message_templates`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'auth_verify_code',          // same name for all languages
        language,
        category: 'AUTHENTICATION',
        message_send_ttl_seconds: 300,      // 5 minutes
        components: [
          {
            type: 'BODY',
            add_security_recommendation: true,
          },
          {
            type: 'FOOTER',
            code_expiration_minutes: 5,
          },
          {
            type: 'BUTTONS',
            buttons: [
              {
                type: 'OTP',
                otp_type: 'COPY_CODE',
                // text is optional — defaults to localized "Copy Code"
              },
            ],
          },
        ],
      }),
    }
  );

  const result = await response.json();
  console.log(`${language}: ${response.ok ? 'CREATED' : 'FAILED'}`, result);
}

(async () => {
  for (const lang of LANGUAGES) {
    await createTemplate(lang);
    await new Promise(r => setTimeout(r, 1000)); // rate limit courtesy
  }
})();
```

---

## 6. i18next Integration

### Configuration

```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations directly for client-side bundling
import en from '../../public/locales/en/common.json';
import es from '../../public/locales/es/common.json';
import ptBR from '../../public/locales/pt-BR/common.json';
import ru from '../../public/locales/ru/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      es: { common: es },
      'pt-BR': { common: ptBR },
      ru: { common: ru },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: ['cookie'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
```

### Translation Files

```jsonc
// public/locales/en/common.json
{
  "auth": {
    "title": "Sign In",
    "subtitle": "Enter your WhatsApp number to receive a verification code",
    "phoneLabel": "WhatsApp Phone Number",
    "phonePlaceholder": "+1 (555) 123-4567",
    "sendCode": "Send Verification Code",
    "sending": "Sending...",
    "otpTitle": "Enter Verification Code",
    "otpSubtitle": "We sent a 6-digit code to your WhatsApp at {{phone}}",
    "otpPlaceholder": "Enter 6-digit code",
    "verifyCode": "Verify",
    "verifying": "Verifying...",
    "resendCode": "Resend Code",
    "resendIn": "Resend in {{seconds}}s",
    "changeNumber": "Change number",
    "success": "Verified successfully!",
    "errors": {
      "phoneRequired": "Phone number is required",
      "phoneInvalid": "Please enter a valid phone number",
      "codeSendFailed": "Failed to send verification code. Please try again.",
      "codeInvalid": "Invalid verification code",
      "codeExpired": "Code has expired. Please request a new one.",
      "tooManyAttempts": "Too many attempts. Please try again later.",
      "rateLimited": "Please wait before requesting another code.",
      "genericError": "Something went wrong. Please try again."
    }
  },
  "language": {
    "label": "Language",
    "en": "English",
    "es": "Español",
    "pt-BR": "Português (Brasil)",
    "ru": "Русский"
  },
  "twoFactor": {
    "title": "WhatsApp Verification Required",
    "subtitle": "For your security, please verify your WhatsApp number",
    "phoneOnFile": "We'll send a code to {{phone}}",
    "enterPhone": "Enter the WhatsApp number associated with your account"
  }
}
```

```jsonc
// public/locales/es/common.json
{
  "auth": {
    "title": "Iniciar Sesión",
    "subtitle": "Ingresa tu número de WhatsApp para recibir un código de verificación",
    "phoneLabel": "Número de WhatsApp",
    "phonePlaceholder": "+34 612 345 678",
    "sendCode": "Enviar Código de Verificación",
    "sending": "Enviando...",
    "otpTitle": "Ingresa el Código de Verificación",
    "otpSubtitle": "Enviamos un código de 6 dígitos a tu WhatsApp al {{phone}}",
    "otpPlaceholder": "Ingresa el código de 6 dígitos",
    "verifyCode": "Verificar",
    "verifying": "Verificando...",
    "resendCode": "Reenviar Código",
    "resendIn": "Reenviar en {{seconds}}s",
    "changeNumber": "Cambiar número",
    "success": "¡Verificado exitosamente!",
    "errors": {
      "phoneRequired": "El número de teléfono es obligatorio",
      "phoneInvalid": "Por favor ingresa un número de teléfono válido",
      "codeSendFailed": "Error al enviar el código de verificación. Inténtalo de nuevo.",
      "codeInvalid": "Código de verificación inválido",
      "codeExpired": "El código ha expirado. Solicita uno nuevo.",
      "tooManyAttempts": "Demasiados intentos. Inténtalo más tarde.",
      "rateLimited": "Espera antes de solicitar otro código.",
      "genericError": "Algo salió mal. Inténtalo de nuevo."
    }
  },
  "language": {
    "label": "Idioma",
    "en": "English",
    "es": "Español",
    "pt-BR": "Português (Brasil)",
    "ru": "Русский"
  }
}
```

```jsonc
// public/locales/ru/common.json
{
  "auth": {
    "title": "Вход",
    "subtitle": "Введите номер WhatsApp для получения кода подтверждения",
    "phoneLabel": "Номер WhatsApp",
    "phonePlaceholder": "+7 (999) 123-45-67",
    "sendCode": "Отправить код подтверждения",
    "sending": "Отправка...",
    "otpTitle": "Введите код подтверждения",
    "otpSubtitle": "Мы отправили 6-значный код на ваш WhatsApp {{phone}}",
    "otpPlaceholder": "Введите 6-значный код",
    "verifyCode": "Подтвердить",
    "verifying": "Проверка...",
    "resendCode": "Отправить повторно",
    "resendIn": "Повторная отправка через {{seconds}} сек",
    "changeNumber": "Изменить номер",
    "success": "Успешно подтверждено!",
    "errors": {
      "phoneRequired": "Номер телефона обязателен",
      "phoneInvalid": "Пожалуйста, введите корректный номер телефона",
      "codeSendFailed": "Не удалось отправить код. Попробуйте снова.",
      "codeInvalid": "Неверный код подтверждения",
      "codeExpired": "Код истёк. Запросите новый.",
      "tooManyAttempts": "Слишком много попыток. Попробуйте позже.",
      "rateLimited": "Подождите перед повторным запросом кода.",
      "genericError": "Что-то пошло не так. Попробуйте снова."
    }
  },
  "language": {
    "label": "Язык",
    "en": "English",
    "es": "Español",
    "pt-BR": "Português (Brasil)",
    "ru": "Русский"
  }
}
```

### Language Switcher Component

```tsx
// src/components/LanguageSwitcher.tsx
'use client';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'es', flag: '🇪🇸' },
  { code: 'pt-BR', flag: '🇧🇷' },
  { code: 'ru', flag: '🇷🇺' },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{t('language.label')}:</span>
      <div className="flex gap-1">
        {LANGUAGES.map(({ code, flag }) => (
          <button
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              i18n.language === code
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={t(`language.${code}`)}
          >
            {flag} {t(`language.${code}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 7. Frontend Components

### Phone Input

```tsx
// src/components/PhoneInput.tsx
'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

interface PhoneInputProps {
  onSubmit: (phone: string, formattedPhone: string) => void;
  loading: boolean;
  error: string | null;
}

export function PhoneInput({ onSubmit, loading, error }: PhoneInputProps) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!phone.trim()) {
      setLocalError(t('auth.errors.phoneRequired'));
      return;
    }

    // Parse and validate
    const parsed = parsePhoneNumberFromString(phone);
    if (!parsed || !parsed.isValid()) {
      setLocalError(t('auth.errors.phoneInvalid'));
      return;
    }

    // Pass both the E.164 format (for API) and national format (for display)
    onSubmit(
      parsed.number.replace('+', ''), // "15551234567" — no + for WhatsApp API
      parsed.formatInternational()     // "+1 555 123 4567" — for display
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          {t('auth.phoneLabel')}
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('auth.phonePlaceholder')}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2
                     focus:ring-blue-500 focus:border-transparent text-lg"
          autoFocus
          autoComplete="tel"
          disabled={loading}
        />
      </div>

      {(localError || error) && (
        <p className="text-red-600 text-sm">{localError || error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-green-600 text-white rounded-lg font-medium
                   hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                   transition-colors"
      >
        {loading ? t('auth.sending') : t('auth.sendCode')}
      </button>
    </form>
  );
}
```

### OTP Input

```tsx
// src/components/OTPInput.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface OTPInputProps {
  phone: string;               // Formatted phone for display
  onSubmit: (code: string) => void;
  onResend: () => void;
  onChangeNumber: () => void;
  loading: boolean;
  error: string | null;
  resendCooldown: number;      // seconds remaining
}

export function OTPInput({
  phone,
  onSubmit,
  onResend,
  onChangeNumber,
  loading,
  error,
  resendCooldown,
}: OTPInputProps) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const code = newDigits.join('');
      if (code.length === 6) {
        onSubmit(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    if (pasted.length === 6) {
      onSubmit(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">{t('auth.otpTitle')}</h2>
        <p className="text-gray-600 mt-1">
          {t('auth.otpSubtitle', { phone })}
        </p>
      </div>

      {/* 6-digit input boxes */}
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-2xl font-mono border-2 border-gray-300
                       rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={loading}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-600 text-sm text-center">{error}</p>
      )}

      {/* Actions */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onResend}
          disabled={resendCooldown > 0 || loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          {resendCooldown > 0
            ? t('auth.resendIn', { seconds: resendCooldown })
            : t('auth.resendCode')}
        </button>
        <button
          onClick={onChangeNumber}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t('auth.changeNumber')}
        </button>
      </div>
    </div>
  );
}
```

### Auth Flow Orchestrator (Project A)

```tsx
// src/components/AuthFlow.tsx
'use client';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { PhoneInput } from './PhoneInput';
import { OTPInput } from './OTPInput';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useCountdown } from '@/hooks/useCountdown';

type Step = 'phone' | 'otp' | 'success';

export function AuthFlow() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { seconds: resendCooldown, start: startCooldown } = useCountdown(0);

  const sendOTP = useCallback(async (phoneNumber: string, formatted: string) => {
    setLoading(true);
    setError(null);
    setPhone(phoneNumber);
    setDisplayPhone(formatted);

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          locale: i18n.language,          // pass current UI language
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(t('auth.errors.rateLimited'));
        } else {
          setError(data.error || t('auth.errors.codeSendFailed'));
        }
        return;
      }

      setStep('otp');
      startCooldown(60);                  // 60-second resend cooldown
    } catch {
      setError(t('auth.errors.genericError'));
    } finally {
      setLoading(false);
    }
  }, [i18n.language, t, startCooldown]);

  const verifyOTP = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'expired') {
          setError(t('auth.errors.codeExpired'));
        } else if (data.error === 'max_attempts') {
          setError(t('auth.errors.tooManyAttempts'));
        } else {
          setError(t('auth.errors.codeInvalid'));
        }
        return;
      }

      // Session cookie set by the API response
      setStep('success');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch {
      setError(t('auth.errors.genericError'));
    } finally {
      setLoading(false);
    }
  }, [phone, t, router]);

  const handleResend = useCallback(() => {
    sendOTP(phone, displayPhone);
  }, [phone, displayPhone, sendOTP]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Language switcher — always visible */}
        <div className="flex justify-end mb-6">
          <LanguageSwitcher />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* WhatsApp branding */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100
                            rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                {/* WhatsApp icon path */}
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('auth.title')}</h1>
            <p className="text-gray-500 mt-1">{t('auth.subtitle')}</p>
          </div>

          {step === 'phone' && (
            <PhoneInput
              onSubmit={sendOTP}
              loading={loading}
              error={error}
            />
          )}

          {step === 'otp' && (
            <OTPInput
              phone={displayPhone}
              onSubmit={verifyOTP}
              onResend={handleResend}
              onChangeNumber={() => { setStep('phone'); setError(null); }}
              loading={loading}
              error={error}
              resendCooldown={resendCooldown}
            />
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="text-green-500 text-5xl mb-4">✓</div>
              <p className="text-lg font-medium text-green-700">{t('auth.success')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Countdown Timer Hook

```typescript
// src/hooks/useCountdown.ts
import { useState, useCallback, useRef, useEffect } from 'react';

export function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((from: number) => {
    stop();
    setSeconds(from);
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stop]);

  useEffect(() => {
    return stop;
  }, [stop]);

  return { seconds, start, stop };
}
```

---

## 8. Backend API Routes

### Send OTP (Project A)

```typescript
// src/app/api/otp/send/route.ts
import { NextResponse } from 'next/server';
import { generateOTP, storeOTP } from '@/lib/otp';
import { sendAuthenticationOTP, getWhatsAppLanguage } from '@/lib/whatsapp';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const { phone, locale } = await request.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Rate limit: max 5 OTPs per phone per hour
    const rateLimitResult = await checkRateLimit(`otp:${phone}`, 5, 3600);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      );
    }

    // Generate cryptographically secure 6-digit OTP
    const code = generateOTP();

    // Store in Redis with 5-minute TTL, max 3 verification attempts
    await storeOTP(phone, code, {
      ttlSeconds: 300,
      maxAttempts: 3,
    });

    // Send via WhatsApp authentication template
    const waLanguage = getWhatsAppLanguage(locale || 'en');

    await sendAuthenticationOTP({
      to: phone,
      code,
      templateName: 'auth_verify_code',
      languageCode: waLanguage,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OTP send error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
```

### Verify OTP (Project A)

```typescript
// src/app/api/otp/verify/route.ts
import { NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';
import { createSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code required' }, { status: 400 });
    }

    const result = await verifyOTP(phone, code);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.reason }, // 'invalid', 'expired', 'max_attempts'
        { status: 401 }
      );
    }

    // Create JWT session
    const token = await createSession(phone);

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
```

### Send OTP (Project B — Clerk-gated)

```typescript
// src/app/api/whatsapp-otp/send/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateOTP, storeOTP } from '@/lib/otp';
import { sendAuthenticationOTP, getWhatsAppLanguage } from '@/lib/whatsapp';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { phone, locale } = await request.json();

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 });
  }

  const rateLimitResult = await checkRateLimit(`otp:${userId}`, 5, 3600);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const code = generateOTP();
  await storeOTP(`${userId}:${phone}`, code, { ttlSeconds: 300, maxAttempts: 3 });

  const waLanguage = getWhatsAppLanguage(locale || 'en');
  await sendAuthenticationOTP({
    to: phone,
    code,
    templateName: 'auth_verify_code',
    languageCode: waLanguage,
  });

  return NextResponse.json({ success: true });
}
```

### Verify OTP (Project B — Clerk metadata update)

```typescript
// src/app/api/whatsapp-otp/verify/route.ts
import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { verifyOTP } from '@/lib/otp';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { phone, code } = await request.json();
  const result = await verifyOTP(`${userId}:${phone}`, code);

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  // Update Clerk user metadata — marks 2FA as complete
  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: {
      whatsapp_verified: true,
      whatsapp_phone: phone,
      whatsapp_verified_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({ success: true });
}
```

---

## 9. OTP Logic

### Generation & Storage

```typescript
// src/lib/otp.ts
import crypto from 'crypto';
import { redis } from './redis';

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt which provides uniform distribution.
 */
export function generateOTP(): string {
  return crypto.randomInt(100_000, 999_999).toString();
}

interface StoreOTPOptions {
  ttlSeconds: number;   // How long the OTP is valid
  maxAttempts: number;  // Max verification attempts before invalidation
}

/**
 * Store OTP in Redis with expiry and attempt tracking.
 * The stored value is a hash of the OTP — the plaintext code is NEVER stored.
 */
export async function storeOTP(
  key: string,
  code: string,
  options: StoreOTPOptions
): Promise<void> {
  const hash = crypto.createHash('sha256').update(code).digest('hex');

  await redis.set(
    `otp:${key}`,
    JSON.stringify({
      hash,
      attempts: 0,
      maxAttempts: options.maxAttempts,
      createdAt: Date.now(),
    }),
    { ex: options.ttlSeconds }
  );
}

interface VerifyResult {
  valid: boolean;
  reason?: 'invalid' | 'expired' | 'max_attempts';
}

/**
 * Verify an OTP code using constant-time comparison.
 * Deletes the OTP after successful verification or max attempts.
 */
export async function verifyOTP(key: string, code: string): Promise<VerifyResult> {
  const redisKey = `otp:${key}`;
  const data = await redis.get(redisKey);

  if (!data) {
    return { valid: false, reason: 'expired' };
  }

  const record = typeof data === 'string' ? JSON.parse(data) : data;

  // Check max attempts
  if (record.attempts >= record.maxAttempts) {
    await redis.del(redisKey);
    return { valid: false, reason: 'max_attempts' };
  }

  // Hash the provided code and compare
  const providedHash = crypto.createHash('sha256').update(code).digest('hex');

  // Constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(record.hash),
    Buffer.from(providedHash)
  );

  if (isValid) {
    await redis.del(redisKey); // One-time use
    return { valid: true };
  }

  // Increment attempt counter
  record.attempts += 1;
  const ttl = await redis.ttl(redisKey);
  if (ttl > 0) {
    await redis.set(redisKey, JSON.stringify(record), { ex: ttl });
  }

  // If this was the last attempt, clean up
  if (record.attempts >= record.maxAttempts) {
    await redis.del(redisKey);
    return { valid: false, reason: 'max_attempts' };
  }

  return { valid: false, reason: 'invalid' };
}
```

### Redis Client

```typescript
// src/lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

### Rate Limiting

```typescript
// src/lib/rate-limit.ts
import { redis } from './redis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // seconds
}

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const current = await redis.incr(redisKey);

  if (current === 1) {
    await redis.expire(redisKey, windowSeconds);
  }

  if (current > maxRequests) {
    const ttl = await redis.ttl(redisKey);
    return { allowed: false, remaining: 0, retryAfter: ttl };
  }

  return { allowed: true, remaining: maxRequests - current };
}
```

---

## 10. Security Hardening

### Server-Side

| Measure | Implementation |
|---------|---------------|
| OTP hashing | SHA-256 hash stored in Redis — plaintext never persisted |
| Constant-time comparison | `crypto.timingSafeEqual` prevents timing attacks |
| Rate limiting (per phone) | 5 OTPs per phone per hour |
| Rate limiting (per IP) | 20 requests per IP per 15 minutes (implement via Vercel headers) |
| Max verification attempts | 3 failed attempts invalidates the OTP |
| Resend cooldown | 60 seconds minimum between sends (enforced client-side + server-side) |
| Short TTL | OTP expires in 5 minutes |
| `message_send_ttl_seconds` | Set to 300 (5 min) — if WhatsApp can't deliver within 5 min, stop retrying |
| No OTP in responses | API never returns the generated code |
| Phone validation | `libphonenumber-js` validates before sending |

### Client-Side

| Measure | Implementation |
|---------|---------------|
| HTTP-only cookies | Session token not accessible to JavaScript |
| Secure flag | Cookie only sent over HTTPS in production |
| SameSite=Lax | CSRF protection |
| Input sanitization | OTP input accepts only digits |
| Paste support | Properly handles clipboard paste of 6-digit codes |
| Auto-submit | Submits immediately when 6 digits entered (reduces exposure time) |

---

## 11. Environment Variables

### Project A

```bash
# .env.local

# WhatsApp Cloud API
WA_ACCESS_TOKEN=EAAxxxxxxx          # Permanent system user token
WA_PHONE_NUMBER_ID=123456789        # Your registered phone number's ID
WA_BUSINESS_ACCOUNT_ID=987654321    # Your WABA ID

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxx

# Session
JWT_SECRET=your-random-secret-at-least-32-chars
```

### Project B (additional)

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxxx
CLERK_SECRET_KEY=sk_xxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/verify-whatsapp
```

---

## 12. Deployment

### Vercel Configuration

Both projects deploy identically to Vercel:

1. Connect your Git repository to Vercel
2. Set all environment variables in the Vercel dashboard (Settings > Environment Variables)
3. Deploy

**Vercel-specific notes:**
- Hobby plan has a 10-second function timeout — more than enough for the WhatsApp API call (~1–3 seconds)
- Cold starts are ~200ms — negligible for OTP flows
- Upstash Redis free tier: 10,000 commands/day ≈ 1,600 OTP flows/day (each flow uses ~6 Redis commands)
- Edge runtime compatibility: if using Edge, replace `crypto.randomInt` with `crypto.getRandomValues` and use Web Crypto API for hashing

### Upstash Redis Setup

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database
3. Select the region closest to your Vercel deployment region
4. Copy the REST URL and token to your environment variables

### Template Creation Checklist

Before deploying, ensure you've created authentication templates for each language you support:

```bash
npx tsx scripts/create-templates.ts
```

Then verify all templates are approved:

```bash
curl -X GET \
  'https://graph.facebook.com/v21.0/{WABA_ID}/message_templates?category=AUTHENTICATION' \
  -H 'Authorization: Bearer {TOKEN}'
```

Each template should show `"status": "APPROVED"`.

---

*This specification covers the complete implementation. For account setup, billing, business verification, and other one-time configuration steps, see the companion Setup Guide document.*
