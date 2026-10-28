import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { requireAdmin, requireAuth, requireRole } from '../middleware/auth.js';
import { createProviderCheckout, isOnlinePaymentConfigured, notifySmsSafely, notifyWhatsAppSafely, smsIsConfigured, whatsappIsConfigured, verifyPaymentSignature, verifyBkashPayment } from '../services/integrations.js';

const router = Router();
const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;


router.get('/admin/online-payments', requireAdmin, async (_req, res, next) => {
  try {
    const db = getDB();
    const [payments, counts] = await Promise.all([
      db.collection('onlinePayments').find({}, { projection: { paymentId:1, bookingId:1, ticketId:1, amount:1, currency:1, status:1, provider:1, providerTransactionId:1, createdAt:1, verifiedAt:1, reconciliationReason:1 } }).sort({ createdAt:-1 }).limit(100).toArray(),
      db.collection('onlinePayments').aggregate([{ $group: { _id:'$status', count:{ $sum:1 } } }]).toArray(),
    ]);
    res.json({ payments, counts: Object.fromEntries(counts.map(x => [x._id || 'unknown', x.count])) });
  } catch (e) { next(e); }
});

router.get('/integrations/status', requireAuth, requireRole('customer'), (_req, res) => {
  res.json({ onlinePaymentAvailable: isOnlinePaymentConfigured(), currency: process.env.PAYMENT_CURRENCY || 'BDT', smsNotificationsEnabled: smsIsConfigured(), whatsappNotificationsEnabled: whatsappIsConfigured() });
});

router.get('/admin/integrations/status', requireAdmin, (_req, res) => {
  res.json({ onlinePaymentAvailable: isOnlinePaymentConfigured(), paymentProvider: process.env.PAYMENT_PROVIDER || 'generic', currency: process.env.PAYMENT_CURRENCY || 'BDT', smsProvider: process.env.SMS_PROVIDER || 'generic', smsNotificationsEnabled: smsIsConfigured(), whatsappNotificationsEnabled: whatsappIsConfigured() });
});

router.post('/payments/checkout', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    if (!isOnlinePaymentConfigured()) return res.status(503).json({ message: 'অনলাইন পেমেন্ট এখনো কনফিগার করা হয়নি। অনুগ্রহ করে Admin-এর সঙ্গে যোগাযোগ করুন।' });
    if (!ObjectId.isValid(req.body.bookingId)) return res.status(400).json({ message: 'সঠিক Booking নির্বাচন করুন।' });
    const db = getDB();
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.body.bookingId), userId: req.user.sub });
    if (!booking) return res.status(404).json({ message: 'Booking পাওয়া যায়নি।' });
    const expected = money(booking.totalAmount || booking.quotedAmount || 0);
    const paid = money(booking.paymentAmount || 0);
    const amount = money(expected - paid);
    if (amount <= 0) return res.status(409).json({ message: 'এই Booking-এর কোনো বকেয়া নেই।' });
    if (!['Quotation sent', 'Approved', 'In progress', 'Completed'].includes(booking.status)) return res.status(409).json({ message: 'Quotation/বিল নিশ্চিত হওয়ার পর পেমেন্ট করা যাবে।' });
    const pending = await db.collection('onlinePayments').findOne({ bookingId: booking._id.toString(), userId: req.user.sub, status: 'pending', expiresAt: { $gt: new Date() } });
    if (pending?.checkoutUrl) return res.json({ paymentId: pending.paymentId, checkoutUrl: pending.checkoutUrl, amount: pending.amount, currency: pending.currency, reused: true });
    const payment = { paymentId: randomUUID(), bookingId: booking._id.toString(), userId: req.user.sub, ticketId: booking.ticketId, amount, currency: process.env.PAYMENT_CURRENCY || 'BDT', status: 'creating', provider: process.env.PAYMENT_PROVIDER || 'generic', createdAt: new Date(), updatedAt: new Date(), expiresAt: new Date(Date.now() + 30 * 60 * 1000) };
    await db.collection('onlinePayments').insertOne(payment);
    try {
      const customer = await db.collection('users').findOne({ _id: new ObjectId(req.user.sub) }, { projection: { name: 1, email: 1, phone: 1 } });
      const checkout = await createProviderCheckout({ payment, booking, customer: customer || {} });
      await db.collection('onlinePayments').updateOne({ paymentId: payment.paymentId, status: 'creating' }, { $set: { ...checkout, checkoutUrl: checkout.checkoutUrl, provider: checkout.provider || payment.provider, status: 'pending', updatedAt: new Date() } });
      return res.status(201).json({ paymentId: payment.paymentId, checkoutUrl: checkout.checkoutUrl, amount, currency: payment.currency });
    } catch (error) {
      await db.collection('onlinePayments').updateOne({ paymentId: payment.paymentId, status: 'creating' }, { $set: { status: 'failed', failureReason: String(error.message).slice(0, 300), updatedAt: new Date() } });
      throw error;
    }
  } catch (e) { next(e); }
});

