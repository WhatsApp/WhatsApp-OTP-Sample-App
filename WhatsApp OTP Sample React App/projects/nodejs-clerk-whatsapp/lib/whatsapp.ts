/**
 * WhatsApp Cloud API integration module for OTP delivery.
 *
 * @description This module provides functionality to send OTP codes via WhatsApp
 * using Meta's Graph API (Cloud API). It sends templated messages that must be
 * pre-approved in the Meta Business Suite.
 *
 * Required environment variables:
 * - `WA_PHONE_NUMBER_ID`: Your WhatsApp Business phone number ID
 * - `WA_ACCESS_TOKEN`: Meta Graph API access token
 * - `WA_TEMPLATE_NAME`: Name of the approved message template
 * - `WA_TEMPLATE_LANG`: Template language code (e.g., "en_US")
 *
 * The template must be structured to accept:
 * - Body parameter: The OTP code
 * - Button parameter (optional): The OTP code for copy-to-clipboard button
 *
 * @example
 * import { sendWhatsAppOTP } from './whatsapp';
 *
 * const result = await sendWhatsAppOTP('+14155551234', '847293');
 * if (result.success) {
 *   console.log('Message ID:', result.messageId);
 * }
 *
 * @see {@link lib/otp.ts} - OTP generation before sending
 * @see {@link app/api/whatsapp-otp/send/route.ts} - API route using this function
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api - WhatsApp Cloud API docs
 *
 * @module lib/whatsapp
 */

/** Meta Graph API version for WhatsApp Cloud API */
const GRAPH_API_VERSION = 'v21.0';

/**
 * Result type for WhatsApp message sending operation.
 */
interface SendWhatsAppResult {
  /** Whether the message was sent successfully */
  success: boolean;
  /** The WhatsApp message ID (only on success) */
  messageId?: string;
  /** Error message from the API (only on failure) */
  error?: string;
}

/**
 * Sends an OTP code to a phone number via WhatsApp.
 *
 * @description Sends a templated WhatsApp message containing the OTP code.
 * The function:
 * 1. Constructs the Graph API URL for the configured phone number
 * 2. Builds the template payload with the OTP code
 * 3. Sends the request with proper authentication
 * 4. Returns the result with message ID or error details
 *
 * Phone numbers are sanitized to digits only before sending.
 *
 * @param phone - The recipient's phone number (with or without formatting)
 * @param code - The OTP code to send
 *
 * @returns A promise resolving to the send result
 * @returns result.success - Whether the message was sent successfully
 * @returns result.messageId - WhatsApp message ID for tracking (on success)
 * @returns result.error - Error message from API or connection failure
 *
 * @throws Does not throw - errors are returned in the result object
 *
 * @example
 * // Send OTP to a phone number
 * const result = await sendWhatsAppOTP('+1 (415) 555-1234', '847293');
 *
 * if (result.success) {
 *   console.log('Sent! Message ID:', result.messageId);
 * } else {
 *   console.error('Failed:', result.error);
 *   // Possible errors: invalid phone, template not approved, rate limited
 * }
 */
export async function sendWhatsAppOTP(
  phone: string,
  code: string
): Promise<SendWhatsAppResult> {
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
