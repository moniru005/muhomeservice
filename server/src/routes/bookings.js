import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { getDB } from '../db.js';
import { services, packages } from '../data.js';
import { ObjectId } from 'mongodb';
import { requireAdmin, requireAuth, requireRole } from '../middleware/auth.js';
import { requirePermission, getRolePermissions } from '../middleware/permissions.js';
import { notifySmsSafely, notifyWhatsAppSafely } from '../services/integrations.js';

const router = Router();
const statuses = ['New', 'Contacted', 'Assigned', 'On the way', 'Inspection', 'Quotation sent', 'Quotation rejected', 'Approved', 'In progress', 'Completed', 'Cancelled'];

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
      fulfilmentType: currentServices.find(s => s.id === serviceId)?.fulfilment || 'inhouse', partnerId: null, partnerStatus: 'not_dispatched',
      address, area: String(req.body.area || 'Maijdee').trim(), preferredDate: String(req.body.preferredDate || ''),
      preferredTime: String(req.body.preferredTime || 'যেকোনো সময়'), problem, status: 'New',
      adminNote: '', createdAt: new Date(), updatedAt: new Date()
    };
    const insertedBooking = await getDB().collection('bookings').insertOne(booking);
    await Promise.all([notifySmsSafely({ to: phone, message: `MU Home Service: আপনার বুকিং ${booking.ticketId} গ্রহণ করা হয়েছে। Status: New.`, context: 'booking-created' }), notifyWhatsAppSafely({ to: phone, message: `MU Home Service: আপনার বুকিং ${booking.ticketId} গ্রহণ করা হয়েছে। Status: New.`, context: 'booking-created' })]);
    res.status(201).json({ message: 'আপনার বুকিং গ্রহণ করা হয়েছে। আমরা ফোন করে নিশ্চিত করব।', ticketId: booking.ticketId, bookingId: insertedBooking.insertedId.toString() });
  } catch (err) { next(err); }
});


