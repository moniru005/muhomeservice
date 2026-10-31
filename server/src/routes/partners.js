import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getRolePermissions } from '../middleware/permissions.js';
import { randomUUID, randomInt, randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { persistUploadedFile } from '../services/storage.js';

const router = Router();
const partnerEvidenceDir=fileURLToPath(new URL('../../uploads/partner-reports/',import.meta.url));
fs.mkdirSync(partnerEvidenceDir,{recursive:true});
const partnerEvidenceUpload=multer({storage:multer.diskStorage({destination:(_req,_file,cb)=>cb(null,partnerEvidenceDir),filename:(req,file,cb)=>cb(null,`${String(req.user.sub).replace(/[^a-f0-9]/gi,'')}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:5*1024*1024,files:5},fileFilter:(_req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
const db = () => getDB();
const oid = v => ObjectId.isValid(v) ? new ObjectId(v) : null;
const clean = (v,n=160) => String(v ?? '').trim().slice(0,n);
async function staffAllowed(req, resource, action) {
  if (req.user.role === 'admin') return true;
  if (req.user.role !== 'staff' || !ObjectId.isValid(req.user.sub)) return false;
  const u = await db().collection('users').findOne({_id:oid(req.user.sub),role:'staff',accountStatus:'approved'});
  if (!u) return false;
  const perms = await getRolePermissions('staff');
  const a = perms[resource] || [];
  return a.includes('*') || a.includes(action) || (u.permissions || []).includes(`manage${resource[0].toUpperCase()}${resource.slice(1)}`);
}
const canManagePartners = (req,res,next) => { if(req.user.role==='admin')return next(); staffAllowed(req,'partners','update').then(ok=>ok?next():res.status(403).json({message:'Partner management permission required'})).catch(next); };

// Admin/authorized staff partner directory; sensitive payout and identity details are excluded from list responses.
router.get('/admin/partners', requireAuth, canManagePartners, async(req,res,next)=>{try{
 const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Math.max(1,Number(req.query.limit)||25));
 const filter={role:'partner'};if(['pending','approved','suspended','rejected'].includes(req.query.status))filter.accountStatus=req.query.status;
 const [rows,total]=await Promise.all([db().collection('users').find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).project({passwordHash:0,'partnerProfile.nid':0,'partnerProfile.payoutDetails':0}).toArray(),db().collection('users').countDocuments(filter)]);
 res.json({partners:rows.map(x=>({...x,_id:x._id.toString()})),pagination:{page,limit,total,pages:Math.max(1,Math.ceil(total/limit))}});
}catch(e){next(e)}});
router.patch('/admin/partners/:id/status',requireAuth,canManagePartners,async(req,res,next)=>{try{
 const id=oid(req.params.id),status=clean(req.body.status,20);if(!id||!['approved','rejected','suspended','pending'].includes(status))return res.status(400).json({message:'Invalid partner or status'});
 const r=await db().collection('users').updateOne({_id:id,role:'partner'},{$set:{accountStatus:status,partnerReviewedAt:new Date(),partnerReviewedBy:req.user.sub,updatedAt:new Date()}});if(!r.matchedCount)return res.status(404).json({message:'Partner not found'});res.json({message:'Partner status updated',status});
}catch(e){next(e)}});
router.patch('/admin/partners/:id/profile',requireAuth,canManagePartners,async(req,res,next)=>{try{
 const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid partner'});
 const serviceIds=Array.isArray(req.body.serviceIds)?[...new Set(req.body.serviceIds.map(x=>clean(x,100)))].slice(0,50):[];
 const serviceAreas=Array.isArray(req.body.serviceAreas)?[...new Set(req.body.serviceAreas.map(x=>clean(x,80)).filter(Boolean))].slice(0,30):[];
 const commissionRate=Number(req.body.commissionRate);if(!Number.isFinite(commissionRate)||commissionRate<0||commissionRate>100)return res.status(400).json({message:'Commission rate must be 0–100'});
 const r=await db().collection('users').updateOne({_id:id,role:'partner'},{$set:{'partnerProfile.serviceIds':serviceIds,'partnerProfile.serviceAreas':serviceAreas,partnerCommissionRate:commissionRate,updatedAt:new Date()}});if(!r.matchedCount)return res.status(404).json({message:'Partner not found'});res.json({message:'Partner service coverage and commission updated'});
}catch(e){next(e)}});

// Partner performance, quality claims and payable monitoring for Admin/authorized Staff.
router.get('/admin/partner-quality',requireAuth,canManagePartners,async(req,res,next)=>{try{
 const partners=await db().collection('users').find({role:'partner'}).project({passwordHash:0,'partnerProfile.nid':0,'partnerProfile.payoutDetails':0}).sort({createdAt:-1}).limit(500).toArray();
 const ids=partners.map(p=>p._id.toString());
 const bookings=ids.length?await db().collection('bookings').find({partnerId:{$in:ids},deletedAt:{$exists:false}}).project({partnerId:1,status:1,partnerStatus:1,partnerWorkStatus:1,partnerPayout:1,partnerSettlementStatus:1,feedback:1,rating:1,customerRating:1,completedAt:1,createdAt:1,ticketId:1}).toArray():[];
 const claims=await db().collection('serviceClaims').find({bookingId:{$in:bookings.map(b=>b._id.toString())}}).sort({createdAt:-1}).limit(300).toArray();
 const finance=ids.length?await db().collection('financeEntries').find({partnerId:{$in:ids},category:'Partner payable settlement'}).toArray():[];
 const metrics=partners.map(p=>{const own=bookings.filter(b=>b.partnerId===p._id.toString()),done=own.filter(b=>b.partnerStatus==='completed'||b.partnerWorkStatus==='completed'||b.status==='Completed'),cancelled=own.filter(b=>['Cancelled','Rejected'].includes(b.status)||b.partnerStatus==='rejected'),ratings=own.map(b=>Number(b.customerRating??b.rating??b.feedback?.rating)).filter(n=>Number.isFinite(n)&&n>=1&&n<=5),payables=finance.filter(f=>f.partnerId===p._id.toString());return {partnerId:p._id.toString(),name:p.partnerProfile?.businessName||p.name,email:p.email,status:p.accountStatus,totalJobs:own.length,completedJobs:done.length,cancelledOrRejected:cancelled.length,completionRate:own.length?Math.round(done.length/own.length*100):0,averageRating:ratings.length?Math.round(ratings.reduce((a,b)=>a+b,0)/ratings.length*10)/10:null,ratingCount:ratings.length,pendingPayable:payables.filter(x=>x.status==='pending').reduce((a,x)=>a+Number(x.amount||0),0),paidPayout:payables.filter(x=>x.status==='paid').reduce((a,x)=>a+Number(x.amount||0),0),openClaims:claims.filter(c=>c.userId===p._id.toString()||own.some(b=>b._id.toString()===c.bookingId)).filter(c=>['open','in_progress'].includes(c.status)).length};});
 res.json({partners:metrics,claims:claims.map(c=>({...c,_id:c._id.toString()}))});
}catch(e){next(e)}});
router.patch('/admin/partner-quality/claims/:claimId',requireAuth,canManagePartners,async(req,res,next)=>{try{
 const status=clean(req.body.status,24),note=clean(req.body.reviewNote,1000);if(!['open','in_progress','resolved','rejected'].includes(status))return res.status(400).json({message:'Invalid claim status'});
 const r=await db().collection('serviceClaims').updateOne({claimId:req.params.claimId,type:{$in:['warranty','complaint']}},{$set:{status,reviewNote:note,reviewedAt:new Date(),reviewedBy:req.user.sub,updatedAt:new Date()}});if(!r.modifiedCount)return res.status(404).json({message:'Warranty/complaint claim not found or unchanged'});res.json({message:'Claim review updated'});
}catch(e){next(e)}});

// Attach fulfilment metadata to service catalogue. Existing services default to in-house.
router.patch('/admin/services/:serviceId/fulfilment',requireAuth,requireRole('admin'),async(req,res,next)=>{try{
 const serviceId=clean(req.params.serviceId,100),fulfilment=clean(req.body.fulfilment,20);if(!['inhouse','partner','mixed'].includes(fulfilment))return res.status(400).json({message:'fulfilment must be inhouse, partner or mixed'});
 const partnerIds=Array.isArray(req.body.partnerIds)?[...new Set(req.body.partnerIds.filter(ObjectId.isValid).map(String))].slice(0,100):[];
 const partners=partnerIds.length?await db().collection('users').find({_id:{$in:partnerIds.map(oid)},role:'partner',accountStatus:'approved','partnerProfile.agreementAcceptance.version':PARTNER_TERMS_VERSION,'partnerProfile.documents':{$elemMatch:{status:'approved'}}}).project({_id:1}).toArray():[];
 if(partners.length!==partnerIds.length)return res.status(400).json({message:'সব Partner-এর Admin approval, বর্তমান Agreement এবং অন্তত একটি approved identity/business document থাকতে হবে।'});
 const doc=await db().collection('siteContent').findOne({_id:'services'});if(!doc)return res.status(404).json({message:'Service catalogue not found'});
 const items=(doc.items||[]).map(s=>s.id===serviceId?{...s,fulfilment,partnerIds}:s);if(!items.some(s=>s.id===serviceId))return res.status(404).json({message:'Service not found'});
 await db().collection('siteContent').updateOne({_id:'services'},{$set:{items,updatedAt:new Date(),updatedBy:req.user.email}});res.json({message:'Service fulfilment updated',service:items.find(s=>s.id===serviceId)});
}catch(e){next(e)}});

// Admin/Staff dispatch a job to a partner. No customer phone/address is copied into the partner offer.
router.post('/admin/bookings/:id/partner-offers',requireAuth,async(req,res,next)=>{try{
 if(!(await staffAllowed(req,'bookings','assign')))return res.status(403).json({message:'Booking assignment permission required'});
 const id=oid(req.params.id);const rawIds=Array.isArray(req.body.partnerIds)?req.body.partnerIds:[req.body.partnerId];const partnerIds=[...new Set(rawIds.map(x=>String(x||'')).filter(ObjectId.isValid))].slice(0,20).map(oid);
 if(!id||!partnerIds.length)return res.status(400).json({message:'কমপক্ষে একজন বৈধ Partner নির্বাচন করুন।'});
 const [b,partners]=await Promise.all([db().collection('bookings').findOne({_id:id,deletedAt:{$exists:false}}),db().collection('users').find({_id:{$in:partnerIds},role:'partner',accountStatus:'approved','partnerProfile.agreementAcceptance.version':PARTNER_TERMS_VERSION,'partnerProfile.documents':{$elemMatch:{status:'approved'}}}).toArray()]);
 if(!b||partners.length!==partnerIds.length)return res.status(404).json({message:'Booking বা অনুমোদিত Partner পাওয়া যায়নি।'});
 const service=await db().collection('siteContent').findOne({_id:'services'});const svc=(service?.items||[]).find(x=>x.id===b.serviceId);if(!svc||!['partner','mixed'].includes(svc.fulfilment)||partnerIds.some(pid=>!(svc.partnerIds||[]).includes(pid.toString())))return res.status(409).json({message:'নির্বাচিত সব Partner এই সার্ভিসের জন্য অনুমোদিত নয়।'});
 if(['Completed','Cancelled'].includes(b.status))return res.status(409).json({message:'Completed/Cancelled booking dispatch করা যাবে না।'});
 const now=new Date(),expiresAt=new Date(now.getTime()+Math.max(1,Math.min(168,Number(process.env.PARTNER_OFFER_TTL_HOURS||24)))*3600000);
 const offers=partners.map(p=>({id:randomUUID(),partnerId:p._id.toString(),status:'offered',offeredAt:now,expiresAt,offeredBy:req.user.sub}));
 await db().collection('bookings').updateOne({_id:id,status:{$nin:['Completed','Cancelled']}},{$set:{fulfilmentType:'partner',partnerOfferExpiresAt:expiresAt,updatedAt:now},$addToSet:{partnerOffers:{$each:offers}},$push:{statusHistory:{status:`Partner offer sent to ${offers.length} Partner(s)`,at:now,by:req.user.sub,byRole:req.user.role}}});
 await db().collection('notifications').insertMany(offers.map(o=>({recipientId:o.partnerId,recipientRole:'partner',type:'partner-job-offer',title:'New service job offer',message:`${b.ticketId}: ${b.serviceName} · Offer expires ${expiresAt.toISOString()}`,bookingId:id.toString(),createdAt:now,read:false})));
 res.status(201).json({message:`${offers.length} Partner-কে offer পাঠানো হয়েছে।`,offers,expiresAt});
}catch(e){next(e)}});

router.get('/partner/jobs',requireAuth,requireRole('partner'),async(req,res,next)=>{try{
 const p=await db().collection('users').findOne({_id:oid(req.user.sub),role:'partner',accountStatus:'approved'});if(!p)return res.status(403).json({message:'Approved Partner account required'});
 const rows=await db().collection('bookings').find({$or:[{partnerId:req.user.sub},{'partnerOffers.partnerId':req.user.sub}],deletedAt:{$exists:false}}).sort({updatedAt:-1}).limit(200).toArray();
 // Before acceptance, only service, area, date and issue summary are exposed; customer PII/address remain hidden.
 res.json({jobs:rows.map(b=>{const ownOffer=(b.partnerOffers||[]).find(o=>o.partnerId===req.user.sub);const legacy=b.partnerId===req.user.sub?b.partnerOffer:null;const offer=ownOffer||legacy;const partnerStatus=(b.partnerId===req.user.sub?b.partnerStatus:offer?.status)||'offered';const accepted=['accepted','completed'].includes(partnerStatus);return {_id:b._id.toString(),ticketId:b.ticketId,serviceName:b.serviceName,area:b.area,preferredDate:b.preferredDate,preferredTime:b.preferredTime,problem:b.problem,partnerStatus,partnerOffer:offer,partnerPayout:b.partnerPayout,partnerTechnicianId:b.partnerTechnicianId,partnerWorkStatus:b.partnerWorkStatus,status:b.status,...(accepted?{customerName:b.name,customerPhone:b.phone,address:b.address}: {})}})});
}catch(e){next(e)}});
router.patch('/partner/jobs/:id/decision',requireAuth,requireRole('partner'),async(req,res,next)=>{try{
 const id=oid(req.params.id),decision=clean(req.body.decision,20),quotedPayout=Number(req.body.payoutAmount),eta=clean(req.body.estimatedTime,100);if(!id||!['accepted','rejected'].includes(decision))return res.status(400).json({message:'Invalid decision'});
 if(decision==='accepted'&&(!Number.isFinite(quotedPayout)||quotedPayout<0||quotedPayout>10000000||!eta))return res.status(400).json({message:'Payout amount and estimated time are required'});
 const b=await db().collection('bookings').findOne({_id:id,deletedAt:{$exists:false},$or:[{partnerId:req.user.sub,partnerStatus:'offered'},{partnerOffers:{$elemMatch:{partnerId:req.user.sub,status:'offered'}}}]});if(!b)return res.status(404).json({message:'Pending partner offer not found'});
 const now=new Date(),offer=(b.partnerOffers||[]).find(o=>o.partnerId===req.user.sub&&o.status==='offered')||b.partnerOffer;
 if(offer?.expiresAt&&new Date(offer.expiresAt)<=now){await db().collection('bookings').updateOne({_id:id,'partnerOffers.partnerId':req.user.sub,'partnerOffers.status':'offered'},{$set:{'partnerOffers.$.status':'expired'}});return res.status(410).json({message:'এই Partner offer-এর মেয়াদ শেষ হয়েছে।'});}
 if(decision==='accepted'&&b.partnerId&&b.partnerId!==req.user.sub&&b.partnerStatus==='accepted')return res.status(409).json({message:'অন্য Partner ইতিমধ্যে কাজটি গ্রহণ করেছেন।'});
 const set={updatedAt:now};if(decision==='accepted'){set.partnerId=req.user.sub;set.partnerStatus='accepted';set.partnerPayout={amount:quotedPayout,estimatedTime:eta,currency:'BDT',agreedAt:now};}
 const update={$set:set,$push:{statusHistory:{status:`Partner ${decision}`,at:now,by:req.user.sub,byRole:'partner'}}};
 if((b.partnerOffers||[]).some(o=>o.partnerId===req.user.sub)){update.$set['partnerOffers.$[offer].status']=decision;update.$set['partnerOffers.$[offer].respondedAt']=now;update.arrayFilters=[{'offer.partnerId':req.user.sub,'offer.status':'offered'}];if(decision==='accepted')update.$set['partnerOffers.$[other].status']='closed';if(decision==='accepted')update.arrayFilters.push({'other.partnerId':{$ne:req.user.sub},'other.status':'offered'});}
 else {set['partnerOffer.status']=decision;set['partnerOffer.respondedAt']=now;set['partnerOffer.response']=decision;}
 const r=await db().collection('bookings').updateOne({_id:id,deletedAt:{$exists:false},...(decision==='accepted'?{$or:[{partnerId:{$in:[null,req.user.sub]}},{partnerStatus:{$ne:'accepted'}}]}:{})},update);if(!r.modifiedCount)return res.status(409).json({message:'Offer already answered or another Partner accepted it'});
 res.json({message:decision==='accepted'?'Offer accepted':'Offer rejected',partnerStatus:decision,...(decision==='accepted'?{customer:{name:b.name,phone:b.phone,address:b.address}}:{})});
}catch(e){next(e)}});

router.get('/admin/partner-settlements',requireAuth,async(req,res,next)=>{try{if(!(await staffAllowed(req,'payments','read'))&&!(await staffAllowed(req,'payments','update')))return res.status(403).json({message:'Manage payments permission required'});const rows=await db().collection('financeEntries').find({category:'Partner payable settlement',status:'pending'}).sort({createdAt:-1}).limit(300).toArray();res.json({settlements:rows});}catch(e){next(e)}});
router.patch('/admin/partner-settlements/:bookingId/approve-amount',requireAuth,async(req,res,next)=>{try{if(!(await staffAllowed(req,'payments','update')))return res.status(403).json({message:'Manage payments permission required'});const id=oid(req.params.bookingId),partnerId=clean(req.body.partnerId,80),amount=Number(req.body.amount);if(!id||!ObjectId.isValid(partnerId)||!Number.isFinite(amount)||amount<=0)return res.status(400).json({message:'Valid booking, partner and positive approved amount required'});const b=await db().collection('bookings').findOne({_id:id,partnerId,partnerStatus:{$in:['accepted','completed']},deletedAt:{$exists:false}});if(!b)return res.status(404).json({message:'Partner booking not found'});const customerTotal=Number(b.totalAmount||b.quotedAmount||0);if(customerTotal>0&&amount>customerTotal)return res.status(409).json({message:'Approved payout cannot exceed customer booking value'});await db().collection('bookings').updateOne({_id:id,partnerId},{$set:{'partnerPayout.approvedAmount':amount,'partnerPayout.approvedBy':req.user.sub,'partnerPayout.approvedAt':new Date(),updatedAt:new Date()}});res.json({message:'Partner payout amount approved',approvedAmount:amount});}catch(e){next(e)}});
router.patch('/admin/partner-settlements/:bookingId',requireAuth,async(req,res,next)=>{try{
 if(!(await staffAllowed(req,'payments','update')))return res.status(403).json({message:'Manage payments permission required'});
 const id=oid(req.params.bookingId);if(!id)return res.status(400).json({message:'Invalid booking'});
 const status=clean(req.body.status,20);if(!['paid','rejected'].includes(status))return res.status(400).json({message:'Status must be paid or rejected'});
 const key=`partner-payout:${id}:${clean(req.body.partnerId,80)}`;const result=await db().collection('financeEntries').updateOne({sourceKey:key,category:'Partner payable settlement',status:'pending'},{$set:{status,settledAt:status==='paid'?new Date():null,settledBy:req.user.sub,settlementReference:clean(req.body.reference,120),updatedAt:new Date()}});
 if(!result.modifiedCount)return res.status(404).json({message:'Pending partner payable not found'});
 await db().collection('bookings').updateOne({_id:id,partnerId:clean(req.body.partnerId,80)},{$set:{partnerSettlementStatus:status,updatedAt:new Date()}});res.json({message:`Partner settlement ${status}`});
}catch(e){next(e)}});

router.post('/partner/jobs/:id/settlement',requireAuth,requireRole('partner'),async(req,res,next)=>{try{
 const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking'});const b=await db().collection('bookings').findOne({_id:id,partnerId:req.user.sub,partnerStatus:'completed',partnerWorkStatus:'completed',status:'Completed'});if(!b)return res.status(409).json({message:'Only completed partner jobs can be settled'});
 const paymentTotal=Number(b.paymentAmount||0);if(paymentTotal<Number(b.totalAmount||b.quotedAmount||0))return res.status(409).json({message:'Customer payment must be fully confirmed before settlement'});
 const amount=Number(b.partnerPayout?.approvedAmount ?? b.partnerPayout?.amount ?? 0);if(!Number.isFinite(amount)||amount<=0||b.partnerPayout?.approvedBy==null)return res.status(409).json({message:'Admin-approved partner payout amount is required before settlement.'});const customerTotal=Number(b.totalAmount||b.quotedAmount||0);if(customerTotal>0&&amount>customerTotal)return res.status(409).json({message:'Partner payout cannot exceed customer booking value.'});const key=`partner-payout:${id}:${req.user.sub}`;const existing=await db().collection('financeEntries').findOne({sourceKey:key});if(existing)return res.json({message:'Settlement already recorded',settlement:existing});
 const entry={type:'expense',category:'Partner payable settlement',amount,bookingId:id.toString(),ticketId:b.ticketId,partnerId:req.user.sub,sourceKey:key,status:'pending',createdAt:new Date(),note:'Partner payout requires Admin payment confirmation'};
 await db().collection('financeEntries').insertOne(entry);await db().collection('bookings').updateOne({_id:id,partnerId:req.user.sub},{$set:{partnerStatus:'completed',partnerSettlementStatus:'pending',updatedAt:new Date()}});res.status(201).json({message:'Partner payable created for Admin settlement',settlement:entry});
}catch(e){next(e)}});


// Partner company team management. A team member can only be created and managed by its owning partner.
router.get('/partner/team',requireAuth,requireRole('partner'),async(req,res,next)=>{try{
 const members=await db().collection('users').find({role:'partner-technician',partnerId:req.user.sub}).project({passwordHash:0}).sort({createdAt:-1}).toArray();
 res.json({members:members.map(m=>({...m,_id:m._id.toString()}))});
}catch(e){next(e)}});
router.post('/partner/team',requireAuth,requireRole('partner'),async(req,res,next)=>{try{
 const owner=await db().collection('users').findOne({_id:oid(req.user.sub),role:'partner',accountStatus:'approved'});if(!owner)return res.status(403).json({message:'Approved Partner account required'});
 const name=clean(req.body.name,100),email=clean(req.body.email,160).toLowerCase(),phone=clean(req.body.phone,24),password=String(req.body.password||'');
 if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8||!/^\+?[0-9\s()-]{8,18}$/.test(phone))return res.status(400).json({message:'নাম, বৈধ ইমেইল, ফোন ও কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।'});
 const users=db().collection('users');if(await users.findOne({email}))return res.status(409).json({message:'এই ইমেইল দিয়ে অ্যাকাউন্ট রয়েছে।'});
 const doc={name,email,phone,passwordHash:await bcrypt.hash(password,12),role:'partner-technician',accountStatus:'approved',partnerId:req.user.sub,partnerMemberProfile:{skills:Array.isArray(req.body.skills)?req.body.skills.map(x=>clean(x,80)).filter(Boolean).slice(0,30):[],serviceAreas:Array.isArray(req.body.serviceAreas)?req.body.serviceAreas.map(x=>clean(x,80)).filter(Boolean).slice(0,20):[]},createdAt:new Date(),updatedAt:new Date()};
 const result=await users.insertOne(doc);res.status(201).json({message:'Partner Technician যোগ হয়েছে।',member:{id:result.insertedId.toString(),name,email,phone,role:doc.role,accountStatus:doc.accountStatus,partnerMemberProfile:doc.partnerMemberProfile}});
}catch(e){if(e.code===11000)return res.status(409).json({message:'এই ইমেইল দিয়ে অ্যাকাউন্ট রয়েছে।'});next(e)}});
router.patch('/partner/team/:id/status',requireAuth,requireRole('partner'),async(req,res,next)=>{try{
 const id=oid(req.params.id),status=clean(req.body.status,20);if(!id||!['approved','suspended'].includes(status))return res.status(400).json({message:'Invalid member or status'});
 const r=await db().collection('users').updateOne({_id:id,role:'partner-technician',partnerId:req.user.sub},{$set:{accountStatus:status,updatedAt:new Date()}});if(!r.modifiedCount)return res.status(404).json({message:'Team member not found'});res.json({message:'Team member status updated'});
}catch(e){next(e)}});
router.post('/partner/jobs/:id/assign-member',requireAuth,requireRole('partner'),async(req,res,next)=>{try{
 const id=oid(req.params.id),memberId=oid(req.body.memberId);if(!id||!memberId)return res.status(400).json({message:'Invalid booking or member'});
 const [b,m]=await Promise.all([db().collection('bookings').findOne({_id:id,partnerId:req.user.sub,partnerStatus:'accepted'}),db().collection('users').findOne({_id:memberId,role:'partner-technician',partnerId:req.user.sub,accountStatus:'approved'})]);
 if(!b||!m)return res.status(404).json({message:'Accepted job or active team member not found'});
 await db().collection('bookings').updateOne({_id:id,partnerId:req.user.sub,partnerStatus:'accepted'},{$set:{partnerTechnicianId:memberId.toString(),partnerTechnicianName:m.name,partnerWorkStatus:'assigned',updatedAt:new Date()},$push:{statusHistory:{status:'Partner technician assigned',at:new Date(),by:req.user.sub,byRole:'partner'}}});
 res.json({message:'Team member assigned to job'});
}catch(e){next(e)}});
router.get('/partner/team/jobs',requireAuth,requireRole('partner-technician'),async(req,res,next)=>{try{
 const member=await db().collection('users').findOne({_id:oid(req.user.sub),role:'partner-technician',accountStatus:'approved'});if(!member)return res.status(403).json({message:'Active Partner Technician account required'});
 const rows=await db().collection('bookings').find({partnerTechnicianId:req.user.sub,deletedAt:{$exists:false}}).sort({updatedAt:-1}).limit(100).toArray();
 res.json({jobs:rows.map(b=>({_id:b._id.toString(),ticketId:b.ticketId,serviceName:b.serviceName,area:b.area,preferredDate:b.preferredDate,preferredTime:b.preferredTime,problem:b.problem,status:b.partnerWorkStatus||'assigned',customerName:b.name,customerPhone:b.phone,address:b.address,workPhotos:b.partnerWorkPhotos||[]}))});
}catch(e){next(e)}});
router.patch('/partner/team/jobs/:id/status',requireAuth,requireRole('partner-technician'),async(req,res,next)=>{try{
 const id=oid(req.params.id),status=clean(req.body.status,30);if(!id||!['in_progress','work_submitted'].includes(status))return res.status(400).json({message:'Invalid work status'});
 const b=await db().collection('bookings').findOne({_id:id,partnerTechnicianId:req.user.sub,deletedAt:{$exists:false}});if(!b)return res.status(404).json({message:'Assigned job not found'});
 const current=b.partnerWorkStatus||'assigned';if(status==='in_progress'&&current!=='assigned')return res.status(409).json({message:'কাজ শুরু করার স্ট্যাটাস শুধু Assigned কাজের জন্য।'});if(status==='work_submitted'&&current!=='in_progress')return res.status(409).json({message:'আগে কাজ In Progress করতে হবে।'});
 const set={partnerWorkStatus:status,updatedAt:new Date()};if(status==='work_submitted'){const otp=String(randomInt(100000,1000000));set.partnerCompletionOtpHash=createHash('sha256').update(otp).digest('hex');set.partnerCompletionOtpExpiresAt=new Date(Date.now()+30*60*1000);set.partnerCompletionOtpAttempts=0;await db().collection('notifications').insertOne({recipientId:b.userId||b.customerId||b.createdBy,recipientRole:'customer',type:'partner-completion-otp',title:'কাজ সম্পন্নের OTP',message:`আপনার ${b.ticketId} কাজ যাচাই করতে OTP: ${otp} (৩০ মিনিট বৈধ)`,bookingId:id.toString(),createdAt:new Date(),read:false});}
 await db().collection('bookings').updateOne({_id:id,partnerTechnicianId:req.user.sub},{$set:set,$push:{statusHistory:{status:status==='in_progress'?'Partner work in progress':'Partner work submitted',at:new Date(),by:req.user.sub,byRole:'partner-technician'}}});res.json({message:status==='work_submitted'?'কাজ জমা হয়েছে। Customer-এর OTP দিয়ে যাচাই সম্পন্ন করুন।':'কাজ শুরু হয়েছে।'});
}catch(e){next(e)}});
router.post('/partner/team/jobs/:id/photos',requireAuth,requireRole('partner-technician'),(req,res,next)=>partnerEvidenceUpload.array('photos',5)(req,res,async err=>{if(err)return res.status(400).json({message:err.code==='LIMIT_FILE_SIZE'?'প্রতি ছবি সর্বোচ্চ ৫ MB হতে পারবে।':err.message||'ছবি আপলোড করা যায়নি।'});try{
 const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking'});const b=await db().collection('bookings').findOne({_id:id,partnerTechnicianId:req.user.sub});if(!b)return res.status(404).json({message:'Assigned job not found'});
 const photos=await Promise.all((req.files||[]).map(async f=>{const stored=await persistUploadedFile(f,{folder:'mu-home-service/partner-reports',resourceType:'image'});return {url:stored.url||`/api/uploads/partner-reports/${f.filename}`,storageProvider:stored.provider,storagePublicId:stored.publicId,name:f.originalname,mimeType:f.mimetype,size:f.size,uploadedAt:new Date(),uploadedBy:req.user.sub};}));if(!photos.length)return res.status(400).json({message:'কমপক্ষে একটি ছবি নির্বাচন করুন।'});
 await db().collection('bookings').updateOne({_id:id,partnerTechnicianId:req.user.sub},{$push:{partnerWorkPhotos:{$each:photos}},$set:{updatedAt:new Date()}});res.status(201).json({message:'Service report photos uploaded',photos});
}catch(e){(req.files||[]).forEach(f=>fs.unlink(f.path,()=>{}));next(e)}}));
router.post('/partner/team/jobs/:id/complete',requireAuth,requireRole('partner-technician'),async(req,res,next)=>{try{
 const id=oid(req.params.id),otp=clean(req.body.otp,6);if(!id||!/^\d{6}$/.test(otp))return res.status(400).json({message:'৬ সংখ্যার OTP দিন।'});
 const b=await db().collection('bookings').findOne({_id:id,partnerTechnicianId:req.user.sub,partnerWorkStatus:'work_submitted'});if(!b)return res.status(404).json({message:'Submitted job not found'});
 if(!b.partnerCompletionOtpExpiresAt||b.partnerCompletionOtpExpiresAt<new Date())return res.status(400).json({message:'OTP মেয়াদোত্তীর্ণ। Customer-কে নতুন OTP পাঠাতে বলুন।'});
 if((b.partnerCompletionOtpAttempts||0)>=5)return res.status(429).json({message:'OTP চেষ্টা সীমা অতিক্রম করেছে।'});
 const hash=createHash('sha256').update(otp).digest('hex');if(hash!==b.partnerCompletionOtpHash){await db().collection('bookings').updateOne({_id:id},{$inc:{partnerCompletionOtpAttempts:1}});return res.status(400).json({message:'OTP সঠিক নয়।'});}
 await db().collection('bookings').updateOne({_id:id,partnerTechnicianId:req.user.sub,partnerWorkStatus:'work_submitted'},{$set:{partnerWorkStatus:'completed',partnerStatus:'completed',partnerCompletedAt:new Date(),partnerCompletionOtpHash:null,status:'Completed',updatedAt:new Date()},$push:{statusHistory:{status:'Partner work completed by OTP',at:new Date(),by:req.user.sub,byRole:'partner-technician'}}});res.json({message:'Customer OTP যাচাই হয়েছে; কাজ সম্পন্ন।'});
}catch(e){next(e)}});

export default router;


// Partner Technician can resend a fresh completion OTP when the previous one expires or is locked.
router.post('/partner-technician/jobs/:id/completion-otp/resend',requireAuth,requireRole('partner-technician'),async(req,res,next)=>{try{
 const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking'});
 const b=await db().collection('bookings').findOne({_id:id,partnerTechnicianId:req.user.sub,partnerWorkStatus:'work_submitted',deletedAt:{$exists:false}});
 if(!b)return res.status(404).json({message:'Submitted job not found'});
 const now=new Date(),otp=String(randomInt(100000,1000000));
 await db().collection('bookings').updateOne({_id:id,partnerTechnicianId:req.user.sub,partnerWorkStatus:'work_submitted'},{$set:{partnerCompletionOtpHash:createHash('sha256').update(otp).digest('hex'),partnerCompletionOtpExpiresAt:new Date(now.getTime()+30*60*1000),partnerCompletionOtpAttempts:0,partnerCompletionOtpResentAt:now}});
 await db().collection('notifications').insertOne({recipientId:b.userId||b.customerId||b.createdBy,recipientRole:'customer',type:'partner-completion-otp',title:'কাজ সম্পন্নের নতুন OTP',message:`আপনার ${b.ticketId} কাজ যাচাই করতে নতুন OTP: ${otp} (৩০ মিনিট বৈধ)`,bookingId:id.toString(),createdAt:now,read:false});
 res.json({message:'Customer-এর কাছে নতুন OTP পাঠানো হয়েছে।'});
}catch(e){next(e)}});


router.post('/partner/team/jobs/:id/completion-otp/resend',requireAuth,requireRole('partner-technician'),async(req,res,next)=>{try{const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking'});const b=await db().collection('bookings').findOne({_id:id,partnerTechnicianId:req.user.sub,partnerWorkStatus:'work_submitted',deletedAt:{$exists:false}});if(!b)return res.status(404).json({message:'Submitted job not found'});const now=new Date();if(b.partnerCompletionOtpResentAt&&now-new Date(b.partnerCompletionOtpResentAt)<60000)return res.status(429).json({message:'নতুন OTP পাঠানোর আগে ৬০ সেকেন্ড অপেক্ষা করুন।'});const windowStart=b.partnerCompletionOtpResendWindowAt?new Date(b.partnerCompletionOtpResendWindowAt):now;const count=now-windowStart<86400000?Number(b.partnerCompletionOtpResendCount||0):0;if(count>=5)return res.status(429).json({message:'২৪ ঘণ্টায় সর্বোচ্চ ৫ বার OTP পাঠানো যাবে।'});const otp=String(randomInt(100000,1000000));await db().collection('bookings').updateOne({_id:id,partnerTechnicianId:req.user.sub,partnerWorkStatus:'work_submitted'},{$set:{partnerCompletionOtpHash:createHash('sha256').update(otp).digest('hex'),partnerCompletionOtpExpiresAt:new Date(now.getTime()+30*60*1000),partnerCompletionOtpAttempts:0,partnerCompletionOtpResentAt:now,partnerCompletionOtpResendWindowAt:windowStart,partnerCompletionOtpResendCount:count+1}});await db().collection('notifications').insertOne({recipientId:b.userId||b.customerId||b.createdBy,recipientRole:'customer',type:'partner-completion-otp',title:'কাজ সম্পন্নের নতুন OTP',message:`আপনার ${b.ticketId} কাজ যাচাই করতে নতুন OTP: ${otp} (৩০ মিনিট বৈধ)`,bookingId:id.toString(),createdAt:now,read:false});res.json({message:'Customer-এর কাছে নতুন OTP পাঠানো হয়েছে।'});}catch(e){next(e)}});

// Versioned partner agreement, private document verification, and digital partner ID.
const PARTNER_TERMS_VERSION = process.env.PARTNER_TERMS_VERSION || '2026-10-v1';
const partnerDocsDir=fileURLToPath(new URL('../../uploads/partner-documents/',import.meta.url));
fs.mkdirSync(partnerDocsDir,{recursive:true});
const partnerDocUpload=multer({storage:multer.diskStorage({destination:(_req,_file,cb)=>cb(null,partnerDocsDir),filename:(req,file,cb)=>cb(null,`${String(req.user.sub).replace(/[^a-f0-9]/gi,'')}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:8*1024*1024,files:3},fileFilter:(_req,file,cb)=>cb(null,['application/pdf','image/jpeg','image/png','image/webp'].includes(file.mimetype))});
router.get('/partner/agreement',requireAuth,requireRole('partner'),async(req,res,next)=>{try{const u=await db().collection('users').findOne({_id:oid(req.user.sub),role:'partner'},{projection:{partnerProfile:1,name:1,email:1}});if(!u)return res.status(404).json({message:'Partner not found'});res.json({version:PARTNER_TERMS_VERSION,accepted:u.partnerProfile?.agreementAcceptance?.version===PARTNER_TERMS_VERSION,acceptance:u.partnerProfile?.agreementAcceptance||null,terms:{title:'MU Home Service Partner Agreement',clauses:['Partner will provide services professionally and follow MU Home Service quality and safety standards.','Customer information must only be used to fulfil the assigned booking; direct solicitation or sharing customer data is prohibited.','Partner is responsible for its staff, identity verification, conduct, tools and applicable legal compliance.','Warranty, rework, damage and complaint responsibilities will follow the approved service policy and written commercial terms.','Payout is payable only after verified job completion and confirmed customer payment, subject to approved settlement.','Partner must keep business, service-area, licensing and payout information accurate and promptly report changes.','MU Home Service may suspend dispatch while documents, safety or quality concerns are reviewed.']}})}catch(e){next(e)}});
router.post('/partner/agreement/accept',requireAuth,requireRole('partner'),async(req,res,next)=>{try{if(req.body.version!==PARTNER_TERMS_VERSION||req.body.accept!==true)return res.status(400).json({message:'বর্তমান Agreement version গ্রহণ নিশ্চিত করুন।'});const now=new Date();await db().collection('users').updateOne({_id:oid(req.user.sub),role:'partner'},{$set:{'partnerProfile.agreementAcceptance':{version:PARTNER_TERMS_VERSION,acceptedAt:now,ip:req.ip,userAgent:clean(req.headers['user-agent'],240)},updatedAt:now}});res.json({message:'Partner Agreement গ্রহণ সংরক্ষিত হয়েছে।',version:PARTNER_TERMS_VERSION,acceptedAt:now})}catch(e){next(e)}});
router.post('/partner/documents',requireAuth,requireRole('partner'),(req,res,next)=>partnerDocUpload.array('documents',3)(req,res,async err=>{if(err)return res.status(400).json({message:err.code==='LIMIT_FILE_SIZE'?'প্রতি ডকুমেন্ট সর্বোচ্চ ৮ MB।':err.message||'ডকুমেন্ট আপলোড ব্যর্থ'});try{const files=req.files||[];if(!files.length)return res.status(400).json({message:'কমপক্ষে একটি ডকুমেন্ট নির্বাচন করুন।'});const docs=files.map(f=>({documentId:randomUUID(),type:['trade_license','nid','tax','other'].includes(req.body.type)?req.body.type:'other',originalName:path.basename(f.originalname).slice(0,160),storedName:f.filename,mimeType:f.mimetype,size:f.size,status:'pending',uploadedAt:new Date()}));await db().collection('users').updateOne({_id:oid(req.user.sub),role:'partner'},{$push:{'partnerProfile.documents':{$each:docs}},$set:{updatedAt:new Date()}});res.status(201).json({message:'ডকুমেন্ট Admin verification-এর জন্য জমা হয়েছে।',documents:docs.map(({storedName,...d})=>d)})}catch(e){(req.files||[]).forEach(f=>fs.unlink(f.path,()=>{}));next(e)}}));
router.get('/partner/id-card',requireAuth,requireRole('partner'),async(req,res,next)=>{try{const p=await db().collection('users').findOne({_id:oid(req.user.sub),role:'partner',accountStatus:'approved'},{projection:{name:1,email:1,phone:1,accountStatus:1,partnerProfile:1,createdAt:1}});if(!p)return res.status(403).json({message:'Approved Partner account required'});const agreement=p.partnerProfile?.agreementAcceptance?.version===PARTNER_TERMS_VERSION;const docs=(p.partnerProfile?.documents||[]);if(!agreement||!docs.some(d=>d.status==='approved'))return res.status(403).json({message:'Digital ID-এর জন্য বর্তমান Agreement গ্রহণ এবং অন্তত একটি পরিচয়/ব্যবসার ডকুমেন্ট অনুমোদিত হতে হবে।'});let token=p.partnerProfile?.verificationToken;if(!token){token=randomBytes(32).toString('hex');await db().collection('users').updateOne({_id:p._id,role:'partner'},{$set:{'partnerProfile.verificationToken':token,'partnerProfile.verificationTokenHash':createHash('sha256').update(token).digest('hex'),'partnerProfile.verificationTokenCreatedAt':new Date()}});}const verificationUrl=`/partner/verify/${token}`;res.setHeader('Cache-Control','no-store');res.json({id:`MU-P-${p._id.toString().slice(-8).toUpperCase()}`,name:p.partnerProfile?.businessName||p.name,contactName:p.name,phone:p.phone,partnerType:p.partnerProfile?.partnerType||'individual',serviceAreas:p.partnerProfile?.serviceAreas||[],serviceIds:p.partnerProfile?.serviceIds||[],issuedAt:p.partnerReviewedAt||p.createdAt,status:'ACTIVE',verification:'VERIFIED',verificationUrl,verificationToken:token})}catch(e){next(e)}});
// Public, privacy-safe partner verification. The opaque token is hashed before lookup.
router.get('/public/partner-verification/:token',async(req,res,next)=>{try{const token=clean(req.params.token,64);if(!/^[a-f0-9]{64}$/i.test(token))return res.status(404).json({verified:false,status:'NOT_FOUND',message:'Verification record not found'});const hash=createHash('sha256').update(token).digest('hex');const p=await db().collection('users').findOne({role:'partner','partnerProfile.verificationTokenHash':hash},{projection:{name:1,accountStatus:1,partnerProfile:1,partnerReviewedAt:1,createdAt:1}});if(!p)return res.status(404).json({verified:false,status:'NOT_FOUND',message:'Verification record not found'});const docs=p.partnerProfile?.documents||[],docsApproved=docs.some(d=>d.status==='approved'),agreementAccepted=p.partnerProfile?.agreementAcceptance?.version===PARTNER_TERMS_VERSION;const active=p.accountStatus==='approved'&&docsApproved&&agreementAccepted;res.setHeader('Cache-Control','no-store');res.json({verified:active,status:active?'ACTIVE':p.accountStatus==='suspended'?'SUSPENDED':'INACTIVE',partnerId:`MU-P-${p._id.toString().slice(-8).toUpperCase()}`,businessName:p.partnerProfile?.businessName||p.name,partnerType:p.partnerProfile?.partnerType||'individual',serviceAreas:p.partnerProfile?.serviceAreas||[],serviceIds:p.partnerProfile?.serviceIds||[],approvedAt:p.partnerReviewedAt||null,checkedAt:new Date(),message:active?'This Partner is currently verified by MU Home Service.':'This Partner is not currently authorized for new service assignments.'})}catch(e){next(e)}});
router.get('/admin/partner-documents',requireAuth,canManagePartners,async(req,res,next)=>{try{const partners=await db().collection('users').find({role:'partner','partnerProfile.documents.0':{$exists:true}}).project({name:1,email:1,"partnerProfile.businessName":1,"partnerProfile.documents":1}).sort({updatedAt:-1}).limit(300).toArray();res.json({documents:partners.flatMap(p=>(p.partnerProfile?.documents||[]).map(d=>({partnerId:p._id.toString(),partnerName:p.partnerProfile?.businessName||p.name,email:p.email,...d})))})}catch(e){next(e)}});
router.patch('/admin/partner-documents/:partnerId/:documentId',requireAuth,canManagePartners,async(req,res,next)=>{try{const id=oid(req.params.partnerId),status=clean(req.body.status,20),note=clean(req.body.reviewNote,500);if(!id||!['approved','rejected','pending'].includes(status))return res.status(400).json({message:'Invalid partner/document status'});const r=await db().collection('users').updateOne({_id:id,role:'partner','partnerProfile.documents.documentId':req.params.documentId},{$set:{'partnerProfile.documents.$.status':status,'partnerProfile.documents.$.reviewNote':note,'partnerProfile.documents.$.reviewedAt':new Date(),'partnerProfile.documents.$.reviewedBy':req.user.sub,updatedAt:new Date()}});if(!r.modifiedCount)return res.status(404).json({message:'Document not found or unchanged'});res.json({message:'Document review saved'})}catch(e){next(e)}});
router.get('/admin/partner-documents/:partnerId/:documentId/file',requireAuth,canManagePartners,async(req,res,next)=>{try{const id=oid(req.params.partnerId),p=id&&await db().collection('users').findOne({_id:id,role:'partner'},{projection:{'partnerProfile.documents':1}}),d=p?.partnerProfile?.documents?.find(x=>x.documentId===req.params.documentId);if(!d)return res.status(404).json({message:'Document not found'});const file=path.join(partnerDocsDir,path.basename(d.storedName));if(!fs.existsSync(file))return res.status(404).json({message:'Document file unavailable'});res.setHeader('Content-Type',d.mimeType);res.setHeader('Content-Disposition',`inline; filename="${encodeURIComponent(d.originalName)}"`);fs.createReadStream(file).pipe(res)}catch(e){next(e)}});
