#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

"""
WhatsApp OTP Sample Server - Python Implementation

A Flask server that generates and verifies OTP codes sent via WhatsApp Business API
authentication templates.

Security Features:
- Cryptographically secure OTP generation using secrets.randbelow()
- SHA-256 hashing for OTP storage (plaintext never persisted)
- Constant-time comparison using hmac.compare_digest() to prevent timing attacks
- Maximum verification attempts (3) to prevent brute force
- OTP expiry after 5 minutes
- One-time use (code deleted after successful verification)
"""

import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta
from pathlib import Path

import requests
from flask import Flask, jsonify, request

# Configuration constants
PORT = 3000
CODE_LENGTH = 6
CODE_LIFETIME_MINUTES = 5
MAX_VERIFICATION_ATTEMPTS = 3
CONFIG_FILENAME = "whatsapp-info.json"
API_VERSION = "v21.0"

app = Flask(__name__)

# In-memory storage for active OTP codes
# Format: {phone_number: {"code_hash": str, "expiration": datetime, "attempts": int}}
active_codes: dict = {}


def generate_code() -> str:
    """
    Generate a cryptographically secure OTP code.

    Uses secrets.randbelow() which provides cryptographically strong
    random number generation suitable for security-sensitive applications.

    Returns:
        A 6-digit numeric OTP code as a string.
    """
    min_val = 10 ** (CODE_LENGTH - 1)
    max_val = 10 ** CODE_LENGTH - 1
    code = min_val + secrets.randbelow(max_val - min_val + 1)
    return str(code).zfill(CODE_LENGTH)


def hash_code(code: str) -> str:
    """
    Compute the SHA-256 hash of an OTP code.

    The plaintext code is never stored - only the hash is persisted.
    This ensures that even if the storage is compromised, the actual
    codes cannot be recovered.

    Args:
        code: The plaintext OTP code to hash.

    Returns:
        The SHA-256 hash as a hexadecimal string (64 characters).
    """
    return hashlib.sha256(code.encode()).hexdigest()


def verify_code(provided_code: str, stored_hash: str) -> bool:
    """
    Verify a provided OTP code against a stored hash using constant-time comparison.

    Uses hmac.compare_digest() which performs constant-time comparison to prevent
    timing attacks, where an attacker could measure response times to deduce
    correct characters in the code.

    Args:
        provided_code: The code submitted by the user for verification.
        stored_hash: The SHA-256 hash of the correct OTP code.

    Returns:
        True if the provided code matches the stored hash, False otherwise.
    """
    provided_hash = hash_code(provided_code)
    return hmac.compare_digest(provided_hash, stored_hash)


def log_active_codes():
    """Log the current state of active OTP codes (with truncated hashes)."""
    print("Active codes state (hashes shown, not plaintext):")
    for phone, data in active_codes.items():
        truncated_hash = data["code_hash"][:16] + "..."
        print(f"  {phone}: hash={truncated_hash}, expires={data['expiration'].isoformat()}, attempts={data['attempts']}")


def load_config() -> dict:
    """
    Load WhatsApp configuration from the setup JSON file.

    Returns:
        Dictionary containing waba_id, access_token, phone_number_id, template_id.

    Raises:
        FileNotFoundError: If the configuration file doesn't exist.
        ValueError: If required fields are missing.
    """
    # Try relative paths
    config_paths = [
        Path(__file__).parent / ".." / "setup" / CONFIG_FILENAME,
        Path(__file__).parent / "setup" / CONFIG_FILENAME,
        Path("setup") / CONFIG_FILENAME,
    ]

    for config_path in config_paths:
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
                required_keys = ["waba_id", "access_token", "phone_number_id", "template_id"]
                for key in required_keys:
                    if not config.get(key):
                        raise ValueError(f"Missing {key} in {CONFIG_FILENAME}")
                return config

    raise FileNotFoundError(f"Missing {CONFIG_FILENAME} file. Please run setup.py first.")


def fetch_template_name(config: dict) -> str:
    """
    Fetch the template name from the WhatsApp API.

    Args:
        config: The WhatsApp configuration dictionary.

    Returns:
        The template name.

    Raises:
        ValueError: If the template is not found or not approved.
    """
    url = f"https://graph.facebook.com/{API_VERSION}/{config['waba_id']}/message_templates"
    params = {"access_token": config["access_token"]}

    while url:
        response = requests.get(url, params=params)
        data = response.json()

        for template in data.get("data", []):
            if template.get("id") == config["template_id"]:
                if template.get("status") != "APPROVED":
                    raise ValueError(f"Template not approved: {template.get('status')}")
                return template.get("name")

        url = data.get("paging", {}).get("next")
        params = {}  # Next URL includes token

    raise ValueError(f"Template not found: {config['template_id']}")


