let smsClient: any = null;

function getSmsClient() {
  if (!smsClient) {
    if (!process.env.AT_API_KEY) {
      console.warn('Africa\'s Talking API key not set — SMS disabled');
      return null;
    }
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({ apiKey: process.env.AT_API_KEY!, username: process.env.AT_USERNAME! });
    smsClient = at.SMS;
  }
  return smsClient;
}

export async function sendSMS(to: string, message: string) {
  const client = getSmsClient();
  if (!client) return console.log(`[SMS stub] To: ${to} | ${message}`);
  return client.send({
    to: [to], message,
    ...(process.env.AT_SENDER_ID ? { from: process.env.AT_SENDER_ID } : {}),
  });
}

export async function sendBulkSMS(recipients: string[], message: string) {
  const client = getSmsClient();
  if (!client) return console.log(`[SMS stub] To: ${recipients.join(',')} | ${message}`);
  return client.send({
    to: recipients, message,
    ...(process.env.AT_SENDER_ID ? { from: process.env.AT_SENDER_ID } : {}),
  });
}