// Customer can only view/cancel their own bookings and see their own recorded payments.
router.get('/customer/bookings', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const col = getDB().collection('bookings');
    const filter = { userId: req.user.sub, deletedAt: { $exists: false } };
    const [bookings, total] = await Promise.all([col.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).project({ name:1, ticketId:1, serviceName:1, status:1, createdAt:1, preferredDate:1, preferredTime:1, paymentAmount:1, paymentStatus:1, payments:1, quotedAmount:1, totalAmount:1, partnerId:1 }).toArray(), col.countDocuments(filter)]);
    const partnerIds=[...new Set(bookings.map(b=>b.partnerId).filter(id=>ObjectId.isValid(id)))];
    const partners=partnerIds.length?await getDB().collection('users').find({_id:{$in:partnerIds.map(id=>new ObjectId(id))},role:'partner'}).project({name:1,accountStatus:1,'partnerProfile.businessName':1,'partnerProfile.partnerType':1,'partnerProfile.verificationToken':1,'partnerProfile.verificationTokenHash':1,'partnerProfile.documents':1,'partnerProfile.agreementAcceptance':1}).toArray():[];
    const byId=new Map(partners.map(p=>[p._id.toString(),p]));
    const enriched=bookings.map(b=>{const p=byId.get(String(b.partnerId||''));const verified=!!(p&&p.accountStatus==='approved'&&p.partnerProfile?.verificationToken&&p.partnerProfile?.verificationTokenHash&&p.partnerProfile?.agreementAcceptance?.version==='2026-10-v1'&&(p.partnerProfile?.documents||[]).some(d=>d.status==='approved'));return {...b,partnerVerification:p?{businessName:p.partnerProfile?.businessName||p.name,status:verified?'ACTIVE':p.accountStatus==='suspended'?'SUSPENDED':'INACTIVE',verificationUrl:verified?`/partner/verify/${p.partnerProfile.verificationToken}`:null}:null};});
    res.json({ bookings:enriched, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total/limit)) } });
  } catch (e) { next(e); }
});
router.patch('/customer/bookings/:id/cancel', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const col = getDB().collection('bookings');
    const result = await col.updateOne({ _id: new ObjectId(req.params.id), userId: req.user.sub, status: { $in: ['New', 'Contacted'] } }, { $set: { status: 'Cancelled', cancelledAt: new Date(), cancelledBy: req.user.sub, updatedAt: new Date() }, $push: { statusHistory: { status: 'Cancelled', at: new Date(), by: req.user.sub, byRole: 'customer' } } });
    if (!result.modifiedCount) {
      const own = await col.findOne({ _id: new ObjectId(req.params.id), userId: req.user.sub }, { projection: { status:1 } });
      if (!own) return res.status(404).json({ message: 'Booking not found' });
      return res.status(409).json({ message: 'এই Booking আর Customer নিজে বাতিল করতে পারবেন না। Staff/Admin-এর সঙ্গে যোগাযোগ করুন।' });
    }
    res.json({ message: 'Booking cancelled successfully', status: 'Cancelled' });
  } catch (e) { next(e); }
});
router.patch('/customer/bookings/:id/reschedule', requireAuth, requireRole('customer'), async (req,res,next)=>{
  try {
    const id=ObjectId.isValid(req.params.id)?new ObjectId(req.params.id):null; if(!id)return res.status(400).json({message:'Invalid booking ID'});
    const preferredDate=String(req.body.preferredDate||'').trim(), preferredTime=String(req.body.preferredTime||'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)||!preferredTime||preferredTime.length>80)return res.status(400).json({message:'সঠিক নতুন তারিখ ও সময় দিন।'});
    const today=new Date();today.setHours(0,0,0,0);const date=new Date(`${preferredDate}T00:00:00`);if(Number.isNaN(date.getTime())||date<today)return res.status(400).json({message:'আগের তারিখে reschedule করা যাবে না।'});
    const col=getDB().collection('bookings');const b=await col.findOne({_id:id,userId:req.user.sub,deletedAt:{$exists:false}});if(!b)return res.status(404).json({message:'Booking not found'});
    if(!['New','Contacted'].includes(b.status))return res.status(409).json({message:'শুধু New/Contacted Booking Customer নিজে reschedule করতে পারবেন।'});
    const now=new Date();const r=await col.updateOne({_id:id,userId:req.user.sub,status:b.status},{$set:{preferredDate,preferredTime,rescheduleRequestedAt:now,updatedAt:now},$push:{statusHistory:{status:b.status,at:now,by:req.user.sub,byRole:'customer',note:`Reschedule requested: ${preferredDate} ${preferredTime}`}}});if(!r.modifiedCount)return res.status(409).json({message:'Booking পরিবর্তিত হয়েছে; refresh করে আবার চেষ্টা করুন।'});
    await Promise.all([notifySmsSafely({to:b.phone,message:`MU Home Service: ${b.ticketId} বুকিংয়ের নতুন সময়ের অনুরোধ: ${preferredDate}, ${preferredTime}.`,context:'booking-reschedule'}),notifyWhatsAppSafely({to:b.phone,message:`MU Home Service: ${b.ticketId} বুকিংয়ের নতুন সময়ের অনুরোধ: ${preferredDate}, ${preferredTime}.`,context:'booking-reschedule'}),getDB().collection('notifications').insertOne({recipientRole:'staff',type:'booking-reschedule',title:'Booking Reschedule Request',message:`${b.ticketId}: ${preferredDate} ${preferredTime}`,bookingId:id.toString(),createdAt:now,read:false})]);
    res.json({message:'নতুন তারিখ ও সময়ের অনুরোধ জমা হয়েছে। টিম নিশ্চিত করলে আপনাকে জানানো হবে।',preferredDate,preferredTime});
  }catch(e){next(e)}
});

router.get('/customer/payments', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const bookings = await getDB().collection('bookings').find({ userId: req.user.sub, deletedAt: { $exists: false } }).project({ ticketId:1, serviceName:1, payments:1, paymentAmount:1, paymentStatus:1, quotedAmount:1, totalAmount:1, createdAt:1 }).sort({ createdAt:-1 }).limit(500).toArray();
    const payments = bookings.flatMap(b => (b.payments || []).map(p => ({ ...p, ticketId: b.ticketId, serviceName: b.serviceName, bookingId: b._id, paymentStatus: b.paymentStatus || 'unpaid' })));
    res.json({ payments, bookings: bookings.map(b => ({ _id:b._id, ticketId:b.ticketId, serviceName:b.serviceName, paidAmount:Number(b.paymentAmount || (b.payments || []).reduce((n,p)=>n+Number(p.amount||0),0)), expectedAmount:Number(b.totalAmount || b.quotedAmount || 0), paymentStatus:b.paymentStatus || 'unpaid' })) });
  } catch (e) { next(e); }
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
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const filter = req.query.includeDeleted === 'true' ? {} : { deletedAt: { $exists: false } };
    if (status && statuses.includes(status)) filter.status = status;
    if (q) filter.$or = ['name', 'phone', 'ticketId', 'serviceName'].map(k => ({ [k]: { $regex: String(q).slice(0, 80), $options: 'i' } }));
    const col = getDB().collection('bookings');
    const [bookings, total] = await Promise.all([col.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(), col.countDocuments(filter)]);
    res.json({ bookings, statuses, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
  } catch (err) { next(err); }
});