# Load configuration at startup
try:
    config = load_config()
    template_name = fetch_template_name(config)
    print(f"Verified OTP template '{template_name}' with ID {config['template_id']} is approved and ready to send.")
except Exception as e:
    print(f"Configuration error: {e}")
    exit(1)


@app.route("/otp/<phone_number>/", methods=["GET"])
@app.route("/otp/<phone_number>", methods=["GET"])
def send_otp(phone_number: str):
    """
    Request OTP endpoint.

    Generates a new OTP code, stores its hash, and sends it via WhatsApp.

    Args:
        phone_number: Recipient phone number in international format without '+'.

    Returns:
        200: OTP sent successfully.
        500: Error calling WhatsApp send message API.
    """
    print(f"\nCurrent time: {datetime.now().isoformat()}")
    print(f"OTP requested for phone # {phone_number}")

    code = generate_code()
    expiration = datetime.now() + timedelta(minutes=CODE_LIFETIME_MINUTES)

    # Build WhatsApp API request
    send_url = f"https://graph.facebook.com/{API_VERSION}/{config['phone_number_id']}/messages"
    headers = {
        "Authorization": f"Bearer {config['access_token']}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": "en_US",
                "policy": "deterministic"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": code}]
                },
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [{"type": "text", "text": code}]
                }
            ]
        }
    }

    try:
        response = requests.post(send_url, headers=headers, json=payload)

        if response.status_code != 200:
            error_data = response.json()
            print(f"Error ({response.status_code}) from WhatsApp API: {error_data}")
            print(f"Response ({response.status_code}): Error")
            log_active_codes()
            return "Error calling send message API. Check server logs.", 500

        # Store the hashed code
        active_codes[phone_number] = {
            "code_hash": hash_code(code),
            "expiration": expiration,
            "attempts": 0
        }

        print(f"Response (200): OK")
        log_active_codes()
        return "", 200

    except Exception as e:
        print(f"Error sending message: {e}")
        print(f"Response (500): Error")
        log_active_codes()
        return "Error calling send message API. Check server logs.", 500


@app.route("/otp/<phone_number>/", methods=["POST"])
@app.route("/otp/<phone_number>", methods=["POST"])
def verify_otp(phone_number: str):
    """
    Verify OTP endpoint.

    Validates the provided code against the stored hash using constant-time comparison.
    Tracks attempts and invalidates the code after max attempts or on success.

    Args:
        phone_number: Phone number the OTP was sent to.

    Request Body:
        {"code": "123456"}

    Returns:
        200: OK - Verification successful.
        400: No code provided.
        401: Code has expired / Incorrect code / Too many failed attempts.
        404: No active code for this phone number.
    """
    print(f"\nCurrent time: {datetime.now().isoformat()}")
    print(f"OTP validation request for phone # {phone_number}")

    active_code = active_codes.get(phone_number)
    if not active_code:
        msg = f"No active code for phone # {phone_number}"
        print(f"Response (404): {msg}")
        log_active_codes()
        return msg, 404

    # Get provided code from request body
    body = request.get_json(silent=True) or {}
    provided_code = body.get("code")

    if not provided_code:
        print("Response (400): No code provided.")
        log_active_codes()
        return "No code provided.", 400

    # Check expiration
    if datetime.now() > active_code["expiration"]:
        del active_codes[phone_number]
        msg = "Code has expired, please request another."
        print(f"Response (401): {msg}")
        log_active_codes()
        return msg, 401

    # Check max attempts
    if active_code["attempts"] >= MAX_VERIFICATION_ATTEMPTS:
        del active_codes[phone_number]
        msg = "Too many failed attempts, please request a new code."
        print(f"Response (401): {msg}")
        log_active_codes()
        return msg, 401

    # Verify code using constant-time comparison
    if not verify_code(provided_code, active_code["code_hash"]):
        active_codes[phone_number]["attempts"] += 1

        if active_codes[phone_number]["attempts"] >= MAX_VERIFICATION_ATTEMPTS:
            del active_codes[phone_number]
            msg = "Too many failed attempts, please request a new code."
            print(f"Response (401): {msg}")
            log_active_codes()
            return msg, 401

        remaining = MAX_VERIFICATION_ATTEMPTS - active_codes[phone_number]["attempts"]
        msg = f"Incorrect code. {remaining} attempt(s) remaining."
        print(f"Response (401): {msg}")
        log_active_codes()
        return msg, 401

    # Success - delete the code (one-time use)
    del active_codes[phone_number]
    print("Response (200): OK")
    log_active_codes()
    return "", 200


if __name__ == "__main__":
    print(f"Sample app listening on port {PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
