import React, { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Facebook,
  Headphones,
  Home,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  X,
  Zap,
  Search,
  ClipboardList,
  LogOut,
  RefreshCw,
  Filter,
  Send,
  MonitorCog,
  Building2,
  MessageCircle,
  Trash2,
  Camera,
  UserRound,
  Wallet,
} from "lucide-react";
import CMSPage, { PublicCMSPage } from "../pages-CMS.jsx";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
import { fallbackServices, fallbackPackages, money } from "../models/catalog.js";
import { useSiteContent } from "../hooks/useSiteContent.js";


export function AccountPage({ mode }) {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    accountType: mode === "technician" ? "technician" : "customer",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register" || mode === "technician";
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${API}/auth/${register ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "অনুরোধ সম্পন্ন হয়নি");
      if (register && !d.token) {
        setError(d.message || "নিবন্ধন গ্রহণ করা হয়েছে।");
        return;
      }
      sessionStorage.setItem("muUserToken", d.token);
      sessionStorage.setItem("muUser", JSON.stringify(d.user || d.admin));
      if ((d.user || d.admin)?.role === "admin") {
        sessionStorage.setItem("muAdminToken", d.token);
        sessionStorage.setItem("muAdmin", JSON.stringify(d.user || d.admin));
        nav("/admin");
      } else if ((d.user || d.admin)?.role === "technician")
        nav("/technician/dashboard");
      else nav("/dashboard");
    } catch (e) {
      setError(
        e.message.includes("Failed to fetch")
          ? "সার্ভারের সঙ্গে সংযোগ হচ্ছে না।"
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="account-page">
      <form className="account-card" onSubmit={submit}>
        <h1>
          {mode === "technician"
            ? "Technician Registration"
            : register
              ? "নতুন অ্যাকাউন্ট তৈরি করুন"
              : "আপনার অ্যাকাউন্টে লগইন করুন"}
        </h1>
        <p>
          {mode === "technician"
            ? "Technician account তৈরি করে নিজের বরাদ্দ কাজ ও job status পরিচালনা করুন।"
            : register
              ? "বুকিং ট্র্যাক করতে ও আপনার সার্ভিসের তথ্য দেখতে নিবন্ধন করুন।"
              : "বুকিং ও ড্যাশবোর্ডে প্রবেশ করতে লগইন করুন।"}
        </p>
        {error && <div className="alert error">{error}</div>}
        {register && (
          <label>
            আপনার নাম
            <input
              required
              minLength="2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="সম্পূর্ণ নাম"
            />
          </label>
        )}
        {register && (
          <label>
            মোবাইল নম্বর
            <input
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="01XXXXXXXXX"
            />
          </label>
        )}
        {register && mode !== "technician" && (
          <label>
            অ্যাকাউন্টের ধরন
            <select
              value={form.accountType}
              onChange={(e) =>
                setForm({ ...form, accountType: e.target.value })
              }
            >
              <option value="customer">Customer / Client</option>
              <option value="technician">
                Technician (Admin approval required)
              </option>
              <option value="staff">Staff (Admin approval required)</option>
            </select>
          </label>
        )}
        <label>
          ইমেইল
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="name@example.com"
          />
        </label>
        <label>
          পাসওয়ার্ড
          <input
            type="password"
            required
            minLength={register ? 8 : 1}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={register ? "কমপক্ষে ৮ অক্ষর" : "আপনার পাসওয়ার্ড"}
          />
        </label>
        <button className="btn btn-primary btn-full" disabled={busy}>
          {busy
            ? "অপেক্ষা করুন…"
            : register
              ? "অ্যাকাউন্ট তৈরি করুন"
              : "লগইন করুন"}{" "}
          <ArrowRight size={16} />
        </button>
        {!register && (
          <p className="forgot-password-link">
            <Link to="/forgot-password">পাসওয়ার্ড ভুলে গেছেন?</Link>
          </p>
        )}
        <p className="account-switch">
          {register ? "আগে থেকেই অ্যাকাউন্ট আছে? " : "অ্যাকাউন্ট নেই? "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "লগইন করুন" : "রেজিস্টার করুন"}
          </Link>
        </p>
        <Link to="/" className="back-home">
          ← ওয়েবসাইটে ফিরে যান
        </Link>
      </form>
    </main>
  );
}

