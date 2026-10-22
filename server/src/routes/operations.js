import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
const router = Router();
const db = () => getDB();
const oid = id => ObjectId.isValid(id) ? new ObjectId(id) : null;
async function approvedUser(req) {
  const id = oid(req.user.sub); if (!id) return null;
  const user = await db().collection('users').findOne({ _id:id, role:req.user.role, accountStatus:'approved' });
  if (user?.role === 'technician' && user.technicianStatus !== 'approved') return null;
  return user;
}
async function canSeeBooking(req, booking) {
  if (!booking) return false;
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'technician') return (booking.technicianIds||[]).includes(req.user.sub) || booking.technicianId===req.user.sub;
  if (req.user.role === 'staff') { const u=await approvedUser(req); return Boolean(u); }
  return booking.userId===req.user.sub;
}
router.post('/operations/bookings/:id/report', requireAuth, requireRole('technician','staff','admin'), async (req,res,next)=>{try{
 const id=oid(req.params.id); if(!id)return res.status(400).json({message:'Invalid booking ID'});
 const booking=await db().collection('bookings').findOne({_id:id}); if(!await canSeeBooking(req,booking))return res.status(404).json({message:'Booking not found or access denied'});
 if(req.user.role==='technician' && !(booking.technicianIds||[]).includes(req.user.sub) && booking.technicianId!==req.user.sub)return res.status(403).json({message:'এই কাজটি আপনার নামে assign করা নেই।'});
 const {diagnosis,workDone,checklist,partsUsed,notes,beforePhotos,afterPhotos}=req.body||{};
 if(!String(diagnosis||'').trim() || !String(workDone||'').trim())return res.status(400).json({message:'সমস্যার নির্ণয় ও সম্পন্ন কাজের বিবরণ প্রয়োজন।'});
 const report={reportId:randomUUID(),bookingId:id.toString(),ticketId:booking.ticketId,diagnosis:String(diagnosis).slice(0,3000),workDone:String(workDone).slice(0,5000),checklist:Array.isArray(checklist)?checklist.slice(0,100).map(x=>({label:String(x.label||'').slice(0,200),done:Boolean(x.done)})):[],partsUsed:Array.isArray(partsUsed)?partsUsed.slice(0,100).map(x=>({itemId:String(x.itemId||'').slice(0,100),name:String(x.name||'').slice(0,150),quantity:Math.max(0,Number(x.quantity)||0)})):[],notes:String(notes||'').slice(0,3000),beforePhotos:Array.isArray(beforePhotos)?beforePhotos.slice(0,10).map(String):[],afterPhotos:Array.isArray(afterPhotos)?afterPhotos.slice(0,10).map(String):[],createdAt:new Date(),createdBy:req.user.sub,createdByEmail:req.user.email,role:req.user.role};
 await db().collection('serviceReports').insertOne(report); await db().collection('bookings').updateOne({_id:id},{$set:{latestReportAt:report.createdAt,updatedAt:new Date()}}); await db().collection('notifications').insertOne({recipientRole:'staff',type:'service-report',title:'নতুন Service Report',message:`${booking.ticketId||'Booking'}-এর রিপোর্ট জমা হয়েছে`,bookingId:id.toString(),createdAt:new Date(),read:false}); res.status(201).json({message:'Service report saved',report});
 }catch(e){next(e)}});

