import { Router } from 'express';
import { getDB } from '../db.js';
const router = Router();
router.post('/', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const message = String(req.body.message || '').trim();
    if (name.length < 2 || !/^\+?[0-9\s()-]{8,18}$/.test(phone) || message.length < 5) return res.status(400).json({ message: 'নাম, ফোন নম্বর ও বার্তা সঠিকভাবে দিন।' });
    await getDB().collection('contacts').insertOne({ name, phone, email: String(req.body.email || '').trim(), message, createdAt: new Date() });
    res.status(201).json({ message: 'ধন্যবাদ। আপনার বার্তা গ্রহণ করা হয়েছে।' });
  } catch (err) { next(err); }
});
export default router;
