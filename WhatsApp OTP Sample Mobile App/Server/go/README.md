# WhatsApp OTP Sample Server (Go)

A Go implementation of the WhatsApp OTP sample server.

## Prerequisites

- Go 1.21 or later
- Completed setup via `../setup/setup.py` (creates `whatsapp-info.json`)

## Running

```bash
cd go
go run main.go
```

Or build and run:

```bash
cd go
go build -o otp-server
./otp-server
```

## API

Same as the Node.js server:

- `GET /otp/:phone_number/` - Request OTP
- `POST /otp/:phone_number/` - Verify OTP (body: `{"code": "123456"}`)

## Security Features

- Cryptographically secure OTP generation using `crypto/rand`
- SHA-256 hashing (plaintext never stored)
- Constant-time comparison via `crypto/subtle`
- Max 3 verification attempts
- 5-minute OTP expiry
- One-time use