router.patch('/admin/bookings/:id/status', requireAdmin, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const status = String(req.body.status || '');
    if (!statuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const result = await getDB().collection('bookings').updateOne({ _id: new ObjectId(req.params.id) }, { $set: { status, adminNote: String(req.body.adminNote || '').slice(0, 1000), updatedAt: new Date() } });
    if (!result.matchedCount) return res.status(404).json({ message: 'Booking not found' });
    const updatedBooking = await getDB().collection('bookings').findOne({ _id: new ObjectId(req.params.id) }, { projection: { phone:1, ticketId:1, status:1 } });
    if (updatedBooking) await Promise.all([notifySmsSafely({ to: updatedBooking.phone, message: `MU Home Service: বুকিং ${updatedBooking.ticketId}-এর নতুন Status: ${status}.`, context: 'booking-status' }), notifyWhatsAppSafely({ to: updatedBooking.phone, message: `MU Home Service: বুকিং ${updatedBooking.ticketId}-এর নতুন Status: ${status}.`, context: 'booking-status' })]);
    res.json({ message: 'Booking updated' });
  } catch (err) { next(err); }
});



router.patch('/bookings/:id/status', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'staff') {
      if (!ObjectId.isValid(req.user.sub)) return res.status(403).json({ message: 'Booking status পরিবর্তনের অনুমতি নেই।' });
      const staff = await getDB().collection('users').findOne({ _id: new ObjectId(req.user.sub), role:'staff', accountStatus:'approved' });
      if (!staff) return res.status(403).json({ message: 'Approved staff account required' });
      const { getRolePermissions } = await import('../middleware/permissions.js');
      const perms = await getRolePermissions('staff');
      if (!(staff.permissions || []).includes('manageBookings') && !(perms.bookings || []).some(a => ['*','update','status'].includes(a))) return res.status(403).json({ message: 'Role Permission Manager অনুযায়ী Booking status পরিবর্তনের অনুমতি নেই।' });
    } else if (req.user.role !== 'admin') return res.status(403).json({ message: 'Booking status পরিবর্তনের অনুমতি নেই।' });
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message:'Invalid booking ID' });
    const status = String(req.body.status || '');
    if (!statuses.includes(status)) return res.status(400).json({ message:'Invalid status' });
    const col = getDB().collection('bookings');
    const current = await col.findOne({ _id:new ObjectId(req.params.id), deletedAt: { $exists:false } });
    if (!current) return res.status(404).json({ message:'Booking not found' });
    if (status === 'Completed' && current.fulfilmentType !== 'inhouse' && current.partnerWorkStatus !== 'completed') return res.status(409).json({ message:'Partner কাজ Customer OTP যাচাই ছাড়া Completed করা যাবে না।' });
    const now = new Date();
    const result = await col.updateOne({ _id:new ObjectId(req.params.id), status:current.status, deletedAt: { $exists:false } }, { $set:{ status, updatedAt:now, ...(req.body.adminNote !== undefined ? { adminNote:String(req.body.adminNote).slice(0,1000) } : {}) }, $push:{ statusHistory:{ status, at:now, by:req.user.sub, byRole:req.user.role, adminOverride:status === 'Completed' } } });
    if (!result.matchedCount) return res.status(404).json({ message:'Booking not found' });
    const updatedBooking = await getDB().collection('bookings').findOne({ _id:new ObjectId(req.params.id) }, { projection:{ phone:1, ticketId:1 } });
    if (updatedBooking) await Promise.all([notifySmsSafely({ to: updatedBooking.phone, message: `MU Home Service: বুকিং ${updatedBooking.ticketId}-এর নতুন Status: ${status}.`, context: 'booking-status' }), notifyWhatsAppSafely({ to: updatedBooking.phone, message: `MU Home Service: বুকিং ${updatedBooking.ticketId}-এর নতুন Status: ${status}.`, context: 'booking-status' })]);
    res.json({ message:'Booking status updated', status });
  } catch(e) { next(e); }
});

