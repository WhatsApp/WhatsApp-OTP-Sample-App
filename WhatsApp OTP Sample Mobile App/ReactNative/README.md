# WhatsApp OTP Sample - React Native

Cross-platform React Native implementation of the WhatsApp OTP Sample App.

## Prerequisites

- Node.js 18+
- React Native CLI
- Xcode 15+ (for iOS)
- Android Studio (for Android)

## Setup

```bash
# Install dependencies
npm install

# iOS: Install pods
cd ios && pod install && cd ..
```

## Running the App

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Features

- Phone number login with country code selection
- OTP request via WhatsApp or SMS
- OTP verification with auto-fill support
- Native WhatsApp OTP SDK integration (Android)
- iOS Security Code AutoFill support

## Architecture

```
src/
├── screens/         # React Native screens
│   ├── LoginScreen.tsx
│   ├── SelectChannelScreen.tsx
│   └── VerifyOtpScreen.tsx
├── services/        # API and OTP services
│   ├── ApiClient.ts
│   └── OtpService.ts
├── native/          # Native module wrappers
│   └── WhatsAppOtpModule.ts
└── navigation/      # React Navigation setup
    └── AppNavigator.tsx
```

## Android Native Module

The Android native module (`WhatsAppOtpModule`) wraps the WhatsApp OTP SDK:
- Initializes the SDK handshake
- Registers broadcast receivers for OTP events
- Emits events to JavaScript when OTP is received

## Configuration

Update the API base URL in `src/services/ApiClient.ts` to point to your server.
