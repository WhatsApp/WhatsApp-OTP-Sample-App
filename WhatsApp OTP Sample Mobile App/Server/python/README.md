# WhatsApp OTP Sample Server (Python)

A Python/Flask implementation of the WhatsApp OTP sample server.

## Prerequisites

- Python 3.8 or later
- Completed setup via `../setup/setup.py` (creates `whatsapp-info.json`)

## Running

```bash
cd python
pip3 install -r requirements.txt
python3 server.py
```

## API

Same as the other server implementations:

- `GET /otp/:phone_number/` - Request OTP
- `POST /otp/:phone_number/` - Verify OTP (body: `{"code": "123456"}`)

## Security Features

- Cryptographically secure OTP generation using `secrets.randbelow()`
- SHA-256 hashing using `hashlib.sha256()` (plaintext never stored)
- Constant-time comparison via `hmac.compare_digest()`
- Max 3 verification attempts
- 5-minute OTP expiry
- One-time use

## Dependencies

- `flask` - Web framework
- `requests` - HTTP client for WhatsApp API calls
