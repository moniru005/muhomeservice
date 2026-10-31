import { createHmac, timingSafeEqual } from 'node:crypto';

let bkashTokenCache = { token: '', expiresAt: 0 };

function bkashBaseUrl() {
  if (process.env.BKASH_BASE_URL) return process.env.BKASH_BASE_URL.replace(/\/$/, '');
  return process.env.BKASH_ENV === 'production'
    ? 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout'
    : 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout';
}

export function isOnlinePaymentConfigured() {
  if ((process.env.PAYMENT_PROVIDER || 'generic').toLowerCase() === 'bkash') {
    return Boolean(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET && process.env.BKASH_USERNAME && process.env.BKASH_PASSWORD && process.env.PAYMENT_PUBLIC_CALLBACK_URL && process.env.FRONTEND_URL);
  }
  return Boolean(process.env.PAYMENT_CREATE_URL && process.env.PAYMENT_API_TOKEN && process.env.PAYMENT_WEBHOOK_SECRET && process.env.PAYMENT_PUBLIC_CALLBACK_URL);
}

export function verifyPaymentSignature(rawBody, suppliedSignature) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !rawBody || !suppliedSignature) return false;
  const normalized = String(suppliedSignature).replace(/^sha256=/i, '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const supplied = Buffer.from(normalized, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function bkashRequest(path, body, token = true) {
  const base = bkashBaseUrl();
  const url = new URL(`${base}/${path.replace(/^\//, '')}`);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('bKash API must use HTTPS');
  const headers = { 'Content-Type': 'application/json', 'x-app-key': process.env.BKASH_APP_KEY };
  if (token) {
    const accessToken = await getBkashToken();
    headers.Authorization = accessToken;
  } else {
    headers.username = process.env.BKASH_USERNAME;
    headers.password = process.env.BKASH_PASSWORD;
  }
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.statusCode && data.statusCode !== '0000')) throw new Error(`bKash API request failed (HTTP ${response.status}, code ${String(data.statusCode || 'unknown')})`);
  return data;
}

async function getBkashToken() {
  if (bkashTokenCache.token && bkashTokenCache.expiresAt > Date.now() + 60000) return bkashTokenCache.token;
  const data = await bkashRequest('token/grant', { app_key: process.env.BKASH_APP_KEY, app_secret: process.env.BKASH_APP_SECRET }, false);
  if (!data.id_token) throw new Error('bKash token response missing id_token');
  const expiresIn = Math.max(60, Number(data.expires_in || 3600));
  bkashTokenCache = { token: data.id_token, expiresAt: Date.now() + expiresIn * 1000 };
  return bkashTokenCache.token;
}

export async function verifyBkashPayment(providerPaymentId) {
  if (!providerPaymentId) throw new Error('Missing bKash payment ID');
  let data;
  try { data = await bkashRequest('execute', { paymentID: providerPaymentId }); }
  catch (e) {
    // bKash may report that a payment was already executed; query it before deciding.
    data = await bkashRequest('payment/status', { paymentID: providerPaymentId });
    if (!data) throw e;
  }
  if (!data.trxID || !['Completed', 'Success', 'Successful'].includes(String(data.transactionStatus || data.status || ''))) {
    const query = await bkashRequest('payment/status', { paymentID: providerPaymentId });
    data = query.trxID ? query : data;
  }
  const status = String(data.transactionStatus || data.status || '');
  return { providerPaymentId, transactionId: String(data.trxID || ''), amount: Number(data.amount), currency: String(data.currency || 'BDT').toUpperCase(), status, rawStatusCode: String(data.statusCode || '') };
}

