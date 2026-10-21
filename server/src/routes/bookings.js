import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getDB } from '../db.js';
import { services, packages } from '../data.js';
import { ObjectId } from 'mongodb';
import { requireAdmin, requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const statuses = ['New', 'Contacted', 'Assigned', 'On the way', 'Inspection', 'Quotation sent', 'Approved', 'In progress', 'Completed', 'Cancelled'];

router.post('/bookings', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.user.sub)) return res.status(401).json({ message: 'অ্যাকাউন্ট যাচাই করা যায়নি। আবার লগইন করুন।' });
    const account = await getDB().collection('users').findOne({ _id: new ObjectId(req.user.sub), role: 'customer' });
    if (!account) return res.status(403).json({ message: 'শুধু Customer/Client অ্যাকাউন্ট থেকে বুকিং করা যাবে।' });
    const name = String(account.name || '').trim();
    const phone = String(account.phone || '').trim();
    const serviceId = String(req.body.serviceId || '').trim();
    const address = String(req.body.address || '').trim();
    const problem = String(req.body.problem || '').trim();
    if (name.length < 2 || !/^\+?[0-9\s()-]{8,18}$/.test(phone) || !serviceId || address.length < 5 || problem.length < 5) {
      return res.status(400).json({ message: 'নাম, সঠিক ফোন নম্বর, সার্ভিস, ঠিকানা ও সমস্যার বিবরণ দিন।' });
    }
    const savedServices=await getDB().collection('siteContent').findOne({_id:'services'}); const savedPackages=await getDB().collection('siteContent').findOne({_id:'packages'}); const currentServices=savedServices?.items||services; const currentPackages=savedPackages?.items||packages;
    if (!currentServices.some(s => s.id === serviceId) && !currentPackages.some(p => p.id === serviceId)) return res.status(400).json({ message: 'Invalid service selection' });
    const userId = account._id.toString();
    const booking = {
      ticketId: `MU-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`,
      name, phone, email: String(account.email || '').trim().slice(0, 120),
      serviceId, serviceName: currentServices.find(s => s.id === serviceId)?.name || currentPackages.find(p => p.id === serviceId)?.name, userId,
      address, area: String(req.body.area || 'Maijdee').trim(), preferredDate: String(req.body.preferredDate || ''),
      preferredTime: String(req.body.preferredTime || 'যেকোনো সময়'), problem, status: 'New',
      adminNote: '', createdAt: new Date(), updatedAt: new Date()
    };
    await getDB().collection('bookings').insertOne(booking);
    res.status(201).json({ message: 'আপনার বুকিং গ্রহণ করা হয়েছে। আমরা ফোন করে নিশ্চিত করব।', ticketId: booking.ticketId });
  } catch (err) { next(err); }
});


router.get('/tracking/:ticketId', async (req, res, next) => {
  try {
    const ticketId = String(req.params.ticketId || '').trim().slice(0, 60);
    if (!ticketId) return res.status(400).json({ message: 'Ticket ID দিন।' });
    const b = await getDB().collection('bookings').findOne({ ticketId }, { projection: { ticketId:1, serviceName:1, status:1, area:1, createdAt:1, updatedAt:1, preferredDate:1, preferredTime:1 } });
    if (!b) return res.status(404).json({ message: 'এই Ticket ID পাওয়া যায়নি।' });
    res.json({ booking: b });
  } catch (err) { next(err); }
});

router.get('/admin/bookings', requireAdmin, async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status && statuses.includes(status)) filter.status = status;
    if (q) filter.$or = ['name', 'phone', 'ticketId', 'serviceName'].map(k => ({ [k]: { $regex: String(q).slice(0, 80), $options: 'i' } }));
    const bookings = await getDB().collection('bookings').find(filter).sort({ createdAt: -1 }).limit(300).toArray();
    res.json({ bookings, statuses });
  } catch (err) { next(err); }
});

router.patch('/admin/bookings/:id/status', requireAdmin, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const status = String(req.body.status || '');
    if (!statuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const result = await getDB().collection('bookings').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status, adminNote: String(req.body.adminNote || '').slice(0, 1000), updatedAt: new Date() } });
    if (!result.matchedCount) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking updated' });
  } catch (err) { next(err); }
});



router.get('/bookings/assignable-technicians', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      const staff = await getDB().collection('users').findOne({ _id: new ObjectId(req.user.sub), role: 'staff', accountStatus: 'approved' });
      if (!staff || !(staff.permissions || []).includes('assignTechnicians')) return res.status(403).json({ message: 'টেকনিশিয়ান assign করার অনুমতি নেই।' });
    }
    const technicians = await getDB().collection('users').find({ role: 'technician', technicianStatus: 'approved', accountStatus: 'approved' }, { projection: { name: 1, phone: 1, email: 1 } }).sort({ name: 1 }).toArray();
    res.json({ technicians });
  } catch (err) { next(err); }
});

