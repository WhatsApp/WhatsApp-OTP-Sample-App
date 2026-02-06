/**
 * @fileoverview WhatsApp Cloud API integration for sending OTP messages.
 *
 * This module provides functionality to send OTP codes via WhatsApp using
 * Meta's Graph API. It uses pre-approved message templates for reliable
 * delivery and compliance with WhatsApp Business policies.
 *
 * @module lib/whatsapp
 * @see {@link lib/otp} - Generates OTP codes to be sent via this module
 * @see {@link app/api/otp/send/route} - API endpoint that uses this module
 */

/** Meta Graph API version for WhatsApp Cloud API */
const GRAPH_API_VERSION = 'v21.0';

/**
 * Sends an OTP code to a phone number via WhatsApp using a message template.
 *
 * This function:
 * - Uses Meta's Graph API to send WhatsApp template messages
 * - Automatically strips non-digit characters from phone numbers
 * - Uses a pre-configured message template with OTP placeholder
 * - Includes button component for one-tap code entry (if template supports it)
 *
 * @async
 * @param {string} phone - The recipient's phone number (will be normalized to digits only)
 * @param {string} code - The OTP code to include in the message
 * @returns {Promise<{ success: boolean; messageId?: string; error?: string }>} Result object:
 *   - `success`: Whether the message was sent successfully
 *   - `messageId`: WhatsApp message ID on success
 *   - `error`: Error message on failure
 *
 * @example
 * ```typescript
 * const result = await sendWhatsAppOTP('14155551234', '847293');
 * if (result.success) {
 *   console.log('Message sent:', result.messageId);
 * } else {
 *   console.error('Failed to send:', result.error);
 * }
 * ```
 *
 * @requires WA_PHONE_NUMBER_ID - WhatsApp Business phone number ID
 * @requires WA_ACCESS_TOKEN - Meta Graph API access token
 * @requires WA_TEMPLATE_NAME - Name of the approved OTP template
 * @requires WA_TEMPLATE_LANG - Language code for the template (e.g., 'en_US')
 */
export async function sendWhatsAppOTP(
  phone: string,
  code: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WA_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: phone.replace(/[^\d]/g, ''), // Strip to digits only
    type: 'template',
    template: {
      name: process.env.WA_TEMPLATE_NAME,
      language: { code: process.env.WA_TEMPLATE_LANG },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: code }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [{ type: 'text', text: code }],
        },
      ],
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      return {
        success: false,
        error: data.error?.message || 'Failed to send message',
      };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: 'Failed to connect to WhatsApp API' };
  }
}