// bKash redirects here after checkout. The browser query is untrusted; we always verify with bKash server-to-server.
router.get('/payments/bkash/callback', async (req, res) => {
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const redirect = (result) => res.redirect(303, `${frontend}/dashboard?payment=${encodeURIComponent(result)}`);
  try {
    if (String(process.env.PAYMENT_PROVIDER || '').toLowerCase() !== 'bkash') return redirect('unavailable');
    const providerPaymentId = String(req.query.paymentID || '').slice(0, 200);
    const callbackStatus = String(req.query.status || '').toLowerCase();
    if (!providerPaymentId || !['success', 'failure', 'cancel'].includes(callbackStatus)) return redirect('invalid');
    const db = getDB();
    const payment = await db.collection('onlinePayments').findOne({ providerTransactionId: providerPaymentId, provider: 'bkash' });
    if (!payment) return redirect('not-found');
    if (payment.status === 'paid') return redirect('success');
    if (callbackStatus !== 'success') {
      await db.collection('onlinePayments').updateOne({ _id: payment._id, status: { $in: ['creating', 'pending'] } }, { $set: { status: callbackStatus === 'cancel' ? 'cancelled' : 'failed', updatedAt: new Date(), providerCallbackStatus: callbackStatus } });
      return redirect(callbackStatus === 'cancel' ? 'cancelled' : 'failed');
    }
    const verified = await verifyBkashPayment(providerPaymentId);
    if (!['Completed', 'Success', 'Successful'].includes(verified.status) || !verified.transactionId || money(verified.amount) !== money(payment.amount) || verified.currency !== 'BDT') {
      await db.collection('onlinePayments').updateOne({ _id: payment._id, status: { $in: ['creating', 'pending', 'settling'] } }, { $set: { status: 'reconciliation_required', reconciliationReason: 'bKash verification status/amount/currency mismatch', providerVerifiedStatus: verified.status, providerVerifiedAmount: verified.amount, updatedAt: new Date() } });
      return redirect('review');
    }
    // Claim/re-enter settlement idempotently; unique source keys and booking payment IDs protect retries.
    await db.collection('onlinePayments').updateOne({ _id: payment._id, status: { $in: ['creating', 'pending', 'settling', 'reconciliation_required'] } }, { $set: { status: 'settling', providerTransactionId: providerPaymentId, providerTrxId: verified.transactionId, providerVerifiedStatus: verified.status, updatedAt: new Date() } });
    try {
      const bookingId = new ObjectId(payment.bookingId);
      const booking = await db.collection('bookings').findOne({ _id: bookingId });
      if (!booking) throw new Error('Booking missing during bKash settlement');
      const sourceKey = `online-payment:${payment.paymentId}`;
      await db.collection('financeEntries').updateOne({ sourceKey }, { $setOnInsert: { type: 'income', category: 'Service payment', amount: payment.amount, note: `${payment.ticketId} · bKash online payment · ${verified.transactionId}`, date: new Date(), createdAt: new Date(), createdBy: 'bkash-verified-callback', sourceType: 'online-payment', sourceId: bookingId.toString(), sourceKey, bookingId: bookingId.toString(), ticketId: booking.ticketId, paymentMethod: 'online', provider: 'bkash', providerTransactionId: verified.transactionId } }, { upsert: true });
      const updatedBooking = await db.collection('bookings').updateOne({ _id: bookingId, 'payments.paymentId': { $ne: payment.paymentId } }, { $push: { payments: { paymentId: payment.paymentId, amount: payment.amount, method: 'online', reference: verified.transactionId, provider: 'bkash', receivedAt: new Date(), receivedBy: 'verified-bkash-callback' } }, $inc: { paymentAmount: payment.amount }, $set: { updatedAt: new Date() } });
      const current = await db.collection('bookings').findOne({ _id: bookingId }, { projection: { paymentAmount: 1, totalAmount: 1, quotedAmount: 1, phone: 1, ticketId: 1 } });
      const expected = money(current.totalAmount || current.quotedAmount || 0);
      const paid = money(current.paymentAmount || 0);
      await db.collection('bookings').updateOne({ _id: bookingId }, { $set: { paymentStatus: expected > 0 && paid >= expected ? 'paid' : 'partial', updatedAt: new Date() } });
      await db.collection('onlinePayments').updateOne({ _id: payment._id, status: 'settling' }, { $set: { status: 'paid', verifiedAt: new Date(), providerTransactionId: providerPaymentId, providerTrxId: verified.transactionId, updatedAt: new Date() }, $unset: { reconciliationReason: '' } });
      if (current?.phone) await Promise.all([notifySmsSafely({ to: current.phone, message: `MU Home Service: ${current.ticketId} বুকিংয়ের ৳${money(payment.amount).toFixed(2)} bKash পেমেন্ট নিশ্চিত হয়েছে।`, context: 'bkash-payment-success' }), notifyWhatsAppSafely({ to: current.phone, message: `MU Home Service: ${current.ticketId} বুকিংয়ের ৳${money(payment.amount).toFixed(2)} bKash পেমেন্ট নিশ্চিত হয়েছে।`, context: 'bkash-payment-success' })]);
      return redirect('success');
    } catch (error) {
      await db.collection('onlinePayments').updateOne({ _id: payment._id }, { $set: { status: 'reconciliation_required', reconciliationReason: String(error.message).slice(0, 300), updatedAt: new Date() } });
      console.error('bKash settlement needs reconciliation:', payment.paymentId, String(error.message).slice(0, 200));
      return redirect('review');
    }
  } catch (error) {
    console.error('bKash callback verification failed:', String(error.message).slice(0, 200));
    return redirect('review');
  }
});

