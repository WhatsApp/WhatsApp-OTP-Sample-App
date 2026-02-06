# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WhatsApp OTP Sample App demonstrates how to send and receive OTP codes through WhatsApp Business APIs with "one-tap" autofill and copy-code functionality. Multi-platform project with:
- **Server**: Available in Python, Node.js, Go, and Java (all generate OTP, communicate with WhatsApp Cloud API)
- **Setup Scripts**: Available in Python, Bash, and JavaScript (configure WhatsApp API credentials)
- **Android**: Java app with Dagger Hilt DI, Fragment-based navigation
- **iOS**: Swift app using MVVM pattern (copy-code only, no one-tap)

## Build Commands

### Server Setup (Run Once)
```bash
cd Server/setup && pip3 install -r requirements.txt && python3 setup.py  # Python (recommended)
cd Server/setup && ./setup.sh  # Bash (requires curl, jq)
cd Server/setup && npm install && node setup.js  # JavaScript
```

### Server (Python)
```bash
cd Server/python && pip3 install -r requirements.txt && python3 server.py
```

### Server (Node.js)
```bash
cd Server/javascript && npm install && node app.js
```

### Server (Go)
```bash
cd Server/go && go run main.go
```

### Server (Java)
```bash
cd Server/java && mvn compile exec:java
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
  -d '{"code": "123456"}' -H "Content-Type: application/json"  # Verify OTP
```

## Architecture

### Server (Python, Node.js, Go, Java)
All server implementations provide identical functionality:
- REST API: `GET /otp/:phone_number` (request OTP), `POST /otp/:phone_number` (verify OTP)
- In-memory OTP storage with 5-minute TTL and SHA-256 hashing (plaintext never stored)
- Communicates with Facebook Graph API v21.0 for WhatsApp messaging
- Security: Cryptographically secure random generation, constant-time comparison for verification
- Max 3 verification attempts per OTP
- Response codes: 200 (OK), 400 (no code provided), 401 (expired/incorrect/max attempts), 404 (no active code)

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
`Server/setup/whatsapp-info.json` - Created by setup scripts with WABA credentials (WABA ID, access token, phone number ID, template ID)

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
- `Server/setup/` - Setup scripts (Python, Bash, JavaScript) for WhatsApp API configuration
- `Server/python/server.py` - Python/Flask server (documented)
- `Server/javascript/app.js` - Node.js/Express server (JSDoc documented)
- `Server/go/main.go` - Go server (standard library only)
- `Server/java/src/main/java/com/whatsapp/otp/server/OtpServer.java` - Java server (Javadoc documented)
