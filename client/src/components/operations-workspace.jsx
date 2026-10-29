import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, FileText, Package, Bell, RefreshCw, Send, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { apiUrl } from '../services/apiClient.js';
import './operations-workspace.css';

const getToken = () => sessionStorage.getItem('muUserToken') || sessionStorage.getItem('muAdminToken') || '';
async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}

export default function OperationsWorkspace({ mode = 'auto' }) {
  const [user, setUser] = useState(() => JSON.parse(sessionStorage.getItem('muUser') || sessionStorage.getItem('muAdmin') || 'null'));
  const [tab, setTab] = useState(() => sessionStorage.getItem('muAdminToken') ? 'reports' : 'jobs');
  const [summary, setSummary] = useState(null);
  const [partsRequests, setPartsRequests] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [serviceReports, setServiceReports] = useState([]);
  const [quotationTemplates, setQuotationTemplates] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [report, setReport] = useState({ diagnosis: '', workDone: '', notes: '', partsUsed: '' });
  const [reportPhotoBusy, setReportPhotoBusy] = useState(false);
  const [quote, setQuote] = useState({ description: 'Service charge', quantity: '1', unitPrice: '', discount: '0', notes: '' });
  const [parts, setParts] = useState({ itemId: '', name: '', quantity: '1', note: '' });
  const role = user?.role || (sessionStorage.getItem('muAdminToken') ? 'admin' : mode === 'technician' ? 'technician' : '');
  const technician = role === 'technician';
  const staffOrAdmin = ['staff', 'admin'].includes(role);
  const bookings = summary?.bookings || [];
  const currentBooking = bookings.find(b => b._id === selectedBooking) || bookings[0];

  async function loadAll() {
    setError('');
    if (!getToken()) { setError('এই পেজ ব্যবহার করতে আগে লগইন করুন।'); return; }
    const failures = [];
    // Load each section independently so a failing dashboard/booking endpoint
    // cannot prevent notifications from loading or refreshing.
    try {
      const s = await request('dashboard/summary');
      setSummary(s);
      if (!selectedBooking && s.bookings?.length) setSelectedBooking(s.bookings[0]._id);
    } catch (e) { failures.push(`Dashboard: ${e.message}`); }
    if (staffOrAdmin) {
      const results = await Promise.allSettled([request('operations/parts-requests'), request('operations/service-reports'), request('quotation-templates')]);
      if (results[0].status === 'fulfilled') setPartsRequests(results[0].value.requests || []);
      else failures.push(`Parts Requests: ${results[0].reason.message}`);
      if (results[1].status === 'fulfilled') setServiceReports(results[1].value.reports || []);
      else failures.push(`Service Reports: ${results[1].reason.message}`);
      if (results[2].status === 'fulfilled') setQuotationTemplates(results[2].value.templates || []);
      else if (!results[2].reason.message.includes('permission')) failures.push(`Quotation templates: ${results[2].reason.message}`);
    }
    if (technician) {
      try { const inv = await request('operations/inventory/catalog'); setInventoryItems(inv.items || []); }
      catch (e) { failures.push(`Inventory: ${e.message}`); }
    }
    try {
      const n = await request('notifications');
      setNotifications(Array.isArray(n.notifications) ? n.notifications : []);
    } catch (e) { failures.push(`Notifications: ${e.message}`); }
    if (failures.length) setError(failures.join(' · '));
  }
  async function refreshAll() {
    setNotice('');
    await loadAll();
    setNotice(current => current || 'তথ্য রিফ্রেশ করা হয়েছে।');
  }
  useEffect(() => {
    let active = true;
    async function refreshCurrentUser() {
      const token = getToken();
      if (!token) { loadAll(); return; }
      try {
        const profile = await request('auth/me');
        if (!active || !profile.user) return;
        const latestUser = profile.user;
        setUser(latestUser);
        const isAdmin = latestUser.role === 'admin' || Boolean(sessionStorage.getItem('muAdminToken'));
        const canCreateQuotation = isAdmin || (latestUser.role === 'staff' && ((latestUser.permissions || []).includes('manageQuotations') || (latestUser.rolePermissions?.quotations || []).some(a => ['*','create'].includes(a))));
        if (canCreateQuotation) setTab(current => current === 'jobs' ? 'quotation' : current);
        else setTab(current => current === 'quotation' ? 'jobs' : current);
        if (sessionStorage.getItem('muUserToken')) sessionStorage.setItem('muUser', JSON.stringify(latestUser));
        else if (sessionStorage.getItem('muAdminToken')) sessionStorage.setItem('muAdmin', JSON.stringify(latestUser));
      } catch (_) {
        // Keep the existing session profile if the profile refresh endpoint is unavailable.
      }
    }
    refreshCurrentUser();
    return () => { active = false; };
  }, []);
  useEffect(() => { loadAll(); }, [user]);
  useEffect(() => { if (!selectedBooking && bookings.length) setSelectedBooking(bookings[0]._id); }, [bookings, selectedBooking]);
  const counts = useMemo(() => ({ active: bookings.filter(b => !['Completed', 'Cancelled'].includes(b.status)).length, completed: bookings.filter(b => b.status === 'Completed').length, unread: notifications.filter(n => !n.read).length }), [bookings, notifications]);

  async function uploadReportPhotos(files) {
    if (!currentBooking || !files?.length) return;
    const form = new FormData(); Array.from(files).slice(0,5).forEach(file => form.append('photos', file));
    setReportPhotoBusy(true); setError(''); setNotice('');
    try { const token=getToken(); const response=await fetch(apiUrl(`operations/bookings/${currentBooking._id}/photos`),{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form}); const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.message||'ছবি আপলোড হয়নি');setNotice(`${data.photos?.length||0}টি ছবি রিপোর্টের সঙ্গে যুক্ত হয়েছে।`);await loadAll(); } catch(e){setError(e.message)} finally{setReportPhotoBusy(false)}
  }
  async function submitReport(e) {
    e.preventDefault(); if (!currentBooking) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`operations/bookings/${currentBooking._id}/report`, { method: 'POST', body: JSON.stringify({ diagnosis: report.diagnosis, workDone: report.workDone, notes: report.notes, partsUsed: report.partsUsed ? report.partsUsed.split(',').map(name => ({ name: name.trim(), quantity: 1 })) : [] }) });
      setNotice('Service Report সফলভাবে জমা হয়েছে।'); setReport({ diagnosis: '', workDone: '', notes: '', partsUsed: '' }); await loadAll();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }
  async function submitQuote(e) {
    e.preventDefault();
    if (role !== 'admin' && !(user?.role === 'staff' && ((user?.permissions || []).includes('manageQuotations') || (user?.rolePermissions?.quotations || []).some(a => ['*','create'].includes(a))))) { setError('Quotation তৈরির অনুমতি নেই। Admin-এর কাছ থেকে Create quotations permission নিন।'); setTab('jobs'); return; }
    if (!currentBooking) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`operations/bookings/${currentBooking._id}/quotations`, { method: 'POST', body: JSON.stringify({ items: [{ description: quote.description, quantity: Number(quote.quantity), unitPrice: Number(quote.unitPrice) }], discount: Number(quote.discount), notes: quote.notes }) });
      setNotice('Quotation তৈরি হয়েছে এবং Customer-এর কাছে পাঠানো হয়েছে।'); setQuote({ description: 'Service charge', quantity: '1', unitPrice: '', discount: '0', notes: '' }); await loadAll();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }
  async function saveQuotationTemplate() {
    if (!currentBooking) return;
    const name = window.prompt('এই Service-এর Quotation Template-এর নাম দিন'); if (!name) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request('quotation-templates', { method:'POST', body:JSON.stringify({ name, serviceId:currentBooking.serviceId || currentBooking.serviceName, serviceName:currentBooking.serviceName || 'Service', items:[{description:quote.description,quantity:Number(quote.quantity),unitPrice:Number(quote.unitPrice||0)}], notes:quote.notes }) });
      setNotice('Service অনুযায়ী Quotation Template সংরক্ষিত হয়েছে।'); await loadAll();
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function submitParts(e) {
    e.preventDefault(); if (!currentBooking) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request('operations/parts-requests', { method: 'POST', body: JSON.stringify({ bookingId: currentBooking._id, parts: [{ itemId: parts.itemId, name: parts.name, quantity: Number(parts.quantity), note: parts.note }] }) });
      setNotice('Parts Request পাঠানো হয়েছে।'); setParts({ itemId: '', name: '', quantity: '1', note: '' }); await loadAll();
    } catch (e2) { setError(e2.message); } finally { setBusy(false); }
  }
  async function decideParts(id, status) {
    setBusy(true); setError(''); setNotice('');
    try { await request(`operations/parts-requests/${encodeURIComponent(id)}/decision`, { method: 'PATCH', body: JSON.stringify({ status }) }); setNotice('Parts Request আপডেট হয়েছে।'); await loadAll(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function markRead(n) {
    try { await request(`notifications/${n._id}/read`, { method: 'PATCH', body: '{}' }); setNotifications(old => old.map(x => x._id === n._id ? { ...x, read: true } : x)); }
    catch (e) { setError(e.message); }
  }
  async function markAllRead() {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) { try { await request(`notifications/${n._id}/read`, { method: 'PATCH', body: '{}' }); } catch (e) { setError(e.message); return; } }
    setNotifications(old => old.map(n => ({ ...n, read: true }))); setNotice(`${unread.length}টি Notification read হিসেবে চিহ্নিত হয়েছে।`);
  }

  return <main className="ops-workspace"><div className="ops-shell">
    <header className="ops-heading"><div><Link to={technician ? '/technician/dashboard' : '/dashboard'} className="ops-back"><ArrowLeft size={16}/> Dashboard</Link><span className="ops-kicker">MU HOME SERVICE · OPERATIONS</span><h1>{technician ? 'Technician Workspace' : 'Service Operations'}</h1><p>{technician ? 'Service Report তৈরি করুন, Parts Request পাঠান এবং নিজের কাজ পরিচালনা করুন।' : 'Service Report, Quotation, Parts Request ও Notification একই জায়গা থেকে পরিচালনা করুন।'}</p></div><button className="ops-refresh" onClick={refreshAll}><RefreshCw size={16}/> Refresh</button></header>
    {error && <div className="ops-alert error"><AlertCircle size={18}/>{error}</div>}{notice && <div className="ops-alert success"><CheckCircle2 size={18}/>{notice}</div>}
    <section className="ops-metrics">
      <div className="ops-metric-card ops-metric-bookings"><span className="ops-metric-icon"><ClipboardCheck size={22}/></span><span>মোট Booking</span><strong>{summary?.total ?? '—'}</strong><small>সকল বুকিংয়ের সারসংক্ষেপ</small></div>
      <div className="ops-metric-card ops-metric-active"><span className="ops-metric-icon"><RefreshCw size={22}/></span><span>চলমান কাজ</span><strong>{counts.active}</strong><small>বর্তমানে চলমান সার্ভিস</small></div>
      <div className="ops-metric-card ops-metric-completed"><span className="ops-metric-icon"><CheckCircle2 size={22}/></span><span>সম্পন্ন কাজ</span><strong>{summary?.completed ?? counts.completed}</strong><small>সম্পন্ন সার্ভিসের সংখ্যা</small></div>
      <div className="ops-metric-card ops-metric-notifications"><span className="ops-metric-icon"><Bell size={22}/></span><span>Unread Notification</span><strong>{counts.unread}</strong><small>পড়ার অপেক্ষায় থাকা নোটিফিকেশন</small></div>
    </section>
    <nav className="ops-tabs">{[...(role !== 'admin' ? [{id:'jobs',label:'কাজ ও রিপোর্ট',icon:ClipboardCheck}] : []),...((role==='admin'||role==='staff'&&(user?.rolePermissions?.quotations||[]).some(a=>['*','create'].includes(a)))?[{id:'quotation',label:'Quotation',icon:FileText}]:[]),...(technician ? [{id:'parts',label:'Parts Request',icon:Package}] : []),...(staffOrAdmin ? [{id:'reports',label:`Service Reports${serviceReports.length ? ` (${serviceReports.length})` : ''}`,icon:ClipboardCheck},{id:'parts-admin',label:'Parts Requests',icon:Package}] : []),{id:'notifications',label:`Notifications${counts.unread ? ` (${counts.unread})` : ''}`,icon:Bell}].map(t => <button key={t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}><t.icon size={17}/>{t.label}</button>)}</nav>
    <section className="ops-panel">
      <div className="ops-panel-title"><div><h2>{tab==='jobs'?'Service Report জমা দিন':tab==='quotation'?'Quotation তৈরি':tab==='parts'?'যন্ত্রাংশের অনুরোধ':tab==='reports'?'Submitted Service Reports':tab==='parts-admin'?'Parts Request Approval':'Notification Center'}</h2><p>তথ্য জমা দেওয়ার আগে Booking নির্বাচন করুন।</p></div></div>
      {['jobs','quotation','parts'].includes(tab) && <label className="ops-field">Booking নির্বাচন করুন<select value={currentBooking?._id || ''} onChange={e=>setSelectedBooking(e.target.value)}><option value="">Booking নির্বাচন করুন</option>{bookings.map(b=><option key={b._id} value={b._id}>{b.ticketId || b._id} · {b.serviceName || 'Service'} · {b.status}</option>)}</select></label>}
      {tab==='jobs' && <form className="ops-form" onSubmit={submitReport}><div className="ops-selected"><b>{currentBooking?.ticketId || 'Booking নির্বাচন করা হয়নি'}</b><span>{currentBooking?.serviceName} · {currentBooking?.status}</span></div><label className="ops-field">সমস্যার নির্ণয় *<textarea required value={report.diagnosis} onChange={e=>setReport({...report,diagnosis:e.target.value})} placeholder="Customer-এর সমস্যার Diagnosis লিখুন"/></label><label className="ops-field">সম্পন্ন কাজের বিবরণ *<textarea required value={report.workDone} onChange={e=>setReport({...report,workDone:e.target.value})} placeholder="কী কী কাজ করা হয়েছে লিখুন"/></label><label className="ops-field">ব্যবহৃত Parts (কমা দিয়ে আলাদা করুন)<input value={report.partsUsed} onChange={e=>setReport({...report,partsUsed:e.target.value})} placeholder="যেমন: Filter, Cable"/></label><label className="ops-field">অতিরিক্ত Note<textarea value={report.notes} onChange={e=>setReport({...report,notes:e.target.value})} placeholder="অতিরিক্ত তথ্য বা Follow-up"/></label><label className="ops-field">Report-এর ছবি সরাসরি আপলোড (সর্বোচ্চ ৫টি)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>uploadReportPhotos(e.target.files)} disabled={reportPhotoBusy||!currentBooking}/><small>{reportPhotoBusy?'ছবি আপলোড হচ্ছে…':'JPG, PNG, WebP · প্রতি ছবি সর্বোচ্চ ৫ MB'}</small></label><button className="ops-submit" disabled={busy||!currentBooking}><Send size={16}/>{busy?'জমা হচ্ছে…':'Service Report জমা দিন'}</button></form>}
      {tab==='quotation' && <form className="ops-form" onSubmit={submitQuote}><div className="ops-selected"><b>{currentBooking?.ticketId || 'Booking নির্বাচন করা হয়নি'}</b><span>{currentBooking?.serviceName}</span></div><label className="ops-field">এই Service-এর Template ব্যবহার করুন<select value="" onChange={e=>{const t=quotationTemplates.find(x=>x.templateId===e.target.value);if(t?.items?.[0])setQuote(q=>({...q,description:t.items[0].description,quantity:String(t.items[0].quantity),unitPrice:String(t.items[0].unitPrice),notes:t.notes||q.notes}));}}><option value="">Template নির্বাচন করুন</option>{quotationTemplates.filter(t=>!currentBooking?.serviceId||t.serviceId===currentBooking.serviceId||t.serviceId===currentBooking.serviceName).map(t=><option key={t.templateId} value={t.templateId}>{t.name} · {t.serviceName}</option>)}</select></label><div className="ops-grid"><label className="ops-field">Item / Service Description *<input required value={quote.description} onChange={e=>setQuote({...quote,description:e.target.value})}/></label><label className="ops-field">Quantity *<input required type="number" min="0.01" step="0.01" value={quote.quantity} onChange={e=>setQuote({...quote,quantity:e.target.value})}/></label><label className="ops-field">Unit Price (৳) *<input required type="number" min="0" step="0.01" value={quote.unitPrice} onChange={e=>setQuote({...quote,unitPrice:e.target.value})}/></label><label className="ops-field">Discount (৳)<input type="number" min="0" step="0.01" value={quote.discount} onChange={e=>setQuote({...quote,discount:e.target.value})}/></label></div><div className="ops-total"><span>Quotation Total</span><strong>৳{Math.max(0, Number(quote.quantity||0)*Number(quote.unitPrice||0)-Number(quote.discount||0)).toLocaleString('en-BD')}</strong></div><label className="ops-field">Note<textarea value={quote.notes} onChange={e=>setQuote({...quote,notes:e.target.value})} placeholder="Quotation-এর শর্ত বা ব্যাখ্যা"/></label><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="ops-submit" type="submit" disabled={busy||!currentBooking||!quote.unitPrice}><Send size={16}/>Quotation পাঠান</button><button className="ops-submit" type="button" disabled={busy||!currentBooking||!quote.description} onClick={saveQuotationTemplate}>এই Service-এর Template Save</button></div></form>}
      {tab==='parts' && <form className="ops-form" onSubmit={submitParts}><div className="ops-selected"><b>{currentBooking?.ticketId || 'Booking নির্বাচন করা হয়নি'}</b><span>{currentBooking?.serviceName}</span></div><div className="ops-grid"><label className="ops-field">Inventory থেকে যন্ত্রাংশ নির্বাচন করুন *<select required value={parts.itemId} onChange={e=>{const item=inventoryItems.find(x=>x._id===e.target.value);setParts({...parts,itemId:e.target.value,name:item?.name||''});}}><option value="">যন্ত্রাংশ নির্বাচন করুন</option>{inventoryItems.map(item=><option key={item._id} value={item._id}>{item.name} · Stock {item.quantity} {item.unit||'pcs'}</option>)}</select></label><label className="ops-field">পরিমাণ *<input required type="number" min="1" step="1" max={inventoryItems.find(x=>x._id===parts.itemId)?.quantity||undefined} value={parts.quantity} onChange={e=>setParts({...parts,quantity:e.target.value})}/></label></div><label className="ops-field">কেন প্রয়োজন / Note<textarea value={parts.note} onChange={e=>setParts({...parts,note:e.target.value})}/></label><button className="ops-submit" disabled={busy||!currentBooking||!parts.itemId}><Send size={16}/>Parts Request পাঠান</button></form>}
      {tab==='reports' && <div className="ops-list">{serviceReports.length ? serviceReports.map(r=><article className="ops-list-item" key={r.reportId || r._id}><div><b>{r.ticketId || r.bookingId} · {r.createdByEmail || r.createdBy || 'Submitter unknown'}</b><p><strong>Diagnosis:</strong> {r.diagnosis || '—'}</p><p><strong>Work done:</strong> {r.workDone || '—'}</p><p><strong>Parts:</strong> {(r.partsUsed||[]).map(p=>`${p.name} × ${p.quantity}`).join(', ') || '—'}</p>{(r.evidencePhotos||[]).length>0&&<p><strong>Evidence:</strong> {(r.evidencePhotos||[]).map((p,i)=><a key={p.url||i} href={apiUrl(String(p.url||'').replace(/^\/api\//,''))} target='_blank' rel='noreferrer' style={{marginRight:8}}>ছবি {i+1}</a>)}</p>}<small>{r.createdAt ? new Date(r.createdAt).toLocaleString('bn-BD') : ''} · {r.role || ''}</small></div></article>) : <div className="ops-empty">এখনো কোনো Service Report জমা হয়নি।</div>}</div>}
      {tab==='parts-admin' && <div className="ops-list">{partsRequests.length ? partsRequests.map(r=><article className="ops-list-item" key={r.requestId}><div><b>{r.ticketId} · {r.technicianName}</b><p>{(r.parts||[]).map(p=>`${p.name} × ${p.quantity}`).join(', ')}</p><span className={`ops-status ${r.status}`}>{r.status}</span></div>{r.status==='pending'&&<div className="ops-actions"><button onClick={()=>decideParts(r.requestId,'approved')} disabled={busy}>Approve</button><button className="danger" onClick={()=>decideParts(r.requestId,'rejected')} disabled={busy}>Reject</button></div>}{r.status==='approved'&&<div className="ops-actions"><button onClick={()=>decideParts(r.requestId,'issued')} disabled={busy}>Issue Stock & Record Expense</button></div>}</article>) : <div className="ops-empty">কোনো Parts Request পাওয়া যায়নি।</div>}</div>}
      {tab==='notifications' && <><div className="ops-actions"><button onClick={()=>setNotificationFilter('all')}>সব</button><button onClick={()=>setNotificationFilter('unread')}>Unread ({counts.unread})</button><button onClick={()=>setNotificationFilter('read')}>Read</button><button onClick={markAllRead} disabled={!counts.unread||busy}>সব Read করুন</button><button onClick={refreshAll}>Refresh</button></div><div className="ops-list">{notifications.filter(n=>notificationFilter==='all'||(notificationFilter==='unread'?!n.read:n.read)).length ? notifications.filter(n=>notificationFilter==='all'||(notificationFilter==='unread'?!n.read:n.read)).map(n=><article className={`ops-list-item ${n.read?'read':''}`} key={n._id}><div><b>{n.title || n.type || 'Notification'}</b><p>{n.message || 'নতুন আপডেট পাওয়া গেছে।'}</p><small>{n.createdAt ? new Date(n.createdAt).toLocaleString('bn-BD') : ''}</small></div>{!n.read&&<button onClick={()=>markRead(n)}>Read করুন</button>}</article>) : <div className="ops-empty">এই Filter-এ কোনো Notification নেই।</div>}</div></>}
    </section>
    <p className="ops-footnote">কোনো কাজ না দেখালে আপনার Role, Account Approval, Booking Assignment এবং Permission পরীক্ষা করুন।</p>
  </div></main>;
}