// Generic provider contract: POST JSON webhook signed as HMAC-SHA256(raw body) in x-mu-payment-signature.
router.post('/payments/webhook', async (req, res, next) => {
  try {
    if (!verifyPaymentSignature(req.rawBody, req.get('x-mu-payment-signature'))) return res.status(401).json({ message: 'Invalid payment signature' });
    const payload = req.body || {};
    const paymentId = String(payload.orderId || '').slice(0, 100);
    const providerTransactionId = String(payload.transactionId || '').slice(0, 200);
    const status = String(payload.status || '').toLowerCase();
    const amount = money(payload.amount);
    const currency = String(payload.currency || '').toUpperCase();
    if (!paymentId || !providerTransactionId || !['paid', 'success', 'successful', 'completed', 'failed', 'cancelled'].includes(status) || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Invalid webhook payload' });
    const db = getDB();
    const payment = await db.collection('onlinePayments').findOne({ paymentId });
    if (!payment) return res.status(404).json({ message: 'Payment order not found' });
    if (payment.providerTransactionId && payment.providerTransactionId !== providerTransactionId) return res.status(409).json({ message: 'Transaction ID mismatch' });
    if (payment.amount !== amount || payment.currency !== currency) return res.status(409).json({ message: 'Payment amount or currency mismatch' });
    if (['failed', 'cancelled'].includes(payment.status) || (payment.status === 'paid' && !payment.reconciliationReason)) return res.json({ received: true, duplicate: true, status: payment.status });
    const isSuccess = ['paid', 'success', 'successful', 'completed'].includes(status);
    const result = await db.collection('onlinePayments').updateOne({ _id: payment._id, status: { $in: ['pending', 'creating', 'reconciliation_required'] } }, { $set: { status: isSuccess ? 'paid' : (status === 'cancelled' ? 'cancelled' : 'failed'), providerTransactionId, providerPayloadStatus: status, verifiedAt: new Date(), updatedAt: new Date() }, $unset: { reconciliationReason: '' } });
    if (!result.modifiedCount) return res.json({ received: true, duplicate: true });
    if (isSuccess) {
      const bookingId = new ObjectId(payment.bookingId);
      const booking = await db.collection('bookings').findOne({ _id: bookingId });
      if (!booking) {
        await db.collection('onlinePayments').updateOne({ _id: payment._id }, { $set: { status: 'reconciliation_required', reconciliationReason: 'Booking missing' } });
        return res.status(202).json({ received: true, reconciliationRequired: true });
      }
      const entry = { type: 'income', category: 'Service payment', amount, note: `${payment.ticketId} · Online payment · ${providerTransactionId}`, date: new Date(), createdAt: new Date(), createdBy: 'payment-webhook', sourceType: 'online-payment', sourceId: booking._id.toString(), sourceKey: `online-payment:${payment.paymentId}`, bookingId: booking._id.toString(), ticketId: booking.ticketId, paymentMethod: 'online', providerTransactionId };
      try {
        await db.collection('financeEntries').updateOne({ sourceKey: entry.sourceKey }, { $setOnInsert: entry }, { upsert: true });
        const current = await db.collection('bookings').findOne({ _id: bookingId });
        const already = (current.payments || []).some(p => p.paymentId === payment.paymentId);
        if (!already) {
          const totalPaid = money(Number(current.paymentAmount || 0) + amount);
          const expectedTotal = Number(current.totalAmount || current.quotedAmount || 0);
          await db.collection('bookings').updateOne({ _id: bookingId, 'payments.paymentId': { $ne: payment.paymentId } }, { $push: { payments: { paymentId: payment.paymentId, amount, method: 'online', reference: providerTransactionId, receivedAt: new Date(), receivedBy: 'verified-payment-webhook' } }, $inc: { paymentAmount: amount }, $set: { paymentStatus: expectedTotal > 0 && totalPaid >= expectedTotal ? 'paid' : 'partial', updatedAt: new Date() } });
        }
      } catch (e) {
        await db.collection('onlinePayments').updateOne({ _id: payment._id }, { $set: { status: 'reconciliation_required', reconciliationReason: String(e.message).slice(0, 300) } });
        console.error('Payment settlement needs reconciliation:', payment.paymentId, e.message);
        return res.status(202).json({ received: true, reconciliationRequired: true });
      }
    }
    if (isSuccess) { const settledBooking = await db.collection('bookings').findOne({ _id: new ObjectId(payment.bookingId) }, { projection: { phone:1, ticketId:1 } }); if (settledBooking) await notifySmsSafely({ to: settledBooking.phone, message: `MU Home Service: ${settledBooking.ticketId} বুকিংয়ের ৳${amount.toFixed(2)} অনলাইন পেমেন্ট নিশ্চিত হয়েছে।`, context: 'payment-success' }); }
    res.json({ received: true, status: isSuccess ? 'paid' : status });
  } catch (e) { next(e); }
});

export default router;