router.get('/bookings/assignable-technicians', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      const staff = await getDB().collection('users').findOne({ _id: new ObjectId(req.user.sub), role: 'staff', accountStatus: 'approved' });
      const rp = await getRolePermissions('staff');
      if (!staff || (!(staff.permissions || []).includes('assignTechnicians') && !(rp.bookings || []).some(a => ['*','assign'].includes(a)))) return res.status(403).json({ message: 'Role Permission Manager অনুযায়ী Technician assign করার অনুমতি নেই।' });
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
      const rp = await getRolePermissions('staff');
      if (!staff || (!(staff.permissions || []).includes('assignTechnicians') && !(rp.bookings || []).some(a => ['*','assign'].includes(a)))) return res.status(403).json({ message: 'Role Permission Manager অনুযায়ী Technician assign করার অনুমতি নেই।' });
    }
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const ids = [...new Set((Array.isArray(req.body.technicianIds) ? req.body.technicianIds : []).map(String))];
    if (ids.some(id => !ObjectId.isValid(id))) return res.status(400).json({ message: 'Invalid technician ID' });
    const technicians = ids.length ? await db.collection('users').find({ _id: { $in: ids.map(id => new ObjectId(id)) }, role: 'technician', technicianStatus: 'approved', accountStatus: 'approved' }, { projection: { name: 1, email: 1 } }).toArray() : [];
    if (technicians.length !== ids.length) return res.status(400).json({ message: 'শুধু অনুমোদিত Technician assign করা যাবে।' });
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id) });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (['Completed', 'Cancelled'].includes(booking.status) && ids.length) return res.status(409).json({ message: `এই ${booking.status} booking-এ technician assign করা যাবে না।` });
    // Assignment must not reopen or regress a booking already in progress. Only intake states advance to Assigned.
    const nextStatus = ids.length && ['New', 'Contacted'].includes(booking.status) ? 'Assigned' : booking.status;
    const result = await db.collection('bookings').updateOne({ _id: booking._id, status: booking.status }, { $set: { technicianIds: ids, technicianId: ids[0] || null, status: nextStatus, updatedAt: new Date() }, $push: { statusHistory: { status: nextStatus, at: new Date(), by: req.user.sub, byRole: req.user.role, note: 'Technician assignment updated' } } });
    if (!result.modifiedCount) return res.status(409).json({ message: 'Booking changed during assignment; refresh and retry.' });
    res.json({ message: 'Technician assignment updated', technicianIds: ids, status: nextStatus });
  } catch (err) { next(err); }
});


// A technician may accept or decline only an assignment that is still awaiting a decision.
router.patch('/technician/bookings/:id/decision', requireAuth, requireRole('technician'), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message:'Invalid booking ID' });
    const decision = String(req.body.decision || '');
    if (!['accepted','rejected'].includes(decision)) return res.status(400).json({ message:'Decision must be accepted or rejected' });
    const db = getDB();
    const technician = await db.collection('users').findOne({ _id:new ObjectId(req.user.sub), role:'technician', accountStatus:'approved', technicianStatus:'approved' });
    if (!technician) return res.status(403).json({ message:'Approved Technician account required' });
    const booking = await db.collection('bookings').findOne({ _id:new ObjectId(req.params.id), $or:[{technicianId:req.user.sub},{technicianIds:req.user.sub}] });
    if (!booking) return res.status(404).json({ message:'এই Booking আপনার নামে assign করা নেই।' });
    const decisions = booking.technicianDecisions || {};
    if (decisions[req.user.sub]) return res.status(409).json({ message:'আপনি ইতিমধ্যে এই assignment-এর সিদ্ধান্ত দিয়েছেন।' });
    const set = { [`technicianDecisions.${req.user.sub}`]: { decision, at:new Date() }, updatedAt:new Date() };
    if (decision === 'rejected') {
      const remaining = (booking.technicianIds || [booking.technicianId].filter(Boolean)).filter(id => id !== req.user.sub);
      set.technicianIds = remaining; set.technicianId = remaining[0] || null;
      if (!remaining.length) set.status = 'New';
    }
    const update = await db.collection('bookings').updateOne({ _id:booking._id, [`technicianDecisions.${req.user.sub}`]: { $exists:false } }, { $set:set, $push:{ statusHistory:{ status:decision === 'accepted' ? 'Assigned' : 'Technician rejected', at:new Date(), by:req.user.sub, byRole:'technician' } } });
    if (!update.modifiedCount) return res.status(409).json({ message:'Booking decision already changed; refresh and try again.' });
    res.json({ message: decision === 'accepted' ? 'কাজটি গ্রহণ করেছেন।' : 'কাজটি প্রত্যাখ্যান করা হয়েছে; Admin/Staff পুনরায় assign করতে পারবেন।', decision });
  } catch(e) { next(e); }
});

