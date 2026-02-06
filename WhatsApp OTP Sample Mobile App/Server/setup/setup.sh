#!/bin/bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

# WhatsApp OTP Setup Script (Bash version)
# Creates an authentication message template and generates whatsapp-info.json

set -e

API_VERSION="v21.0"
FILENAME="whatsapp-info.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for required commands
for cmd in curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: '$cmd' is required but not installed."
        exit 1
    fi
done

echo "Welcome to the WhatsApp One-Time Password (OTP) Sample Application."
echo "This set-up script will help you get the starter code working for your business."
echo ""
echo "Let's start by creating a new authentication message template."
echo ""

# Load previous data if exists
PREVIOUS_WABA_ID=""
PREVIOUS_ACCESS_TOKEN=""
if [ -f "$SCRIPT_DIR/$FILENAME" ]; then
    echo "Loaded existing $FILENAME."
    PREVIOUS_WABA_ID=$(jq -r '.waba_id // empty' "$SCRIPT_DIR/$FILENAME")
    PREVIOUS_ACCESS_TOKEN=$(jq -r '.access_token // empty' "$SCRIPT_DIR/$FILENAME")
    echo ""
fi

# Collect WABA ID
echo "Please enter your WhatsApp Business Account (WABA) ID:"
echo "(You can find the WABA ID at https://business.facebook.com/settings/whatsapp-business-accounts/)"
if [ -n "$PREVIOUS_WABA_ID" ]; then
    echo "Leave blank to use the previously inputted WABA $PREVIOUS_WABA_ID."
fi
read -r WABA_ID
WABA_ID="${WABA_ID:-$PREVIOUS_WABA_ID}"
echo ""

# Collect Access Token
echo "Please provide a System User access token linked to the business:"
echo "(See https://www.facebook.com/business/help/503306463479099 for how to create a new System User and token.)"
if [ -n "$PREVIOUS_ACCESS_TOKEN" ]; then
    echo "Leave blank to use the previously inputted access token."
fi
read -r ACCESS_TOKEN
ACCESS_TOKEN="${ACCESS_TOKEN:-$PREVIOUS_ACCESS_TOKEN}"
echo ""

# Get phone numbers
echo "Thank you. Calling WhatsApp API to check available phone numbers..."
echo ""

PHONE_NUMBERS_RESPONSE=$(curl -s "https://graph.facebook.com/$API_VERSION/$WABA_ID/phone_numbers?access_token=$ACCESS_TOKEN")

if echo "$PHONE_NUMBERS_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    echo "Error while checking available phone numbers."
    echo "$PHONE_NUMBERS_RESPONSE" | jq '.error'
    exit 1
fi

PHONE_COUNT=$(echo "$PHONE_NUMBERS_RESPONSE" | jq '.data | length')
if [ "$PHONE_COUNT" -eq 0 ]; then
    echo "Your WABA does not have any phone numbers associated with it."
    exit 1
fi

echo "Please select a phone number from the following list:"
echo ""

# Display phone numbers
for i in $(seq 0 $((PHONE_COUNT - 1))); do
    DISPLAY_NUMBER=$(echo "$PHONE_NUMBERS_RESPONSE" | jq -r ".data[$i].display_phone_number")
    echo "[$i]: $DISPLAY_NUMBER"
done

read -p "Enter a number between 0 and $((PHONE_COUNT - 1)): " SELECTED_PHONE_IDX
PHONE_NUMBER_ID=$(echo "$PHONE_NUMBERS_RESPONSE" | jq -r ".data[$SELECTED_PHONE_IDX].id")
echo ""

# Select platform
echo "Please select which platform(s) you wish to test the sample app on."
echo ""
echo "[0]: Android"
echo "[1]: iOS"
echo "[2]: Both"
read -p "Enter a number between 0 and 2: " PLATFORM_IDX
echo ""

# Determine code submission method
if [ "$PLATFORM_IDX" -eq 1 ]; then
    # iOS only supports copy code
    CODE_METHOD="copy_code"
else
    echo "Please select the code delivery method for Android:"
    echo "[0]: Copy code - Customers tap the button to copy the code"
    echo "[1]: One-tap autofill (recommended) - Customers tap to fill the code"
    read -p "Enter 0 or 1: " METHOD_IDX
    echo ""

    if [ "$METHOD_IDX" -eq 1 ]; then
        CODE_METHOD="one_tap"
    else
        CODE_METHOD="copy_code"
    fi
fi

# Get template name
PLATFORM_NAMES=("android" "ios" "both")
DEFAULT_TEMPLATE_NAME="otp_${PLATFORM_NAMES[$PLATFORM_IDX]}_${CODE_METHOD}"
echo "Please provide a name for your new authentication template:"
echo "(Leave blank to use the default name '$DEFAULT_TEMPLATE_NAME'.)"
read -r TEMPLATE_NAME
TEMPLATE_NAME="${TEMPLATE_NAME:-$DEFAULT_TEMPLATE_NAME}"
echo ""

# Build button component
if [ "$CODE_METHOD" = "one_tap" ]; then
    DEFAULT_SIGNATURE="K8a/AINcGX7"
    echo "Please provide the app signature hash for the template:"
    echo "(Leave blank to use the default '$DEFAULT_SIGNATURE')"
    read -r SIGNATURE_HASH
    SIGNATURE_HASH="${SIGNATURE_HASH:-$DEFAULT_SIGNATURE}"

    BUTTON_JSON=$(cat <<EOF
{
    "type": "OTP",
    "otp_type": "ONE_TAP",
    "text": "Copy code",
    "autofill_text": "Autofill",
    "package_name": "com.whatsapp.otp.sample",
    "signature_hash": "$SIGNATURE_HASH"
}
EOF
)
else
    BUTTON_JSON=$(cat <<EOF
{
    "type": "OTP",
    "otp_type": "COPY_CODE",
    "text": "Copy code"
}
EOF
)
fi

# Create template
echo "Thank you. Calling WhatsApp API to create OTP template..."
echo ""

PAYLOAD=$(cat <<EOF
{
    "name": "$TEMPLATE_NAME",
    "language": "en_US",
    "category": "AUTHENTICATION",
    "components": [
        {
            "type": "BODY",
            "add_security_recommendation": true
        },
        {
            "type": "FOOTER",
            "code_expiration_minutes": 5
        },
        {
            "type": "BUTTONS",
            "buttons": [$BUTTON_JSON]
        }
    ]
}
EOF
)

TEMPLATE_RESPONSE=$(curl -s -X POST \
    "https://graph.facebook.com/$API_VERSION/$WABA_ID/message_templates?access_token=$ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

if echo "$TEMPLATE_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
    TEMPLATE_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.id')
    echo "Your new template with ID $TEMPLATE_ID was just created."

    # Write config file
    cat > "$SCRIPT_DIR/$FILENAME" <<EOF
{
    "waba_id": "$WABA_ID",
    "access_token": "$ACCESS_TOKEN",
    "phone_number_id": "$PHONE_NUMBER_ID",
    "template_id": "$TEMPLATE_ID"
}
EOF

    echo "Configuration saved to $FILENAME"
else
    echo "Template not created."
    echo "$TEMPLATE_RESPONSE" | jq '.'
    exit 1
fi
