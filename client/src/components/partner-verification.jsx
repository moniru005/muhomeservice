import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, ShieldAlert, ShieldCheck, Home, RefreshCw } from 'lucide-react';
import './partner-verification.css';

const API=(import.meta.env.VITE_API_URL||'http://localhost:5000/api').replace(/\/$/,'');
export default function PartnerVerification(){
  const {token}=useParams();
  const [data,setData]=useState(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
  async function load(){setBusy(true);setError('');try{const r=await fetch(`${API}/public/partner-verification/${encodeURIComponent(token)}`,{cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Verification record not found');setData(d);}catch(e){setError(e.message);setData(null);}finally{setBusy(false);}}
  useEffect(()=>{load();},[token]);
  return <main className="partner-verify-page"><section className="partner-verify-card"><div className="partner-verify-brand"><ShieldCheck size={26}/><span>MU HOME SERVICE</span></div>{busy?<div className="partner-verify-loading">Verifying Partner identity…</div>:error?<><div className="partner-verify-icon inactive"><ShieldAlert size={42}/></div><h1>Verification Unavailable</h1><p>{error}</p></>:<><div className={`partner-verify-icon ${data.verified?'active':'inactive'}`}>{data.verified?<BadgeCheck size={44}/>:<ShieldAlert size={44}/>}</div><span className={`partner-verify-status ${data.verified?'active':'inactive'}`}>{data.status}</span><h1>{data.businessName}</h1><p className="partner-verify-id">{data.partnerId} · {data.partnerType==='company'?'Business Partner':'Individual Partner'}</p><p>{data.message}</p><div className="partner-verify-details"><div><small>Service Areas</small><b>{data.serviceAreas?.length?data.serviceAreas.join(', '):'Not listed'}</b></div><div><small>Services</small><b>{data.serviceIds?.length?data.serviceIds.join(', '):'Not listed'}</b></div><div><small>Verification checked</small><b>{new Date(data.checkedAt).toLocaleString()}</b></div></div></> }<button className="partner-verify-refresh" onClick={load} disabled={busy}><RefreshCw size={15}/> Re-check status</button><Link to="/" className="partner-verify-home"><Home size={15}/> MU Home Service</Link><footer>Only the current authorization status is displayed. Personal identity documents and private contact details are never shown here.</footer></section></main>;
}