export function PasswordRecoveryPage({ reset = false }) {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (reset && password !== confirmPassword)
        throw new Error("দুইটি পাসওয়ার্ড একই হতে হবে।");
      const path = reset ? "/auth/reset-password" : "/auth/forgot-password";
      const body = reset ? { token, password } : { email };
      const r = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "অনুরোধ সম্পন্ন হয়নি");
      setNotice(d.message || "অনুরোধ সম্পন্ন হয়েছে।");
      if (reset) {
        setPassword("");
        setConfirmPassword("");
      }
    } catch (e) {
      setError(
        e.message.includes("Failed to fetch")
          ? "সার্ভারের সঙ্গে সংযোগ হচ্ছে না।"
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="account-page">
      <form className="account-card" onSubmit={submit}>
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Home size={22} />
          </span>
          <span>
            <strong>
              MU <b>HOME SERVICE</b>
            </strong>
            <small>ACCOUNT RECOVERY</small>
          </span>
        </Link>
        <h1>{reset ? "নতুন পাসওয়ার্ড সেট করুন" : "পাসওয়ার্ড ভুলে গেছেন?"}</h1>
        <p>
          {reset
            ? "আপনার অ্যাকাউন্টের জন্য একটি নতুন, নিরাপদ পাসওয়ার্ড তৈরি করুন।"
            : "আপনার নিবন্ধিত ইমেইল ঠিকানা দিন। পাসওয়ার্ড পরিবর্তনের নিরাপদ লিংক ইমেইলে পাঠানো হবে।"}
        </p>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        {reset ? (
          <>
            {!token && (
              <div className="alert error">
                Reset token পাওয়া যায়নি। ইমেইলের লিংকটি সম্পূর্ণ কপি করে খুলুন।
              </div>
            )}
            <label>
              নতুন পাসওয়ার্ড
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="কমপক্ষে ৮ অক্ষর"
              />
            </label>
            <label>
              নতুন পাসওয়ার্ড নিশ্চিত করুন
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="পাসওয়ার্ড আবার লিখুন"
              />
            </label>
            <button
              className="btn btn-primary btn-full"
              disabled={busy || !token}
            >
              {busy ? "সংরক্ষণ হচ্ছে…" : "নতুন পাসওয়ার্ড সেট করুন"}{" "}
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <label>
              ইমেইল ঠিকানা
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </label>
            <button className="btn btn-primary btn-full" disabled={busy}>
              {busy ? "ইমেইল পাঠানো হচ্ছে…" : "Reset link ইমেইলে পাঠান"}{" "}
              <ArrowRight size={16} />
            </button>
          </>
        )}
        <p className="account-switch">
          <Link to="/login">লগইন পেজে ফিরে যান</Link>
        </p>
        <Link to="/" className="back-home">
          ← ওয়েবসাইটে ফিরে যান
        </Link>
      </form>
    </main>
  );
}