// Assign one or more approved technicians to a booking. Admins can always assign;
// approved staff need the explicit bookings:assign permission.
router.patch('/bookings/:id/technicians', requireAuth, async (req, res, next) => {
  try {
    const db = getDB();
    if (req.user.role !== 'admin') {
      const staff = await db.collection('users').findOne({ _id: new ObjectId(req.user.sub), role: 'staff', accountStatus: 'approved' });
      if (!staff || !(staff.permissions || []).includes('assignTechnicians')) return res.status(403).json({ message: 'টেকনিশিয়ান assign করার অনুমতি নেই।' });
    }
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const ids = [...new Set((Array.isArray(req.body.technicianIds) ? req.body.technicianIds : []).map(String))];
    if (ids.some(id => !ObjectId.isValid(id))) return res.status(400).json({ message: 'Invalid technician ID' });
    const technicians = ids.length ? await db.collection('users').find({ _id: { $in: ids.map(id => new ObjectId(id)) }, role: 'technician', technicianStatus: 'approved', accountStatus: 'approved' }, { projection: { name: 1, email: 1 } }).toArray() : [];
    if (technicians.length !== ids.length) return res.status(400).json({ message: 'শুধু অনুমোদিত Technician assign করা যাবে।' });
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const result = await db.collection('bookings').updateOne({ _id: booking._id }, { $set: { technicianIds: ids, technicianId: ids[0] || null, status: ids.length ? 'Assigned' : booking.status, updatedAt: new Date() } });
    res.json({ message: 'Technician assignment updated', technicianIds: ids });
  } catch (err) { next(err); }
});


// Technician-only work queue and status transitions. Ownership is always checked on the server.
router.patch('/technician/bookings/:id/status', requireAuth, requireRole('technician'), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const db = getDB();
    const technician = await db.collection('users').findOne({ _id: new ObjectId(req.user.sub), role: 'technician', accountStatus: 'approved', technicianStatus: 'approved' });
    if (!technician) return res.status(403).json({ message: 'অনুমোদিত Technician অ্যাকাউন্ট প্রয়োজন।' });
    const nextStatus = String(req.body.status || '');
    const transitions = { 'Assigned': 'On the way', 'On the way': 'Inspection', 'Inspection': 'In progress', 'In progress': 'Completed' };
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id), $or: [{ technicianId: req.user.sub }, { technicianIds: req.user.sub }] });
    if (!booking) return res.status(404).json({ message: 'এই Booking আপনার নামে assign করা নেই।' });
    if (transitions[booking.status] !== nextStatus) return res.status(409).json({ message: `এই ধাপে ${booking.status} থেকে ${transitions[booking.status] || 'পরবর্তী কোনো Status'} করা যাবে।` });
    const now = new Date();
    const result = await db.collection('bookings').updateOne({ _id: booking._id, status: booking.status, $or: [{ technicianId: req.user.sub }, { technicianIds: req.user.sub }] }, { $set: { status: nextStatus, updatedAt: now, [`statusTimestamps.${nextStatus.replace(/[^a-zA-Z0-9]/g, '_')}`]: now }, $push: { statusHistory: { status: nextStatus, at: now, by: req.user.sub, byRole: 'technician' } } });
    if (!result.modifiedCount) return res.status(409).json({ message: 'Booking Status পরিবর্তিত হয়েছে। Refresh করে আবার চেষ্টা করুন।' });
    res.json({ message: 'কাজের Status আপডেট হয়েছে।', status: nextStatus });
  } catch (err) { next(err); }
});

router.delete('/admin/bookings/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const result = await getDB().collection('bookings').deleteOne({ _id: new ObjectId(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ message: 'Booking not found' });
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) { next(err); }
});

router.get('/admin/stats', requireAdmin, async (_req, res, next) => {
  try {
    const col = getDB().collection('bookings');
    const [total, fresh, progress, completed] = await Promise.all([
      col.countDocuments(), col.countDocuments({ status: 'New' }),
      col.countDocuments({ status: { $in: ['Assigned', 'On the way', 'Inspection', 'Quotation sent', 'Approved', 'In progress'] } }),
      col.countDocuments({ status: 'Completed' })
    ]);
    res.json({ total, fresh, progress, completed });
  } catch (err) { next(err); }
});
export { statuses };
export default router;