export async function createProviderCheckout({ payment, booking, customer }) {
  if (!isOnlinePaymentConfigured()) throw new Error('Online payment is not configured. Set the provider environment variables first.');
  if ((process.env.PAYMENT_PROVIDER || 'generic').toLowerCase() === 'bkash') {
    const callbackUrl = new URL(process.env.PAYMENT_PUBLIC_CALLBACK_URL);
    if (process.env.NODE_ENV === 'production' && (callbackUrl.protocol !== 'https:' || !new URL(process.env.FRONTEND_URL).protocol.startsWith('https'))) throw new Error('bKash callback and frontend URLs must use HTTPS in production');
    const data = await bkashRequest('create', {
      mode: '0011',
      payerReference: String(customer.phone || booking.phone || booking.ticketId || 'MU-Customer').slice(0, 50),
      callbackURL: callbackUrl.toString(),
      amount: Number(payment.amount).toFixed(2),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: String(payment.paymentId).replace(/-/g, '').slice(0, 20),
    });
    let checkout;
    try { checkout = new URL(String(data.bkashURL || '')); } catch { throw new Error('bKash response did not include a valid checkout URL'); }
    if (checkout.protocol !== 'https:' || !data.paymentID) throw new Error('bKash checkout response is invalid');
    return { checkoutUrl: checkout.toString(), providerTransactionId: String(data.paymentID), provider: 'bkash' };
  }
  const createUrl = new URL(process.env.PAYMENT_CREATE_URL);
  const callbackUrl = new URL(process.env.PAYMENT_PUBLIC_CALLBACK_URL);
  if (process.env.NODE_ENV === 'production' && (createUrl.protocol !== 'https:' || callbackUrl.protocol !== 'https:')) throw new Error('Payment API and callback URLs must use HTTPS in production');
  const response = await fetch(createUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.PAYMENT_API_TOKEN}`, 'Idempotency-Key': payment.paymentId }, body: JSON.stringify({ orderId: payment.paymentId, amount: payment.amount, currency: payment.currency, description: `${booking.ticketId} · ${booking.serviceName || 'MU Home Service'}`, customer: { name: customer.name || booking.name, email: customer.email || booking.email || '', phone: customer.phone || booking.phone || '' }, callbackUrl: process.env.PAYMENT_PUBLIC_CALLBACK_URL, metadata: { bookingId: booking._id.toString(), ticketId: booking.ticketId } }), signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Payment provider rejected checkout creation (HTTP ${response.status})`);
  let checkout; try { checkout = new URL(String(data.checkoutUrl || '')); } catch { throw new Error('Payment provider response did not include a valid checkoutUrl'); }
  if (!['https:', ...(process.env.NODE_ENV !== 'production' ? ['http:'] : [])].includes(checkout.protocol)) throw new Error('Payment provider checkout URL must use HTTPS');
  if (!data.transactionId || String(data.transactionId).length > 200) throw new Error('Payment provider response did not include a valid transactionId');
  return { checkoutUrl: checkout.toString(), providerTransactionId: String(data.transactionId) };
}

export async function sendConfiguredSms({ to, message }) {
  const provider = String(process.env.SMS_PROVIDER || 'generic').toLowerCase();
  if (provider === 'mimsms') {
    const userName = process.env.MIMSMS_USERNAME;
    const apiKey = process.env.MIMSMS_API_KEY;
    const senderName = process.env.MIMSMS_SENDER_NAME;
    if (!userName || !apiKey || !senderName) return { sent: false, skipped: true, reason: 'MiMSMS is not configured' };
    const response = await fetch(process.env.MIMSMS_API_URL || 'https://api.mimsms.com/api/V2/SMS', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, userName, senderName, transactionType: 'T', mobileNumber: normalizeBdPhone(to), message }), signal: AbortSignal.timeout(10000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || (data.status && !['success', 'successful', 'ok', '200'].includes(String(data.status).toLowerCase()) && String(data.status) !== '200')) throw new Error(`MiMSMS rejected message (HTTP ${response.status})`);
    return { sent: true, provider: 'mimsms', messageId: data.messageId || data.message_id || null };
  }
  const endpoint = process.env.SMS_API_URL; const token = process.env.SMS_API_TOKEN;
  if (!endpoint || !token) return { sent: false, skipped: true, reason: 'SMS is not configured' };
  const url = new URL(endpoint);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('SMS_API_URL must use HTTPS in production');
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ to, message, sender: process.env.SMS_SENDER_ID || undefined }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`SMS provider rejected message (HTTP ${response.status})`);
  return { sent: true };
}

function normalizeBdPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('8801') && digits.length === 13) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  if (digits.startsWith('1') && digits.length === 10) return `880${digits}`;
  throw new Error('SMS recipient must be a valid Bangladesh mobile number');
}

