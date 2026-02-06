const GRAPH_API_VERSION = 'v21.0';

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