export function UserDashboard({ mode = "auto" }) {
  const [user, setUser] = useState(() =>
    JSON.parse(sessionStorage.getItem("muUser") || "null"),
  );
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState({});
  const [assigning, setAssigning] = useState("");
  const [notice, setNotice] = useState("");
  const [paymentsData, setPaymentsData] = useState({ payments: [], bookings: [] });
  const [earningsData, setEarningsData] = useState(null);
  const [feedbackForms, setFeedbackForms] = useState({});
  const [photoBusy, setPhotoBusy] = useState("");
  const isTechnicianView = mode === "technician" || user?.role === "technician";
  const isStaffView = user?.role === "staff";
  const nextTechnicianStatus = { Assigned: "On the way", "On the way": "Inspection", Inspection: "In progress", "In progress": "Completed" };
  async function updateJobStatus(bookingId, status) {
    const token = sessionStorage.getItem("muUserToken"); setError(""); setNotice(""); setAssigning(bookingId);
    try {
      const r = await fetch(`${API}/technician/bookings/${bookingId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.message || "Status আপডেট করা যায়নি");
      setNotice(d.message || "কাজের Status আপডেট হয়েছে।");
      const refreshed = await fetch(`${API}/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } });
      const summary = await refreshed.json(); if (refreshed.ok) setData(summary);
    } catch (e) { setError(e.message); } finally { setAssigning(""); }
  }
  useEffect(() => {
    const token = sessionStorage.getItem("muUserToken");
    if (!token) {
      setError("ড্যাশবোর্ড দেখতে আগে লগইন করুন।");
      return;
    }
    fetch(`${API}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        setData(d);
        if (d.role === "customer") {
          const [pr, fr] = await Promise.all([
            fetch(`${API}/customer/payments`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/customer/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (pr.ok) setPaymentsData(await pr.json());
          if (fr.ok) { const fd = await fr.json(); setData(old => old ? { ...old, bookings: fd.bookings } : old); }
        }
        if (d.role === "technician") {
          const er = await fetch(`${API}/technician/earnings`, { headers: { Authorization: `Bearer ${token}` } });
          if (er.ok) setEarningsData(await er.json());
        }
        if (d.canAssign) {
          const tr = await fetch(`${API}/bookings/assignable-technicians`, { headers: { Authorization: `Bearer ${token}` } });
          const td = await tr.json();
          if (!tr.ok) throw new Error(td.message || "Technician list load হয়নি");
          setTechnicians(td.technicians || []);
          setSelectedTechnicians(Object.fromEntries((d.bookings || []).map((b) => [b._id, b.technicianIds || (b.technicianId ? [b.technicianId] : [])])));
        }
      })
      .catch((e) => setError(e.message));
  }, []);
  async function saveTechnicianAssignment(bookingId) {
    const token = sessionStorage.getItem("muUserToken");
    setAssigning(bookingId); setError(""); setNotice("");
    try {
      const r = await fetch(`${API}/bookings/${bookingId}/technicians`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ technicianIds: selectedTechnicians[bookingId] || [] }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.message || "Assign করা যায়নি");
      setNotice("Technician assignment সফলভাবে আপডেট হয়েছে।");
      const refreshed = await fetch(`${API}/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } });
      const summary = await refreshed.json(); if (refreshed.ok) setData(summary);
    } catch (e) { setError(e.message); } finally { setAssigning(""); }
  }
  async function customerCancel(booking) {
    if (!window.confirm(`${booking.ticketId} বুকিংটি বাতিল করবেন?`)) return;
    const token = sessionStorage.getItem("muUserToken");
    try {
      const r = await fetch(`${API}/customer/bookings/${booking._id}/cancel`, { method:"PATCH", headers:{Authorization:`Bearer ${token}`} });
      const d = await r.json(); if (!r.ok) throw new Error(d.message || "Cancel করা যায়নি");
      setNotice(d.message); const rr = await fetch(`${API}/dashboard/summary`, {headers:{Authorization:`Bearer ${token}`}}); if(rr.ok) setData(await rr.json());
    } catch(e) { setError(e.message); }
  }
  async function submitFeedback(bookingId) {
    const form = feedbackForms[bookingId] || { rating:5, comment:"" };
    try {
      const token = sessionStorage.getItem("muUserToken");
      const r = await fetch(`${API}/feedback`, {method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({bookingId,rating:Number(form.rating),comment:form.comment})});
      const d = await r.json(); if(!r.ok) throw new Error(d.message || "Feedback জমা হয়নি");
      setNotice("ধন্যবাদ! আপনার Feedback জমা হয়েছে।");
      setFeedbackForms(old=>({...old,[bookingId]:{...form,submitted:true}}));
    } catch(e) { setError(e.message); }
  }
  async function decideAssignment(bookingId, decision) {
    const token = sessionStorage.getItem("muUserToken"); setAssigning(bookingId); setError("");
    try { const r = await fetch(`${API}/technician/bookings/${bookingId}/decision`, {method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({decision})}); const d=await r.json(); if(!r.ok) throw new Error(d.message || "Decision failed"); setNotice(d.message); const rr=await fetch(`${API}/dashboard/summary`,{headers:{Authorization:`Bearer ${token}`}}); if(rr.ok)setData(await rr.json()); }
    catch(e){setError(e.message)} finally{setAssigning("")}
  }
  async function uploadWorkPhotos(bookingId, files) {
    if (!files?.length) return;
    const token = sessionStorage.getItem("muUserToken"); const body = new FormData();
    Array.from(files).slice(0,5).forEach(f=>body.append("photos",f)); setPhotoBusy(bookingId); setError("");
    try { const r=await fetch(`${API}/technician/bookings/${bookingId}/photos`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body}); const d=await r.json(); if(!r.ok) throw new Error(d.message || "ছবি আপলোড হয়নি"); setNotice("কাজের ছবি আপলোড হয়েছে।"); }
    catch(e){setError(e.message)} finally{setPhotoBusy("")}
  }
  function logout() {
    sessionStorage.removeItem("muUserToken");
    sessionStorage.removeItem("muUser");
    setUser(null);
    setData(null);
    setError("আপনি লগআউট করেছেন।");
  }
  return (
    <main className="user-dashboard">
      <div className="container">
        <div className="dashboard-title">
          <div>
            <span className="section-kicker">{isTechnicianView ? "TECHNICIAN WORKSPACE" : isStaffView ? "STAFF WORKSPACE" : "MY ACCOUNT"}</span>
            <h1>{isTechnicianView ? "Technician Dashboard" : isStaffView ? "Staff Dashboard" : `স্বাগতম, ${user?.name || "ব্যবহারকারী"}`}</h1>
            <p>{isTechnicianView ? "আপনার নামে Assign করা কাজ, সময়সূচি ও কাজের অগ্রগতি পরিচালনা করুন।" : isStaffView ? "Booking queue দেখুন এবং অনুমতি থাকলে Technician assign করুন।" : "আপনার MU Home Service অ্যাকাউন্ট ও সার্ভিস আপডেট।"}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(isTechnicianView || isStaffView || user?.role === "admin") && <Link className="btn btn-primary" to={isTechnicianView ? "/technician/operations" : "/operations"}>Service Operations</Link>}
            {user?.role === "customer" && <Link className="btn btn-primary" to="/my-quotations">আমার Quotation</Link>}
            <Link className="btn btn-outline" to="/profile">
              প্রোফাইল আপডেট
            </Link>
            <button className="btn btn-outline" onClick={logout}>
              <LogOut size={16} /> লগআউট
            </button>
          </div>
        </div>
        {notice && <div className="alert success">{notice}</div>}
        {error && (
          <div className="alert error">
            {error} <Link to="/login">লগইন</Link>
          </div>
        )}
        {data && (
          <>
            <div className="dashboard-stats">
              <div className="stat-card">
                <span>মোট সার্ভিস</span>
                <b>{data.total}</b>
                <ClipboardList />
              </div>
              <div className="stat-card">
                <span>সম্পন্ন</span>
                <b>{data.completed}</b>
                <CheckCircle2 />
              </div>
              <div className="stat-card">
                <span>আপনার Role</span>
                <b className="role-value">{data.role}</b>
                <ShieldCheck />
              </div>
            </div>
            {isTechnicianView && earningsData && <div className="dashboard-stats" style={{marginTop:16}}><div className="stat-card"><span>সম্পন্ন কাজ</span><b>{earningsData.completedJobs}</b><ClipboardList /></div><div className="stat-card"><span>কমিশন হার</span><b>{earningsData.commissionRate}%</b><Wallet /></div><div className="stat-card"><span>মোট কমিশন</span><b>৳{Number(earningsData.totalEarnings||0).toLocaleString()}</b><Wallet /></div></div>}
            {user?.role === "customer" && <div className="admin-table-card" style={{marginBottom:18}}><div className="table-toolbar"><div><h2>আমার পেমেন্ট</h2><p>আপনার বুকিংয়ের রেকর্ড করা পেমেন্ট ও বকেয়া দেখুন।</p></div></div><div className="table-scroll"><table className="bookings-table"><thead><tr><th>টিকিট</th><th>সার্ভিস</th><th>পরিশোধ</th><th>মোট বিল</th><th>স্ট্যাটাস</th></tr></thead><tbody>{(paymentsData.bookings||[]).map(p=><tr key={String(p._id)}><td>{p.ticketId}</td><td>{p.serviceName}</td><td>৳{Number(p.paidAmount||0).toLocaleString()}</td><td>৳{Number(p.expectedAmount||0).toLocaleString()}</td><td>{p.paymentStatus}</td></tr>)}{!paymentsData.bookings?.length&&<tr><td colSpan="5">এখনো কোনো পেমেন্ট রেকর্ড নেই। অনলাইন পেমেন্ট সক্রিয় না থাকলে Admin-এর সঙ্গে যোগাযোগ করুন।</td></tr>}</tbody></table></div></div>}
            <div className="admin-table-card">
              <div className="table-toolbar">
                <div>
                  <h2>{isTechnicianView ? "আমার Assign করা কাজ" : isStaffView ? "Booking Management" : "সার্ভিস হিস্ট্রি"}</h2>
                  <p>{isTechnicianView ? "প্রতিটি কাজের Status পরবর্তী ধাপে আপডেট করুন।" : isStaffView ? "নতুন ও চলমান Booking-এর তালিকা" : "আপনার সাম্প্রতিক বুকিং"}</p>
                </div>
                {!isTechnicianView && !isStaffView && <Link className="btn btn-primary" to="/book">নতুন বুকিং</Link>}
              </div>
              {data.bookings?.length ? (
                <div className="table-scroll">
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>টিকিট</th>
                        <th>সার্ভিস</th>
                        <th>তারিখ</th>
                        <th>স্ট্যাটাস</th>
                        {data.canAssign && <th>Technician Assign</th>}
                        {isTechnicianView && <th>কাজের পরবর্তী ধাপ</th>}
                        {(isTechnicianView || isStaffView || user?.role === "customer") && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {data.bookings.map((b) => (
                        <tr key={b._id}>
                          <td>
                            <b>{b.ticketId}</b>
                          </td>
                          <td>{b.serviceName}</td>
                          <td>
                            {new Date(b.createdAt).toLocaleDateString("bn-BD")}
                          </td>
                          <td>{b.status}</td>
                          {data.canAssign && <td className="account-assignment-cell">
                            <div className="account-assignment-controls">
                            <select className="technician-multi-select" multiple value={selectedTechnicians[b._id] || b.technicianIds || (b.technicianId ? [b.technicianId] : [])} onChange={(e) => setSelectedTechnicians((old) => ({ ...old, [b._id]: Array.from(e.target.selectedOptions, (o) => o.value) }))} aria-label="Technician নির্বাচন করুন" style={{ minHeight: 76 }}>
                              {technicians.map((t) => <option key={t._id} value={t._id}>{t.name} {t.phone ? `(${t.phone})` : ""}</option>)}
                            </select>
                            <button className="btn btn-primary assign-technicians-button" disabled={assigning === b._id} onClick={() => saveTechnicianAssignment(b._id)}>{assigning === b._id ? "Saving..." : "Assign"}</button>
                            </div>
                          </td>}
                          {isTechnicianView && <td><div style={{display:"grid",gap:6,minWidth:130}}><span>{b.status}</span>{!b.technicianDecisions?.[user?._id]?.decision && <><button className="btn btn-primary btn-small" disabled={assigning === b._id} onClick={() => decideAssignment(b._id,"accepted")}>কাজ গ্রহণ</button><button className="btn btn-outline btn-small" disabled={assigning === b._id} onClick={() => decideAssignment(b._id,"rejected")}>প্রত্যাখ্যান</button></>}{nextTechnicianStatus[b.status] && <button className="btn btn-primary btn-small" disabled={assigning === b._id} onClick={() => updateJobStatus(b._id, nextTechnicianStatus[b.status])}>{assigning === b._id ? "Saving…" : nextTechnicianStatus[b.status]}</button>}</div></td>}
                          {(isTechnicianView || isStaffView || user?.role === "customer") && <td><div style={{display:"grid",gap:8,minWidth:160}}>
                            {isTechnicianView && <label className="btn btn-outline btn-small" style={{cursor:"pointer"}}>কাজের ছবি আপলোড<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e=>uploadWorkPhotos(b._id,e.target.files)} disabled={photoBusy===b._id}/></label>}
                            {isStaffView && <div style={{display:"flex",gap:6}}><select aria-label="Booking status" defaultValue={b.status} onChange={e=>setSelectedTechnicians(old=>({...old,[`status-${b._id}`]:e.target.value}))}><option>New</option><option>Contacted</option><option>Assigned</option><option>On the way</option><option>Inspection</option><option>Quotation sent</option><option>Approved</option><option>In progress</option><option>Completed</option><option>Cancelled</option></select><button className="btn btn-primary btn-small" onClick={async()=>{try{const t=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/bookings/${b._id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({status:selectedTechnicians[`status-${b._id}`]||b.status})});const d=await r.json();if(!r.ok)throw new Error(d.message);setNotice("Booking status আপডেট হয়েছে।");const rr=await fetch(`${API}/dashboard/summary`,{headers:{Authorization:`Bearer ${t}`}});if(rr.ok)setData(await rr.json())}catch(e){setError(e.message)}}}>Save</button></div>}
                            {user?.role === "customer" && ["New","Contacted"].includes(b.status) && <button className="btn btn-outline btn-small" onClick={()=>customerCancel(b)}>বুকিং বাতিল</button>}
                            {user?.role === "customer" && b.status === "Completed" && !feedbackForms[b._id]?.submitted && <><label>রেটিং <select value={feedbackForms[b._id]?.rating || 5} onChange={e=>setFeedbackForms(old=>({...old,[b._id]:{...(old[b._id]||{}),rating:e.target.value}}))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} ★</option>)}</select></label><textarea placeholder="আপনার মতামত লিখুন" value={feedbackForms[b._id]?.comment || ""} onChange={e=>setFeedbackForms(old=>({...old,[b._id]:{...(old[b._id]||{}),comment:e.target.value}}))}/><button className="btn btn-primary btn-small" onClick={()=>submitFeedback(b._id)}>Feedback জমা দিন</button></>}
                          </div></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <ClipboardList size={32} />
                  <h3>{isTechnicianView ? "এখনো কোনো কাজ Assign করা হয়নি" : isStaffView ? "এখনো কোনো Booking নেই" : "এখনো কোনো বুকিং নেই"}</h3>
                  <p>{isTechnicianView ? "Admin বা অনুমতিপ্রাপ্ত Staff আপনাকে Booking Assign করলে এখানে দেখা যাবে।" : isStaffView ? "নতুন Customer Booking এলে এখানে দেখা যাবে।" : "আপনার প্রথম সার্ভিসটি এখনই বুক করুন।"}</p>
                  {!isTechnicianView && !isStaffView && <Link className="btn btn-primary" to="/book">সার্ভিস বুক করুন</Link>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export function ProfilePage() {
  const [token, setToken] = useState(() =>
    window.location.search.includes("account=admin")
      ? sessionStorage.getItem("muAdminToken") || ""
      : sessionStorage.getItem("muUserToken") ||
        sessionStorage.getItem("muAdminToken") ||
        "",
  );
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(
        window.location.search.includes("account=admin")
          ? sessionStorage.getItem("muAdmin") || "null"
          : sessionStorage.getItem("muUser") ||
              sessionStorage.getItem("muAdmin") ||
              "null",
      );
    } catch {
      return null;
    }
  });
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordForm, setPasswordForm] = useState({currentPassword:"",newPassword:"",confirmPassword:""});
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const origin = API.replace(/\/api\/?$/, "");
  const resolveProfilePhoto = (value) => {
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const normalized = value.startsWith("/") ? value : `/${value}`;
    // Keep profile images on the API prefix so reverse proxies route them to Express.
    return `${API}${normalized.startsWith("/api/") ? normalized.replace(/^\/api/, "") : normalized}`;
  };
  useEffect(() => {
    if (!token) {
      setError("প্রোফাইল দেখতে আগে লগইন করুন।");
      return;
    }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "প্রোফাইল লোড করা যায়নি");
        setProfile(d.user);
        setName(d.user.name || "");
        setPhone(d.user.phone || "");
        setPreview(
          d.user.profilePhoto
            ? `${resolveProfilePhoto(d.user.profilePhoto)}?v=${encodeURIComponent(Date.now())}`
            : "",
        );
        const key = d.user.role === "admin" ? "muAdmin" : "muUser";
        sessionStorage.setItem(key, JSON.stringify(d.user));
      })
      .catch((e) => setError(e.message));
  }, []);
  async function changePassword(e) {
    e.preventDefault(); setPasswordBusy(true); setPasswordError(""); setPasswordNotice("");
    try {
      const r = await fetch(`${API}/auth/me/password`, {method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(passwordForm)});
      const d = await r.json(); if(!r.ok) throw new Error(d.message || "পাসওয়ার্ড পরিবর্তন করা যায়নি");
      setPasswordNotice(d.message || "পাসওয়ার্ড পরিবর্তন হয়েছে।"); setPasswordForm({currentPassword:"",newPassword:"",confirmPassword:""});
    } catch(e) { setPasswordError(e.message); } finally { setPasswordBusy(false); }
  }
  function choosePhoto(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("JPG, PNG অথবা WebP ছবি নির্বাচন করুন।");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setError("ছবির সাইজ সর্বোচ্চ ৩ MB হতে পারবে।");
      return;
    }
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new FormData();
      body.append("name", name);
      body.append("phone", phone);
      if (photo) body.append("profilePhoto", photo);
      const r = await fetch(`${API}/auth/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "প্রোফাইল আপডেট করা যায়নি");
      setProfile(d.user);
      setName(d.user.name || "");
      setPhone(d.user.phone || "");
      setPreview(
        d.user.profilePhoto
          ? `${resolveProfilePhoto(d.user.profilePhoto)}?v=${encodeURIComponent(Date.now())}`
          : "",
      );
      setPhoto(null);
      const key = d.user.role === "admin" ? "muAdmin" : "muUser";
      sessionStorage.setItem(key, JSON.stringify(d.user));
      window.dispatchEvent(new Event("mu-account-changed"));
      setNotice(d.message || "প্রোফাইল আপডেট হয়েছে।");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <main className="inner-page">
        <div className="container tracking-wrap">
          <div className="alert error">
            {error} <Link to="/login">লগইন</Link>
          </div>
        </div>
      </main>
    );
  return (
    <main className="inner-page">
      <div
        className="container"
        style={{ maxWidth: 850, paddingTop: 45, paddingBottom: 70 }}
      >
        <span className="section-kicker">ACCOUNT SETTINGS</span>
        <h1>
          আমার <span>প্রোফাইল</span>
        </h1>
        <p>আপনার অ্যাকাউন্টের নাম, ফোন নম্বর ও প্রোফাইল ফটো আপডেট করুন।</p>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="alert success" role="status">
            {notice}
          </div>
        )}
        <form
          onSubmit={save}
          className="admin-table-card"
          style={{ padding: 28, marginTop: 24 }}
        >
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 116,
                height: 116,
                borderRadius: "50%",
                overflow: "hidden",
                background: "#eef2f7",
                display: "grid",
                placeItems: "center",
                border: "3px solid #dbe4ee",
                flexShrink: 0,
              }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="প্রোফাইল ফটো"
                  onError={() => setPreview("")}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <UserRound size={54} color="#718096" />
              )}
            </div>
            <div>
              <label
                className="btn btn-outline"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <Camera size={17} /> ছবি নির্বাচন করুন
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={choosePhoto}
                  style={{ display: "none" }}
                />
              </label>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
                JPG, PNG বা WebP · সর্বোচ্চ ৩ MB
              </p>
              <p style={{ fontSize: 13, color: "#64748b" }}>
                Role: <b>{profile?.role || "account"}</b>
              </p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              পূর্ণ নাম *
              <input
                required
                minLength="2"
                maxLength="100"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="আপনার পূর্ণ নাম"
              />
            </label>
            <label>
              ফোন নম্বর
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="01XXXXXXXXX"
              />
            </label>
            <label>
              ইমেইল
              <input value={profile?.email || ""} readOnly disabled />
            </label>
            <label>
              অ্যাকাউন্ট Role
              <input value={profile?.role || ""} readOnly disabled />
            </label>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 24,
            }}
          >
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "সংরক্ষণ হচ্ছে…" : "প্রোফাইল সংরক্ষণ করুন"}
            </button>
            <Link
              className="btn btn-outline"
              to={profile?.role === "admin" ? "/admin" : "/dashboard"}
            >
              ফিরে যান
            </Link>
          </div>
        </form>
        <form onSubmit={changePassword} className="admin-table-card" style={{padding:28,marginTop:22}}>
          <span className="section-kicker">SECURITY</span><h2 style={{marginTop:6}}>পাসওয়ার্ড পরিবর্তন</h2><p>নিরাপত্তার জন্য বর্তমান পাসওয়ার্ড দিন এবং নতুন পাসওয়ার্ড নিশ্চিত করুন।</p>
          {passwordError && <div className="alert error" role="alert">{passwordError}</div>}{passwordNotice && <div className="alert success" role="status">{passwordNotice}</div>}
          <div className="form-grid">
            <label>বর্তমান পাসওয়ার্ড *<input required type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={e=>setPasswordForm({...passwordForm,currentPassword:e.target.value})}/></label>
            <label>নতুন পাসওয়ার্ড *<input required minLength="8" type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={e=>setPasswordForm({...passwordForm,newPassword:e.target.value})} placeholder="কমপক্ষে ৮ অক্ষর"/></label>
            <label>নতুন পাসওয়ার্ড নিশ্চিত করুন *<input required minLength="8" type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={e=>setPasswordForm({...passwordForm,confirmPassword:e.target.value})}/></label>
          </div>
          <div style={{marginTop:20}}><button className="btn btn-primary" disabled={passwordBusy}>{passwordBusy?"পরিবর্তন হচ্ছে…":"পাসওয়ার্ড পরিবর্তন করুন"}</button></div>
        </form>
      </div>
    </main>
  );
}
