import axios from 'axios';

const BASE_URL = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

export async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const { data } = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return data.access_token;
}

export async function stkPush(phone: string, amount: number, accountRef: string, description: string) {
  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

  const { data } = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: `${process.env.MPESA_CALLBACK_URL}/stk`,
    AccountReference: accountRef,
    TransactionDesc: description,
  }, { headers: { Authorization: `Bearer ${token}` } });

  return data;
}

export async function b2cPayout(phone: string, amount: number, remarks: string) {
  const token = await getAccessToken();
  const { data } = await axios.post(`${BASE_URL}/mpesa/b2c/v3/paymentrequest`, {
    OriginatorConversationID: `chamapesa_${Date.now()}`,
    InitiatorName: process.env.MPESA_B2C_INITIATOR,
    SecurityCredential: process.env.MPESA_B2C_PASSWORD,
    CommandID: 'BusinessPayment',
    Amount: amount,
    PartyA: process.env.MPESA_B2C_SHORTCODE,
    PartyB: phone,
    Remarks: remarks,
    QueueTimeOutURL: `${process.env.MPESA_CALLBACK_URL}/b2c/timeout`,
    ResultURL: `${process.env.MPESA_CALLBACK_URL}/b2c/result`,
  }, { headers: { Authorization: `Bearer ${token}` } });

  return data;
}

export async function checkTransactionStatus(transactionId: string) {
  const token = await getAccessToken();
  const { data } = await axios.post(`${BASE_URL}/mpesa/transactionstatus/v1/query`, {
    Initiator: process.env.MPESA_B2C_INITIATOR,
    SecurityCredential: process.env.MPESA_B2C_PASSWORD,
    CommandID: 'TransactionStatusQuery',
    TransactionID: transactionId,
    PartyA: process.env.MPESA_SHORTCODE,
    IdentifierType: '4',
    ResultURL: `${process.env.MPESA_CALLBACK_URL}/status/result`,
    QueueTimeOutURL: `${process.env.MPESA_CALLBACK_URL}/status/timeout`,
    Remarks: 'Status check',
  }, { headers: { Authorization: `Bearer ${token}` } });

  return data;
}
