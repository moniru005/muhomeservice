import { Router } from 'express';
import { randomUUID, randomInt, createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDB } from '../db.js';
import { requireAuth, requireAdmin, requireRole } from '../middleware/auth.js';
import { getRolePermissions } from '../middleware/permissions.js';
import { notifySmsSafely, notifyWhatsAppSafely, executeProviderRefund } from '../services/integrations.js';

const router = Router();
const db = () => getDB();
const oid = (id) => ObjectId.isValid(String(id || '')) ? new ObjectId(String(id)) : null;
const clean = (v, max=500) => String(v ?? '').trim().slice(0,max);
const permitted = async (req, resource, actions) => {
  if (req.user.role === 'admin') return true;
  if (req.user.role !== 'staff') return false;
  const staff = await db().collection('users').findOne({ _id: oid(req.user.sub), role:'staff', accountStatus:'approved' });
  const p = await getRolePermissions('staff');
  return Boolean(staff && (p[resource] || []).some(x => x === '*' || actions.includes(x)));
};
const uploadDir = fileURLToPath(new URL('../../uploads/booking-attachments/', import.meta.url));
fs.mkdirSync(uploadDir, { recursive:true });
const upload = multer({ storage:multer.diskStorage({ destination:(_r,_f,cb)=>cb(null,uploadDir), filename:(req,file,cb)=>cb(null,`${req.user.sub}-${Date.now()}-${randomUUID().slice(0,8)}${path.extname(file.originalname).toLowerCase()}`) }), limits:{ fileSize:5*1024*1024, files:5 }, fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','application/pdf'].includes(file.mimetype)) });
const otpHash = (otp) => createHash('sha256').update(`${process.env.JWT_SECRET || 'mu-home-service'}:${otp}`).digest('hex');

// Customer booking evidence, invoice/receipt records, warranty and complaints.
router.post('/customer/bookings/:id/photos', requireAuth, requireRole('customer'), upload.array('photos',5), async (req,res,next)=>{
  try { const id=oid(req.params.id); if(!id) return res.status(400).json({message:'Invalid booking ID'});
    const b=await db().collection('bookings').findOne({_id:id,userId:req.user.sub}); if(!b) return res.status(404).json({message:'Booking not found'});
    const files=(req.files||[]).map(f=>({url:`/api/uploads/booking-attachments/${f.filename}`,name:clean(f.originalname,180),mimeType:f.mimetype,size:f.size,uploadedAt:new Date(),uploadedBy:req.user.sub,kind:'customer-booking'}));
    await db().collection('bookings').updateOne({_id:id,userId:req.user.sub},{$push:{customerPhotos:{$each:files}},$set:{updatedAt:new Date()}});
    res.status(201).json({message:'Booking photos uploaded',photos:files});
  } catch(e){next(e)}
});
router.get('/customer/bookings/:id/invoice', requireAuth, async(req,res,next)=>{
  try { const id=oid(req.params.id); if(!id) return res.status(400).json({message:'Invalid booking ID'});
    const b=await db().collection('bookings').findOne({_id:id, ...(req.user.role==='admin'?{}:{userId:req.user.sub}), deletedAt:{$exists:false}});
    if(!b) return res.status(404).json({message:'Invoice not found'});
    const entries=await db().collection('financeEntries').find({bookingId:id.toString(),type:'income'}).sort({date:1}).toArray();
    res.json({invoice:{invoiceNo:`INV-${b.ticketId}`,ticketId:b.ticketId,customer:b.name,phone:b.phone,serviceName:b.serviceName,issuedAt:b.updatedAt||b.createdAt,items:b.invoiceItems||[{description:b.serviceName,quantity:1,unitPrice:Number(b.totalAmount??b.quotedAmount??0)}],total:Number(b.totalAmount??b.quotedAmount??0),paid:Number(b.paymentAmount||0),due:Math.max(0,Number(b.totalAmount??b.quotedAmount??0)-Number(b.paymentAmount||0)),payments:entries}});
  }catch(e){next(e)}
});
router.get('/customer/bookings/:id/receipt', requireAuth, async(req,res,next)=>{
  try { const id=oid(req.params.id); if(!id) return res.status(400).json({message:'Invalid booking ID'});
    const b=await db().collection('bookings').findOne({_id:id, ...(req.user.role==='admin'?{}:{userId:req.user.sub}), deletedAt:{$exists:false}}, {projection:{ticketId:1,serviceName:1,payments:1,paymentAmount:1,paymentStatus:1,name:1,createdAt:1}});
    if(!b) return res.status(404).json({message:'Receipt not found'});
    res.json({receipts:(b.payments||[]).map((p,i)=>({receiptNo:`RCT-${b.ticketId}-${i+1}`,ticketId:b.ticketId,serviceName:b.serviceName,customer:b.name,amount:Number(p.amount||0),method:p.method||'manual',reference:p.reference||'',paidAt:p.receivedAt||p.createdAt||b.createdAt,status:'recorded'}))});
  }catch(e){next(e)}
});
router.post('/customer/bookings/:id/warranty-claims', requireAuth, requireRole('customer'), async(req,res,next)=>{
  try { const id=oid(req.params.id); if(!id) return res.status(400).json({message:'Invalid booking ID'});
    const b=await db().collection('bookings').findOne({_id:id,userId:req.user.sub,status:'Completed',deletedAt:{$exists:false}}); if(!b) return res.status(404).json({message:'Completed booking not found'});
    const warrantyUntil=b.warrantyUntil?new Date(b.warrantyUntil):null; if(!warrantyUntil || warrantyUntil < new Date()) return res.status(409).json({message:'এই Booking-এর Warranty সক্রিয় নেই।'});
    const claim={claimId:randomUUID(),bookingId:id.toString(),ticketId:b.ticketId,userId:req.user.sub,type:'warranty',subject:clean(req.body.subject,160),description:clean(req.body.description,2500),status:'open',createdAt:new Date()};
    if(claim.subject.length<3||claim.description.length<10) return res.status(400).json({message:'Subject ও বিস্তারিত অভিযোগ লিখুন।'});
    await db().collection('serviceClaims').insertOne(claim); await db().collection('notifications').insertOne({recipientRole:'staff',type:'warranty-claim',title:'নতুন Warranty Claim',message:`${b.ticketId}: ${claim.subject}`,bookingId:id.toString(),createdAt:new Date(),read:false});
    res.status(201).json({message:'Warranty claim জমা হয়েছে',claimId:claim.claimId});
  }catch(e){next(e)}
});
router.post('/customer/bookings/:id/complaints', requireAuth, requireRole('customer'), async(req,res,next)=>{
  try { const id=oid(req.params.id); if(!id) return res.status(400).json({message:'Invalid booking ID'});
    const b=await db().collection('bookings').findOne({_id:id,userId:req.user.sub,deletedAt:{$exists:false}}); if(!b) return res.status(404).json({message:'Booking not found'});
    const claim={claimId:randomUUID(),bookingId:id.toString(),ticketId:b.ticketId,userId:req.user.sub,type:'complaint',subject:clean(req.body.subject,160),description:clean(req.body.description,2500),status:'open',createdAt:new Date()};
    if(claim.subject.length<3||claim.description.length<10) return res.status(400).json({message:'Subject ও বিস্তারিত অভিযোগ লিখুন।'});
    await db().collection('serviceClaims').insertOne(claim); await db().collection('notifications').insertOne({recipientRole:'staff',type:'customer-complaint',title:'নতুন Customer Complaint',message:`${b.ticketId}: ${claim.subject}`,bookingId:id.toString(),createdAt:new Date(),read:false});
    res.status(201).json({message:'অভিযোগ জমা হয়েছে',claimId:claim.claimId});
  }catch(e){next(e)}
});
router.get('/customer/claims', requireAuth, requireRole('customer'), async(req,res,next)=>{try{const claims=await db().collection('serviceClaims').find({userId:req.user.sub}).sort({createdAt:-1}).limit(100).toArray();res.json({claims})}catch(e){next(e)}});

// Customer confirms job completion using a short-lived one-time code.
router.post('/technician/bookings/:id/completion-otp', requireAuth, requireRole('technician'), async(req,res,next)=>{
  try {const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking ID'});const b=await db().collection('bookings').findOne({_id:id,$or:[{technicianId:req.user.sub},{technicianIds:req.user.sub}],status:'In progress'});if(!b)return res.status(404).json({message:'Active assigned booking not found'});
    const otp=String(randomInt(100000,1000000));const expiresAt=new Date(Date.now()+10*60*1000);await db().collection('bookings').updateOne({_id:id,status:'In progress'},{$set:{completionOtpHash:otpHash(otp),completionOtpExpiresAt:expiresAt,completionOtpRequestedAt:new Date()}});
    await Promise.all([notifySmsSafely({to:b.phone,message:`MU Home Service: ${b.ticketId} কাজ সম্পন্ন নিশ্চিত করতে Technician-কে এই OTP দিন: ${otp}। মেয়াদ ১০ মিনিট।`,context:'completion-otp'}),notifyWhatsAppSafely({to:b.phone,message:`MU Home Service: ${b.ticketId} কাজ সম্পন্ন নিশ্চিত করতে Technician-কে এই OTP দিন: ${otp}। মেয়াদ ১০ মিনিট।`,context:'completion-otp'})]);
    res.json({message:'Customer-কে OTP পাঠানো হয়েছে। OTP কাউকে শেয়ার না করে কাজ যাচাই করে তারপর Technician-কে দিন।',expiresAt});
  }catch(e){next(e)}
});
router.patch('/technician/bookings/:id/complete', requireAuth, requireRole('technician'), async(req,res,next)=>{
  try {const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking ID'});const otp=clean(req.body.otp,6);if(!/^\d{6}$/.test(otp))return res.status(400).json({message:'৬ সংখ্যার OTP দিন।'});
    const b=await db().collection('bookings').findOne({_id:id,$or:[{technicianId:req.user.sub},{technicianIds:req.user.sub}],status:'In progress'});if(!b)return res.status(404).json({message:'Active assigned booking not found'});
    if(!b.completionOtpHash||!b.completionOtpExpiresAt||new Date(b.completionOtpExpiresAt)<new Date()||otpHash(otp)!==b.completionOtpHash)return res.status(400).json({message:'OTP ভুল অথবা মেয়াদ শেষ হয়েছে।'});
    const now=new Date();const result=await db().collection('bookings').updateOne({_id:id,status:'In progress',completionOtpHash:b.completionOtpHash,completionOtpExpiresAt:{$gt:now}},{$set:{status:'Completed',completedAt:now,warrantyUntil:new Date(now.getTime()+Math.max(0,Number(process.env.DEFAULT_WARRANTY_DAYS||30))*86400000),updatedAt:now},$unset:{completionOtpHash:'',completionOtpExpiresAt:''},$push:{statusHistory:{status:'Completed',at:now,by:req.user.sub,byRole:'technician',completionVerified:true}}});if(!result.modifiedCount)return res.status(409).json({message:'Booking পরিবর্তিত হয়েছে; Refresh করুন।'});
    await notifySmsSafely({to:b.phone,message:`MU Home Service: ${b.ticketId} কাজ সম্পন্ন হয়েছে। ধন্যবাদ।`,context:'job-completed'});res.json({message:'OTP যাচাই হয়েছে; কাজ Completed করা হয়েছে।',status:'Completed'});
  }catch(e){next(e)}
});

// Technician skills/service areas are self-managed; commission is admin-managed only.
router.patch('/technician/profile/work-preferences', requireAuth, requireRole('technician'), async(req,res,next)=>{
 try{const areas=Array.isArray(req.body.areas)?[...new Set(req.body.areas.map(x=>clean(x,80)).filter(Boolean))].slice(0,30):[];const skills=Array.isArray(req.body.skills)?[...new Set(req.body.skills.map(x=>clean(x,100)).filter(Boolean))].slice(0,50):[];await db().collection('users').updateOne({_id:oid(req.user.sub),role:'technician'},{$set:{serviceAreas:areas,skills,updatedAt:new Date()}});res.json({message:'Work preferences updated',areas,skills})}catch(e){next(e)}
});
router.get('/technician/profile/work-preferences', requireAuth, requireRole('technician'), async(req,res,next)=>{try{const u=await db().collection('users').findOne({_id:oid(req.user.sub),role:'technician'},{projection:{serviceAreas:1,skills:1,commissionRate:1}});if(!u)return res.status(404).json({message:'Technician not found'});res.json({areas:u.serviceAreas||[],skills:u.skills||[],commissionRate:Number(u.commissionRate||0)})}catch(e){next(e)}});
router.patch('/admin/technicians/:id/commission', requireAdmin, async(req,res,next)=>{try{const id=oid(req.params.id);const rate=Number(req.body.commissionRate);if(!id||!Number.isFinite(rate)||rate<0||rate>100)return res.status(400).json({message:'Commission rate 0–100% হতে হবে।'});const result=await db().collection('users').updateOne({_id:id,role:'technician'},{$set:{commissionRate:rate,commissionRateUpdatedAt:new Date(),commissionRateUpdatedBy:req.user.sub}});if(!result.matchedCount)return res.status(404).json({message:'Technician not found'});res.json({message:'Commission rate updated',commissionRate:rate})}catch(e){next(e)}});
router.get('/admin/technicians/commission', requireAdmin, async(req,res,next)=>{try{const technicians=await db().collection('users').find({role:'technician'},{projection:{name:1,email:1,phone:1,commissionRate:1,serviceAreas:1,skills:1,accountStatus:1,technicianStatus:1}}).sort({name:1}).limit(500).toArray();res.json({technicians})}catch(e){next(e)}});

// Attendance and leave requests.
router.post('/technician/attendance', requireAuth, requireRole('technician'), async(req,res,next)=>{try{const action=clean(req.body.action,20);if(!['check-in','check-out'].includes(action))return res.status(400).json({message:'Invalid attendance action'});const today=new Date().toISOString().slice(0,10);const col=db().collection('technicianAttendance');const existing=await col.findOne({technicianId:req.user.sub,date:today});if(action==='check-in'){if(existing?.checkInAt)return res.status(409).json({message:'আজকের check-in ইতিমধ্যে হয়েছে।'});await col.updateOne({technicianId:req.user.sub,date:today},{$setOnInsert:{technicianId:req.user.sub,date:today,checkInAt:new Date(),status:'present'}},{upsert:true});}else{if(!existing?.checkInAt)return res.status(409).json({message:'আগে check-in করুন।'});if(existing.checkOutAt)return res.status(409).json({message:'আজকের check-out ইতিমধ্যে হয়েছে।'});await col.updateOne({_id:existing._id,checkOutAt:{$exists:false}},{$set:{checkOutAt:new Date()}});}res.json({message:action==='check-in'?'Attendance check-in হয়েছে':'Attendance check-out হয়েছে'})}catch(e){next(e)}});
router.get('/technician/attendance', requireAuth, requireRole('technician'), async(req,res,next)=>{try{const rows=await db().collection('technicianAttendance').find({technicianId:req.user.sub}).sort({date:-1}).limit(60).toArray();res.json({attendance:rows})}catch(e){next(e)}});
router.post('/technician/leave-requests', requireAuth, requireRole('technician'), async(req,res,next)=>{try{const start=clean(req.body.startDate,10),end=clean(req.body.endDate,10),reason=clean(req.body.reason,1000);if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<start||reason.length<5)return res.status(400).json({message:'সঠিক ছুটির তারিখ ও কারণ দিন।'});const request={requestId:randomUUID(),technicianId:req.user.sub,startDate:start,endDate:end,reason,status:'pending',createdAt:new Date()};await db().collection('technicianLeaveRequests').insertOne(request);await db().collection('notifications').insertOne({recipientRole:'admin',type:'leave-request',title:'Technician Leave Request',message:`${start} থেকে ${end}`,createdAt:new Date(),read:false});res.status(201).json({message:'ছুটির আবেদন জমা হয়েছে',request})}catch(e){next(e)}});
router.get('/technician/leave-requests', requireAuth, requireRole('technician'), async(req,res,next)=>{try{const requests=await db().collection('technicianLeaveRequests').find({technicianId:req.user.sub}).sort({createdAt:-1}).limit(100).toArray();res.json({requests})}catch(e){next(e)}});
router.get('/admin/technician-leave-requests', requireAdmin, async(req,res,next)=>{try{const requests=await db().collection('technicianLeaveRequests').find({}).sort({createdAt:-1}).limit(500).toArray();res.json({requests})}catch(e){next(e)}});
router.patch('/admin/technician-leave-requests/:id', requireAdmin, async(req,res,next)=>{try{const status=clean(req.body.status,20);if(!['approved','rejected'].includes(status))return res.status(400).json({message:'Invalid status'});const r=await db().collection('technicianLeaveRequests').updateOne({requestId:req.params.id,status:'pending'},{$set:{status,reviewedAt:new Date(),reviewedBy:req.user.sub}});if(!r.modifiedCount)return res.status(404).json({message:'Pending leave request not found'});res.json({message:`Leave request ${status}`})}catch(e){next(e)}});

// Customer directory, service-specific quotation templates, refunds.
router.get('/admin/customers', requireAuth, async(req,res,next)=>{try{if(!(await permitted(req,'customers',['read','*'])))return res.status(403).json({message:'Customer list permission required'});const q=clean(req.query.q,80);const filter={role:'customer'};if(q)filter.$or=['name','phone','email'].map(k=>({[k]:{$regex:q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'}}));const page=Math.max(1,parseInt(req.query.page,10)||1),limit=Math.min(100,Math.max(1,parseInt(req.query.limit,10)||25));const [customers,total]=await Promise.all([db().collection('users').find(filter,{projection:{passwordHash:0,password:0}}).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).toArray(),db().collection('users').countDocuments(filter)]);res.json({customers,pagination:{page,limit,total,pages:Math.max(1,Math.ceil(total/limit))}})}catch(e){next(e)}});
router.get('/quotation-templates', requireAuth, requireRole('staff','admin'), async(req,res,next)=>{try{if(!(await permitted(req,'quotations',['read','create','update'])))return res.status(403).json({message:'Quotation template permission required'});const filter={active:{$ne:false}};if(req.query.serviceId)filter.serviceId=clean(req.query.serviceId,120);const templates=await db().collection('quotationTemplates').find(filter).sort({serviceName:1,name:1}).limit(300).toArray();res.json({templates})}catch(e){next(e)}});
router.post('/quotation-templates', requireAuth, requireRole('staff','admin'), async(req,res,next)=>{try{if(!(await permitted(req,'quotations',['create','update'])))return res.status(403).json({message:'Quotation template permission required'});const name=clean(req.body.name,120),serviceId=clean(req.body.serviceId,120),serviceName=clean(req.body.serviceName,160);const items=Array.isArray(req.body.items)?req.body.items.slice(0,80).map(x=>({description:clean(x.description,250),quantity:Number(x.quantity||1),unitPrice:Number(x.unitPrice||0)})):[];if(name.length<2||!serviceId||!serviceName||!items.length||items.some(x=>!x.description||!Number.isFinite(x.quantity)||x.quantity<=0||!Number.isFinite(x.unitPrice)||x.unitPrice<0))return res.status(400).json({message:'Valid template name, service and line items required'});const t={templateId:randomUUID(),name,serviceId,serviceName,items,notes:clean(req.body.notes,2000),active:true,createdAt:new Date(),createdBy:req.user.sub,updatedAt:new Date()};await db().collection('quotationTemplates').insertOne(t);res.status(201).json({template:t})}catch(e){next(e)}});
router.patch('/quotation-templates/:id', requireAuth, requireRole('staff','admin'), async(req,res,next)=>{try{if(!(await permitted(req,'quotations',['update','create'])))return res.status(403).json({message:'Quotation template permission required'});const active=req.body.active;const result=await db().collection('quotationTemplates').updateOne({templateId:req.params.id},{$set:{...(typeof active==='boolean'?{active}:{}),updatedAt:new Date(),updatedBy:req.user.sub}});if(!result.matchedCount)return res.status(404).json({message:'Template not found'});res.json({message:'Template updated'})}catch(e){next(e)}});
router.post('/admin/refunds', requireAdmin, async(req,res,next)=>{try{const paymentId=clean(req.body.paymentId,100),amount=Number(req.body.amount),reason=clean(req.body.reason,1000);if(!paymentId||!Number.isFinite(amount)||amount<=0||reason.length<5)return res.status(400).json({message:'Payment ID, positive amount and reason required'});const online=await db().collection('onlinePayments').findOne({paymentId});const bookingId=online?.bookingId||clean(req.body.bookingId,100);const booking=oid(bookingId)?await db().collection('bookings').findOne({_id:oid(bookingId)}):null;if(!online&&!booking)return res.status(404).json({message:'Payment or booking not found'});const paid=online?Number(online.amount):Number((booking.payments||[]).reduce((n,p)=>n+Number(p.amount||0),0));const prior=await db().collection('refunds').aggregate([{$match:{paymentId,status:{$nin:['rejected']} }},{$group:{_id:null,total:{$sum:'$amount'}}}]).toArray();const alreadyRefunded=Number(prior[0]?.total||0);if(amount>Math.max(0,paid-alreadyRefunded))return res.status(409).json({message:'Refund amount exceeds the remaining refundable balance'});const refund={refundId:randomUUID(),paymentId,bookingId:String(bookingId),ticketId:online?.ticketId||booking?.ticketId,amount,reason,status:'requested',provider:online?.provider||'manual',createdAt:new Date(),createdBy:req.user.sub};await db().collection('refunds').insertOne(refund);res.status(201).json({message:'Refund request recorded. Provider refund must be processed and verified separately.',refund})}catch(e){next(e)}});
router.get('/admin/refunds', requireAdmin, async(req,res,next)=>{try{const refunds=await db().collection('refunds').find({}).sort({createdAt:-1}).limit(500).toArray();res.json({refunds})}catch(e){next(e)}});
router.post('/admin/refunds/:id/process', requireAdmin, async(req,res,next)=>{try{const refund=await db().collection('refunds').findOne({refundId:req.params.id,status:'approved'});if(!refund)return res.status(409).json({message:'Refund must be approved before processing'});const claimed=await db().collection('refunds').updateOne({refundId:refund.refundId,status:'approved'},{$set:{status:'processing',processingStartedAt:new Date(),processingBy:req.user.sub}});if(!claimed.modifiedCount)return res.status(409).json({message:'Refund processing already started'});try{const payment=await db().collection('onlinePayments').findOne({paymentId:refund.paymentId});if(!payment)throw new Error('Provider payment record not found. Manual reconciliation required.');const result=await executeProviderRefund({payment,refund});await db().collection('refunds').updateOne({refundId:refund.refundId,status:'processing'},{$set:{status:'processed',processedAt:new Date(),processedBy:req.user.sub,...result}});res.json({message:'Provider refund confirmed',refundId:refund.refundId,providerRefundReference:result.providerRefundReference})}catch(e){await db().collection('refunds').updateOne({refundId:refund.refundId,status:'processing'},{$set:{status:'reconciliation_required',reconciliationReason:String(e.message).slice(0,300),updatedAt:new Date()}});res.status(502).json({message:'Provider refund was not confirmed; request moved to reconciliation review.'})}}catch(e){next(e)}});
router.patch('/admin/refunds/:id', requireAdmin, async(req,res,next)=>{try{const status=clean(req.body.status,30);if(!['approved','rejected','reconciliation_required'].includes(status))return res.status(400).json({message:'Invalid refund status'});const r=await db().collection('refunds').updateOne({refundId:req.params.id,status:{$in:['requested','approved','reconciliation_required']}},{$set:{status,reviewedAt:new Date(),reviewedBy:req.user.sub,providerRefundReference:clean(req.body.providerRefundReference,160),reviewNote:clean(req.body.reviewNote,1000)}});if(!r.modifiedCount)return res.status(404).json({message:'Refund request not found or already finalized'});res.json({message:'Refund status updated. Ensure provider-side settlement is verified.'})}catch(e){next(e)}});
export default router;