// Technician-only work queue and status transitions. Ownership is always checked on the server.
router.patch('/technician/bookings/:id/status', requireAuth, requireRole('technician'), async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const db = getDB();
    const technician = await db.collection('users').findOne({ _id: new ObjectId(req.user.sub), role: 'technician', accountStatus: 'approved', technicianStatus: 'approved' });
    if (!technician) return res.status(403).json({ message: 'অনুমোদিত Technician অ্যাকাউন্ট প্রয়োজন।' });
    const nextStatus = String(req.body.status || '');
    const transitions = { 'Assigned': 'On the way', 'On the way': 'Inspection', 'Inspection': 'In progress' }; // Completion requires customer OTP endpoint.
    const booking = await db.collection('bookings').findOne({ _id: new ObjectId(req.params.id), $or: [{ technicianId: req.user.sub }, { technicianIds: req.user.sub }] });
    if (!booking) return res.status(404).json({ message: 'এই Booking আপনার নামে assign করা নেই।' });
    if (transitions[booking.status] !== nextStatus) return res.status(409).json({ message: `এই ধাপে ${booking.status} থেকে ${transitions[booking.status] || 'পরবর্তী কোনো Status'} করা যাবে।` });
    const now = new Date();
    const result = await db.collection('bookings').updateOne({ _id: booking._id, status: booking.status, $or: [{ technicianId: req.user.sub }, { technicianIds: req.user.sub }] }, { $set: { status: nextStatus, updatedAt: now, [`statusTimestamps.${nextStatus.replace(/[^a-zA-Z0-9]/g, '_')}`]: now }, $push: { statusHistory: { status: nextStatus, at: now, by: req.user.sub, byRole: 'technician' } } });
    if (!result.modifiedCount) return res.status(409).json({ message: 'Booking Status পরিবর্তিত হয়েছে। Refresh করে আবার চেষ্টা করুন।' });
    await notifySmsSafely({ to: booking.phone, message: `MU Home Service: বুকিং ${booking.ticketId}-এর নতুন Status: ${nextStatus}.`, context: 'technician-status' });
    res.json({ message: 'কাজের Status আপডেট হয়েছে।', status: nextStatus });
  } catch (err) { next(err); }
});

router.delete('/admin/bookings/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid booking ID' });
    const db = getDB();
    const id = new ObjectId(req.params.id);
    const booking = await db.collection('bookings').findOne({ _id: id, deletedAt: { $exists: false } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const [paymentCount, financeCount, refundCount] = await Promise.all([
      db.collection('onlinePayments').countDocuments({ bookingId: id.toString() }),
      db.collection('financeEntries').countDocuments({ bookingId: id.toString() }),
      db.collection('refunds').countDocuments({ bookingId: id.toString() })
    ]);
    // Never hard-delete bookings with financial relationships. Keep the original ID so invoices,
    // refunds, payment reconciliation and audit trails remain connected.
    await db.collection('bookings').updateOne({ _id: id, deletedAt: { $exists: false } }, { $set: { deletedAt: new Date(), deletedBy: req.user.sub, deletionReason: String(req.body?.reason || 'Admin archived booking').slice(0, 500), financialRelationshipsPreserved: true, updatedAt: new Date() } });
    res.json({ message: 'Booking archived; financial records and references were preserved.', archived: true, financialReferences: { onlinePayments: paymentCount, financeEntries: financeCount, refunds: refundCount } });
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
