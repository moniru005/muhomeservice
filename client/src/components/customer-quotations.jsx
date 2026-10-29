import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, FileText } from 'lucide-react';
import { apiUrl } from '../services/apiClient.js';
import './customer-quotations.css';
const token = () => sessionStorage.getItem('muUserToken') || '';
async function api(path, options={}) {
 const r=await fetch(apiUrl(path),{...options,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`,...(options.headers||{})}});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||`Request failed (${r.status})`);return d;
}
export default function CustomerQuotations(){
 const [rows,setRows]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){setError('');try{if(!token())throw new Error('Quotation দেখতে আগে Customer account-এ লগইন করুন।');const d=await api('operations/customer/quotations');setRows(d.quotations||[])}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[]);
 async function requestAgain(q){try{const id=q.booking?._id||q.bookingId;const d=await api(`operations/customer/bookings/${id}/request-quotation`,{method:'POST',body:JSON.stringify({})});setNotice(d.message||'নতুন Quotation চাওয়া হয়েছে');await load()}catch(e){setError(e.message)}}
 async function decide(q,decision){if(!window.confirm(decision==='approved'?'এই Quotation অনুমোদন করবেন?':'এই Quotation প্রত্যাখ্যান করবেন?'))return;setBusy(true);setError('');setNotice('');try{await api(`operations/quotations/${encodeURIComponent(q.quotationId)}/decision`,{method:'PATCH',body:JSON.stringify({decision})});setNotice(decision==='approved'?'Quotation অনুমোদন করা হয়েছে।':'Quotation প্রত্যাখ্যান করা হয়েছে।');await load()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <main className="customer-quotes"><div className="cq-shell"><Link to="/dashboard" className="cq-back"><ArrowLeft size={16}/> Dashboard</Link><header className="cq-head"><div><span>MU HOME SERVICE</span><h1>আমার Quotation</h1><p>আপনার Booking-এর Service Quotation পর্যালোচনা করুন এবং সিদ্ধান্ত দিন।</p></div><button onClick={load} className="cq-refresh"><RefreshCw size={16}/> Refresh</button></header>
 {error&&<div className="cq-alert error">{error}</div>}{notice&&<div className="cq-alert success"><CheckCircle2 size={17}/>{notice}</div>}
 {!rows.length&&!error?<div className="cq-empty"><FileText size={30}/><b>এখনো কোনো Quotation নেই</b><p>নতুন Quotation পাঠানো হলে এখানে দেখা যাবে।</p></div>:<div className="cq-list">{rows.map(q=><article className="cq-card" key={q.quotationId}><div className="cq-cardhead"><div><span className="cq-ticket">{q.booking?.ticketId||q.ticketId||'Booking'}</span><h2>{q.booking?.serviceName||'Service Quotation'}</h2><p>{q.createdAt?new Date(q.createdAt).toLocaleString('bn-BD'):''}</p></div><span className={`cq-status ${q.status}`}>{({pending:'সিদ্ধান্ত অপেক্ষমাণ',approved:'অনুমোদিত',rejected:'প্রত্যাখ্যাত'})[q.status]||q.status}</span></div>
 <div className="cq-items">{(q.items||[]).map((item,i)=><div key={i}><span>{item.description} × {item.quantity}</span><b>৳{(Number(item.quantity)*Number(item.unitPrice)).toLocaleString('en-BD')}</b></div>)}</div><div className="cq-totals"><span>Subtotal <b>৳{Number(q.subtotal||0).toLocaleString('en-BD')}</b></span><span>Discount <b>৳{Number(q.discount||0).toLocaleString('en-BD')}</b></span><strong>Total <b>৳{Number(q.total||0).toLocaleString('en-BD')}</b></strong></div>{q.notes&&<p className="cq-notes">{q.notes}</p>}{q.status==='rejected'&&<div className="cq-actions"><button disabled={busy} onClick={()=>requestAgain(q)}><RefreshCw size={16}/> নতুন Quotation চাই</button></div>}{q.status==='pending'&&<div className="cq-actions"><button disabled={busy} onClick={()=>decide(q,'approved')}><CheckCircle2 size={16}/> Approve Quotation</button><button disabled={busy} className="reject" onClick={()=>decide(q,'rejected')}><XCircle size={16}/> Reject</button></div>}</article>)}</div>}
 </div></main>
}