router.get('/operations/service-reports', requireAuth, requireRole('admin','staff'), async(req,res,next)=>{try{
 if(req.user.role==='staff'){const u=await approvedUser(req);if(!u||!(u.permissions||[]).some(p=>['manageBookings','assignTechnicians','manageQuotations'].includes(p)))return res.status(403).json({message:'Service report access denied'});}
 const filter={}; if(req.query.bookingId && oid(req.query.bookingId))filter.bookingId=String(req.query.bookingId);
 const reports=await db().collection('serviceReports').find(filter).sort({createdAt:-1}).limit(500).toArray();
 res.json({reports});
}catch(e){next(e)}});
router.get('/operations/bookings/:id/reports', requireAuth, async(req,res,next)=>{try{const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking ID'});const b=await db().collection('bookings').findOne({_id:id});if(!await canSeeBooking(req,b))return res.status(404).json({message:'Booking not found or access denied'});const reports=await db().collection('serviceReports').find({bookingId:id.toString()}).sort({createdAt:-1}).limit(50).toArray();res.json({reports})}catch(e){next(e)}});
router.post('/operations/bookings/:id/quotations', requireAuth, requireRole('staff','admin'), async(req,res,next)=>{try{
 const user=await approvedUser(req); if(req.user.role!=='admin'&&!user)return res.status(403).json({message:'Approved staff account required'}); if(req.user.role==='staff'&&!(user.permissions||[]).includes('manageQuotations'))return res.status(403).json({message:'Quotation তৈরির অনুমতি নেই। Admin-এর কাছ থেকে Create quotations permission নিন।'});
 const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking ID'});const b=await db().collection('bookings').findOne({_id:id});if(!b)return res.status(404).json({message:'Booking not found'});
 const items=Array.isArray(req.body.items)?req.body.items.slice(0,100).map(x=>({description:String(x.description||'').trim().slice(0,250),quantity:Number(x.quantity),unitPrice:Number(x.unitPrice)})):[];
 if(!items.length||items.some(x=>!x.description||!Number.isFinite(x.quantity)||x.quantity<=0||!Number.isFinite(x.unitPrice)||x.unitPrice<0))return res.status(400).json({message:'Valid quotation items are required'});
 const subtotal=items.reduce((n,x)=>n+x.quantity*x.unitPrice,0),discount=Math.max(0,Number(req.body.discount)||0);if(discount>subtotal)return res.status(400).json({message:'Discount cannot exceed subtotal'});
 const q={quotationId:randomUUID(),bookingId:id.toString(),ticketId:b.ticketId,items,subtotal,discount,total:subtotal-discount,status:'pending',notes:String(req.body.notes||'').slice(0,2000),createdAt:new Date(),createdBy:req.user.sub,createdByEmail:req.user.email};await db().collection('quotations').insertOne(q);await db().collection('bookings').updateOne({_id:id},{$set:{status:'Quotation sent',quotedAmount:q.total,updatedAt:new Date()}});await db().collection('notifications').insertOne({recipientId:b.userId,type:'quotation',title:'নতুন Quotation',message:`${b.ticketId}: quotation review প্রয়োজন`,bookingId:id.toString(),createdAt:new Date(),read:false});res.status(201).json({message:'Quotation created',quotation:q});
 }catch(e){next(e)}});
router.get('/operations/bookings/:id/quotations', requireAuth, async(req,res,next)=>{try{const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid booking ID'});const b=await db().collection('bookings').findOne({_id:id});if(!await canSeeBooking(req,b))return res.status(404).json({message:'Booking not found or access denied'});const quotations=await db().collection('quotations').find({bookingId:id.toString()}).sort({createdAt:-1}).limit(50).toArray();res.json({quotations})}catch(e){next(e)}});
router.patch('/operations/quotations/:quotationId/decision', requireAuth, requireRole('customer'), async(req,res,next)=>{try{const user=oid(req.user.sub);const decision=String(req.body.decision||'');if(!['approved','rejected'].includes(decision))return res.status(400).json({message:'Decision must be approved or rejected'});const q=await db().collection('quotations').findOne({quotationId:req.params.quotationId});if(!q)return res.status(404).json({message:'Quotation not found'});const b=await db().collection('bookings').findOne({_id:oid(q.bookingId),userId:req.user.sub});if(!user||!b)return res.status(403).json({message:'This quotation does not belong to your account'});if(q.status!=='pending')return res.status(409).json({message:'Quotation has already been decided'});await db().collection('quotations').updateOne({_id:q._id,status:'pending'},{$set:{status:decision,decidedAt:new Date(),decidedBy:req.user.sub}});await db().collection('bookings').updateOne({_id:b._id},{$set:{status:decision==='approved'?'Approved':'Inspection',updatedAt:new Date()}});await db().collection('notifications').insertOne({recipientRole:'staff',type:'quotation-decision',title:'Quotation response',message:`${b.ticketId}: ${decision}`,bookingId:b._id.toString(),createdAt:new Date(),read:false});res.json({message:`Quotation ${decision}`,status:decision})}catch(e){next(e)}});
router.get('/operations/customer/quotations', requireAuth, requireRole('customer'), async(req,res,next)=>{try{
 const rows=await db().collection('quotations').find({}).sort({createdAt:-1}).limit(500).toArray();
 const owned=[];
 for(const q of rows){const b=await db().collection('bookings').findOne({_id:oid(q.bookingId),userId:req.user.sub});if(b)owned.push({...q,booking:{_id:b._id,ticketId:b.ticketId,serviceName:b.serviceName,status:b.status,createdAt:b.createdAt}})}
 res.json({quotations:owned});
}catch(e){next(e)}});
router.get('/operations/inventory/catalog', requireAuth, requireRole('technician'), async(req,res,next)=>{try{
 const user=await approvedUser(req);if(!user||user.technicianStatus!=='approved')return res.status(403).json({message:'Approved technician account required'});
 const items=await db().collection('inventory').find({quantity:{$gt:0}}).project({name:1,sku:1,quantity:1,unit:1,costPrice:1}).sort({name:1}).limit(500).toArray();
 res.json({items:items.map(x=>({...x,_id:x._id.toString()}))});
}catch(e){next(e)}});
router.post('/operations/parts-requests', requireAuth, requireRole('technician'), async(req,res,next)=>{try{const user=await approvedUser(req);if(!user||user.technicianStatus!=='approved')return res.status(403).json({message:'Approved technician account required'});const bookingId=String(req.body.bookingId||'');const b=oid(bookingId);if(!b)return res.status(400).json({message:'Valid bookingId required'});const booking=await db().collection('bookings').findOne({_id:b,$or:[{technicianId:req.user.sub},{technicianIds:req.user.sub}]});if(!booking)return res.status(403).json({message:'Booking is not assigned to you'});const parts=Array.isArray(req.body.parts)?req.body.parts.slice(0,50).map(p=>({itemId:String(p.itemId||''),name:String(p.name||'').trim().slice(0,150),quantity:Number(p.quantity),note:String(p.note||'').slice(0,300)})):[];if(!parts.length||parts.some(p=>!p.name||!Number.isFinite(p.quantity)||p.quantity<=0))return res.status(400).json({message:'Parts and positive quantities are required'});const request={requestId:randomUUID(),bookingId:b.toString(),ticketId:booking.ticketId,technicianId:req.user.sub,technicianName:user.name,parts,status:'pending',note:String(req.body.note||'').slice(0,1000),createdAt:new Date()};await db().collection('partsRequests').insertOne(request);await db().collection('notifications').insertOne({recipientRole:'staff',type:'parts-request',title:'Parts Request',message:`${booking.ticketId}: parts request received`,bookingId:b.toString(),createdAt:new Date(),read:false});res.status(201).json({message:'Parts request submitted',request})}catch(e){next(e)}});
router.get('/operations/parts-requests', requireAuth, requireRole('staff','admin'), async(req,res,next)=>{try{const user=await approvedUser(req);if(req.user.role==='staff'&&(!user||!(user.permissions||[]).some(p=>['manageInventory','manageBookings','assignTechnicians'].includes(p))))return res.status(403).json({message:'Parts request access denied'});const filter={};if(req.query.status&&['pending','approved','rejected','issued'].includes(String(req.query.status)))filter.status=String(req.query.status);const requests=await db().collection('partsRequests').find(filter).sort({createdAt:-1}).limit(300).toArray();res.json({requests})}catch(e){next(e)}});
router.patch('/operations/parts-requests/:id/decision', requireAuth, requireRole('staff','admin'), async(req,res,next)=>{try{
 const user=await approvedUser(req);if(req.user.role==='staff'&&(!user||!(user.permissions||[]).some(p=>['manageInventory','manageBookings','assignTechnicians'].includes(p))))return res.status(403).json({message:'Parts request approval denied'});
 const decision=String(req.body.status||'');if(!['approved','rejected','issued'].includes(decision))return res.status(400).json({message:'Invalid request status'});
 const dbx=db(); const request=await dbx.collection('partsRequests').findOne({requestId:req.params.id});if(!request)return res.status(404).json({message:'Parts request not found'});
 if(decision==='approved'||decision==='rejected'){
   if(request.status!=='pending')return res.status(409).json({message:'Only pending requests can be approved or rejected'});
   const result=await dbx.collection('partsRequests').updateOne({requestId:req.params.id,status:'pending'},{$set:{status:decision,decidedAt:new Date(),decidedBy:req.user.sub,decisionNote:String(req.body.note||'').slice(0,1000)}});
   if(!result.modifiedCount)return res.status(409).json({message:'Request status changed; refresh and try again.'});
   await dbx.collection('notifications').insertOne({recipientId:request.technicianId,type:'parts-request-decision',title:'Parts Request আপডেট',message:`${request.ticketId}: ${decision}`,bookingId:request.bookingId,createdAt:new Date(),read:false});
   return res.json({message:'Parts Request updated',status:decision});
 }
 if(request.status!=='approved')return res.status(409).json({message:'প্রথমে Parts Request Approve করতে হবে; তারপর Issued করুন।'});
 const parts=Array.isArray(request.parts)?request.parts:[];
 if(!parts.length||parts.some(p=>!ObjectId.isValid(String(p.itemId||''))||!Number.isFinite(Number(p.quantity))||Number(p.quantity)<=0))return res.status(400).json({message:'Stock issue করতে হলে প্রতিটি part-এ valid inventory itemId এবং positive quantity থাকতে হবে। পুরোনো name-only request নতুন করে submit করুন।'});
 const totals=new Map();for(const p of parts){const id=String(p.itemId);totals.set(id,(totals.get(id)||0)+Number(p.quantity));}
 const client=(await import('../db.js')).getMongoClient(); const session=client.startSession(); let response;
 try { await session.withTransaction(async()=>{
   const current=await dbx.collection('partsRequests').findOne({requestId:req.params.id,status:'approved'},{session});if(!current)throw Object.assign(new Error('Request status changed; refresh and try again.'),{statusCode:409});
   const movementIds=[]; let totalExpense=0;
   for(const [itemId,quantity] of totals){
     const item=await dbx.collection('inventory').findOne({_id:new ObjectId(itemId)},{session});if(!item)throw Object.assign(new Error(`Inventory item ${itemId} not found`),{statusCode:404});
     const updated=await dbx.collection('inventory').updateOne({_id:item._id,quantity:{$gte:quantity}},{$inc:{quantity:-quantity},$set:{updatedAt:new Date()}},{session});
     if(!updated.modifiedCount)throw Object.assign(new Error(`Insufficient stock for ${item.name}. Available: ${item.quantity} ${item.unit||'pcs'}`),{statusCode:409});
     const unitCost=Math.max(0,Number(item.costPrice)||0),createdAt=new Date(),sourceKey=`parts-request:${request.requestId}:${itemId}`;
     const movement={itemId:item._id.toString(),itemName:item.name,sku:item.sku||'',type:'out',quantity,unit:item.unit||'pcs',unitCost,totalCost:quantity*unitCost,bookingId:request.bookingId,requestId:request.requestId,note:`Parts Request ${request.ticketId||request.bookingId}`,createdAt,createdBy:req.user.email,sourceKey};
     const saved=await dbx.collection('inventoryMovements').insertOne(movement,{session});
     await dbx.collection('financeEntries').updateOne({sourceKey},{$setOnInsert:{type:'expense',category:'Service material usage',amount:quantity*unitCost,note:`${item.name} · ${quantity} ${item.unit||'pcs'} · ${request.ticketId||request.bookingId}`,date:createdAt,createdAt,createdBy:req.user.email,sourceType:'parts-request-issue',sourceId:String(saved.insertedId),sourceKey,bookingId:request.bookingId,itemId:item._id.toString(),requestId:request.requestId}},{upsert:true,session});
     movementIds.push(String(saved.insertedId));totalExpense+=quantity*unitCost;
   }
   const changed=await dbx.collection('partsRequests').updateOne({requestId:req.params.id,status:'approved'},{$set:{status:'issued',issuedAt:new Date(),issuedBy:req.user.sub,decisionNote:String(req.body.note||'').slice(0,1000),inventoryMovementIds:movementIds,ledgerExpense:totalExpense}},{session});
   if(!changed.modifiedCount)throw Object.assign(new Error('Request status changed; refresh and try again.'),{statusCode:409});
   await dbx.collection('notifications').insertOne({recipientId:request.technicianId,type:'parts-issued',title:'Parts Issued',message:`${request.ticketId}: requested parts issued`,bookingId:request.bookingId,createdAt:new Date(),read:false},{session});
   response={message:'Parts issued; inventory and expense ledger updated atomically',status:'issued',totalExpense,movementIds};
 }); } catch(e){ if(e.statusCode)return res.status(e.statusCode).json({message:e.message}); throw e; } finally {await session.endSession();}
 res.json(response);
}catch(e){next(e)}});
router.get('/notifications', requireAuth, async(req,res,next)=>{try{const userId=String(req.user.sub);const roles=req.user.role==='admin'?['admin','staff','technician','all']:[req.user.role,'all'];const filter={$or:[{recipientId:userId},{recipientRole:{$in:roles}}]};const notifications=await db().collection('notifications').find(filter).sort({createdAt:-1}).limit(100).toArray();res.json({notifications,unread:notifications.filter(n=>!n.read).length})}catch(e){next(e)}});
router.patch('/notifications/:id/read', requireAuth, async(req,res,next)=>{try{const id=oid(req.params.id);if(!id)return res.status(400).json({message:'Invalid notification ID'});const roles=req.user.role==='admin'?['admin','staff','technician','all']:[req.user.role,'all'];const result=await db().collection('notifications').updateOne({_id:id,$or:[{recipientId:String(req.user.sub)},{recipientRole:{$in:roles}}]},{$set:{read:true,readAt:new Date()}});if(!result.matchedCount)return res.status(404).json({message:'Notification not found'});res.json({message:'Notification marked as read'})}catch(e){next(e)}});
export default router;
