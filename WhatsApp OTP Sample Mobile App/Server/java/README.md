# WhatsApp OTP Sample Server (Java)

A Java implementation of the WhatsApp OTP sample server using only the JDK standard library.

## Prerequisites

- Java 17 or later ([Adoptium](https://adoptium.net/) or [Oracle JDK](https://www.oracle.com/java/technologies/downloads/))
- Maven 3.6+ (optional, for building)
- Completed setup via `../setup/setup.py` (creates `whatsapp-info.json`)

## Running

### With Maven

```bash
cd java
mvn compile exec:java
```

### Without Maven

```bash
cd java
javac -d target src/main/java/com/whatsapp/otp/server/OtpServer.java
java -cp target com.whatsapp.otp.server.OtpServer
```

### Build JAR

```bash
cd java
mvn package
java -jar target/otp-server-1.0.0.jar
```

## API

Same as the Node.js server:

- `GET /otp/:phone_number/` - Request OTP
- `POST /otp/:phone_number/` - Verify OTP (body: `{"code": "123456"}`)

## Security Features

- Cryptographically secure OTP generation using `SecureRandom`
- SHA-256 hashing (plaintext never stored)
- Constant-time comparison to prevent timing attacks
- Max 3 verification attempts
- 5-minute OTP expiry
- One-time use

## Dependencies

This implementation uses only the Java standard library:
- `com.sun.net.httpserver.HttpServer` for HTTP handling
- `java.security.SecureRandom` for OTP generation
- `java.security.MessageDigest` for SHA-256 hashing
- `java.net.HttpURLConnection` for WhatsApp API calls