export function smsIsConfigured() {
  if (String(process.env.SMS_PROVIDER || '').toLowerCase() === 'mimsms') return Boolean(process.env.MIMSMS_USERNAME && process.env.MIMSMS_API_KEY && process.env.MIMSMS_SENDER_NAME);
  return Boolean(process.env.SMS_API_URL && process.env.SMS_API_TOKEN);
}

export async function notifySmsSafely({ to, message, context = 'notification' }) {
  if (!to) return;
  try {
    const result = await sendConfiguredSms({ to: String(to).trim(), message: String(message).slice(0, 900) });
    if (result.skipped) return { success: false, skipped: true };
    return { success: true };
  } catch (error) {
    // Notifications must never roll back a booking or payment. Do not log credentials or full payloads.
    console.error(`SMS ${context} failed:`, String(error.message).slice(0, 200));
    return { success: false };
  }
}


export async function executeProviderRefund({ payment, refund }) {
  const provider = String(payment?.provider || process.env.PAYMENT_PROVIDER || 'generic').toLowerCase();
  if (provider === 'bkash') {
    if (!payment.providerTransactionId || !payment.providerTrxId) throw new Error('bKash paymentID/trxID missing; cannot execute refund safely');
    const data = await bkashRequest('payment/refund', { paymentID: payment.providerTransactionId, trxID: payment.providerTrxId, amount: Number(refund.amount).toFixed(2), sku: String(refund.ticketId || 'MU-Service').slice(0, 50), reason: String(refund.reason || 'Customer refund').slice(0, 200) });
    const refundTrxID = String(data.refundTrxID || data.refundTrxId || '');
    if (!refundTrxID || (data.statusCode && data.statusCode !== '0000')) throw new Error('bKash did not confirm a refund transaction reference');
    return { provider: 'bkash', providerRefundReference: refundTrxID, providerResponseStatus: String(data.statusCode || '0000') };
  }
  if (!process.env.PAYMENT_REFUND_URL || !process.env.PAYMENT_API_TOKEN) throw new Error('This payment provider has no configured refund endpoint. Configure PAYMENT_REFUND_URL or process refund manually with reconciliation evidence.');
  const url = new URL(process.env.PAYMENT_REFUND_URL);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Refund API must use HTTPS in production');
  const response = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.PAYMENT_API_TOKEN}`,'Idempotency-Key':refund.refundId}, body:JSON.stringify({refundId:refund.refundId,paymentId:payment.paymentId,transactionId:payment.providerTransactionId,amount:refund.amount,currency:payment.currency||'BDT',reason:refund.reason,metadata:{bookingId:refund.bookingId,ticketId:refund.ticketId}}), signal:AbortSignal.timeout(20000) });
  const data = await response.json().catch(()=>({}));
  if (!response.ok || data.status && !['success','succeeded','processed','refunded'].includes(String(data.status).toLowerCase()) || !data.refundId && !data.refundReference && !data.transactionId) throw new Error(`Payment provider refund not confirmed (HTTP ${response.status})`);
  return { provider, providerRefundReference:String(data.refundId||data.refundReference||data.transactionId), providerResponseStatus:String(data.status||'success') };
}

// Optional provider-agnostic WhatsApp Business API adapter. Configure an approved provider
// endpoint that accepts {to, message}; template-based providers can adapt this payload upstream.
export function whatsappIsConfigured() {
  return Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
}
export async function notifyWhatsAppSafely({ to, message, context = 'notification' }) {
  if (!to || !whatsappIsConfigured()) return { success: false, skipped: true };
  try {
    const url = new URL(process.env.WHATSAPP_API_URL);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('WhatsApp API must use HTTPS in production');
    const response = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${process.env.WHATSAPP_API_TOKEN}`}, body:JSON.stringify({to:normalizeBdPhone(to),message:String(message).slice(0,900),context}), signal:AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`WhatsApp provider rejected message (HTTP ${response.status})`);
    return { success: true };
  } catch (error) {
    console.error(`WhatsApp ${context} failed:`, String(error.message).slice(0,200));
    return { success: false };
  }
}
