# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsApp OTP Sample App demonstrates how to send and receive OTP codes through WhatsApp Business APIs with "one-tap" autofill and copy-code functionality. Multi-platform project with:
- **Server**: Node.js/Express backend (generates OTP, communicates with WhatsApp Cloud API)
- **Android**: Java app with Dagger Hilt DI, Fragment-based navigation
- **iOS**: Swift app using MVVM pattern (copy-code only, no one-tap)

## Build Commands

### Server
```bash
cd Server/setup && pip3 install -r requirements.txt && python3 setup.py  # First-time setup
cd Server/server && npm install && node app.js  # Run server on port 3000
```

### Android
```bash
cd Android
./gradlew assembleDebug          # Build debug APK
./gradlew assembleRelease        # Build release APK
./gradlew test                   # Run all unit tests
./gradlew test --tests "*.SampleServerOtpServiceTest"  # Run single test class
./gradlew checkstyle             # Run checkstyle linting
```

### iOS
Build and test via Xcode (`iOS/SampleApp.xcodeproj`). Cmd+B to build, Cmd+R to run, Cmd+U to test.

### Test Server API Directly
```bash
curl -X GET http://127.0.0.1:3000/otp/15551234567/           # Request OTP
curl -X POST http://127.0.0.1:3000/otp/15551234567/ \
  -d '{"code": "12345"}' -H "Content-Type: application/json"  # Verify OTP
```

## Architecture

### Server (Express.js)
- REST API: `GET /otp/:phone_number` (request OTP), `POST /otp/:phone_number` (verify OTP)
- In-memory OTP storage with 5-minute TTL
- Communicates with Facebook Graph API v16.0 for WhatsApp messaging
- Response codes: 200 (OK), 400 (no code provided), 401 (expired/incorrect), 404 (no active code)

### Android
- **Dependency Injection**: Dagger Hilt (`@HiltAndroidApp`, `@AndroidEntryPoint`, `@Inject`)
- **Navigation**: Fragment-based with AndroidX Navigation Component (`nav_graph.xml`)
- **OTP Reception**:
  - One-tap: `WhatsAppCodeReceiverActivity` receives `com.whatsapp.otp.OTP_RETRIEVED` intent
  - Zero-tap: `OtpCodeReceiver` broadcast receiver for same intent
- **Handshake**: Uses `com.whatsapp.otp:whatsapp-otp-android-sdk:0.1.0` - must call `WhatsAppOtpHandler.sendOtpIntentToWhatsApp()` before requesting OTP
- **App Signature**: `AppSignatureRetriever` gets app hash needed for WhatsApp template configuration

### iOS
- MVVM: Each screen has ViewController + ViewModel pair
- Network: URLSession with `OtpRequestHelper` and `OtpRequestUrl`
- Models: Codable for JSON encoding/decoding
- Minimum WhatsApp version: 2.22.11

## Configuration

### Server
`Server/setup/whatsapp-info.json` - Created by setup.py with WABA credentials (WABA ID, access token, phone number ID)

### Android
`Android/app/src/main/assets/config.properties`:
```properties
server_domain=http://10.0.2.2:3000  # 10.0.2.2 = host localhost from emulator
```
**Note**: App hash signature varies by signing key and machine. Use a signed APK for consistent testing.

### iOS
`iOS/SampleApp/OTP/OtpRequestUrl.swift` - Edit `host` and `port` constants

## Testing

- **Android**: JUnit 4 + Mockito + Robolectric in `Android/app/src/test/java/`
- **iOS**: XCTest + Mockingbird in `iOS/SampleAppTests/`

## Key Files

### Android
- `Android/app/src/main/AndroidManifest.xml` - Activity/receiver declarations for OTP intents
- Key classes in `Android/app/src/main/java/com/whatsapp/otp/sample/app/`:
  - `activity/WhatsAppCodeReceiverActivity.java` - Handles one-tap autofill
  - `receiver/OtpCodeReceiver.java` - Handles zero-tap broadcast
  - `otp/WhatsAppOtpIntentHandler.java` - Orchestrates OTP sending with handshake
  - `signature/AppSignatureRetriever.java` - Gets app hash for template configuration

### iOS (in `iOS/SampleApp/`)
- `OTP/OtpRequestHelper.swift` - Network request abstraction
- `UI/LoginViewModel.swift`, `UI/VerifyOtpViewModel.swift` - Business logic

### Server
- `Server/server/app.js` - Main Express server with OTP endpoints
- `Server/setup/setup.py` - Interactive setup for WhatsApp API credentials
