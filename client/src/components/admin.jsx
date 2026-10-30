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
  Pencil,
  Camera,
  UserRound,
  Wallet,
  TrendingDown,
  Scale,
  Package,
} from "lucide-react";
import CMSPage, { PublicCMSPage } from "../pages-CMS.jsx";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
import { fallbackServices, fallbackPackages, money } from "../models/catalog.js";
import { useSiteContent } from "../hooks/useSiteContent.js";


export function AdminPage() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("muAdminToken") || "",
  );
  const [admin, setAdmin] = useState(() =>
    JSON.parse(sessionStorage.getItem("muAdmin") || "null"),
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [adminOpsTab, setAdminOpsTab] = useState("requests");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [assignableTechnicians, setAssignableTechnicians] = useState([]);
  const [commissionTechnicians, setCommissionTechnicians] = useState([]);
  const [customerDirectory, setCustomerDirectory] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPagination, setCustomerPagination] = useState({page:1,pages:1,total:0,limit:25});
  const [onlinePayments, setOnlinePayments] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [assignmentSelections, setAssignmentSelections] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    fresh: 0,
    progress: 0,
    completed: 0,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [bookingPage, setBookingPage] = useState(1);
  const [bookingPagination, setBookingPagination] = useState({ page:1, pages:1, total:0, limit:25 });
  const [notice, setNotice] = useState("");
  async function api(path, opts = {}) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  }
  async function loginSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(login),
      });
      sessionStorage.setItem("muAdminToken", res.token);
      sessionStorage.setItem("muAdmin", JSON.stringify(res.user || res.admin));
      setToken(res.token);
      setAdmin(res.user || res.admin);
    } catch (e) {
      setError(
        e.message.includes("Failed to fetch")
          ? "Backend চালু নেই বা API URL ভুল।"
          : e.message,
      );
    } finally {
      setLoading(false);
    }
  }
  async function refresh() {
    try {
      const [b, s, tech, commissions, customers, online, refunds] = await Promise.all([
        api(`/admin/bookings?status=${encodeURIComponent(statusFilter)}&q=${encodeURIComponent(query)}&page=${bookingPage}&limit=25`),
        api("/admin/stats"),
        api("/admin/technicians"),
        api("/admin/technicians/commission"),
        api(`/admin/customers?q=${encodeURIComponent(customerQuery)}&page=${customerPage}&limit=25`),
        api("/admin/online-payments"),
        api("/admin/refunds"),
      ]);
      setBookings(b.bookings);
      setBookingPagination(b.pagination || {page:1,pages:1,total:b.bookings?.length||0,limit:25});
      setStats(s);
      setAssignableTechnicians((tech.technicians || []).filter(t => (t.technicianStatus || t.accountStatus) === "approved"));
      setCommissionTechnicians(commissions.technicians || []);
      setCustomerDirectory(customers.customers || []);
      setCustomerPagination(customers.pagination || {page:1,pages:1,total:customers.customers?.length||0,limit:25});
      setOnlinePayments(online.payments || []);
      setRefundRequests(refunds.refunds || []);
      setError("");
    } catch (e) {
      setError(e.message);
      if (
        e.message.includes("Session expired") ||
        e.message.includes("Admin login")
      )
        logout();
    }
  }
  useEffect(() => {
    if (token) refresh();
  }, [token, statusFilter, bookingPage, customerPage]);
  function logout() {
    sessionStorage.removeItem("muAdminToken");
    sessionStorage.removeItem("muAdmin");
    setToken("");
    setAdmin(null);
    setBookings([]);
  }
  async function updateStatus(id, status) {
    try {
      await api(`/admin/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice("Booking status আপডেট হয়েছে।");
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  async function assignTechnicians(booking) {
    const technicianIds = assignmentSelections[booking._id] ?? booking.technicianIds ?? (booking.technicianId ? [booking.technicianId] : []);
    try {
      await api(`/bookings/${booking._id}/technicians`, { method: "PATCH", body: JSON.stringify({ technicianIds }) });
      setNotice("Technician assignment আপডেট হয়েছে।");
      await refresh();
    } catch (e) { setError(e.message); }
  }
  async function deleteBooking(booking) {
    if (
      !window.confirm(
        `আপনি কি ${booking.ticketId} বুকিংটি Archive করতে চান? Finance/Payment history অক্ষত থাকবে।`,
      )
    )
      return;
    setError("");
    setNotice("");
    try {
      await api(`/admin/bookings/${booking._id}`, { method: "DELETE" });
      setNotice(`বুকিং ${booking.ticketId} Archive করা হয়েছে; Finance/Payment history অক্ষত আছে।`);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }
  if (!token)
    return (
      <main className="admin-login-page">
        <form className="admin-login-card" onSubmit={loginSubmit}>
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Home size={22} />
            </span>
            <span>
              <strong>
                MU <b>HOME SERVICE</b>
              </strong>
              <small>ADMIN PORTAL</small>
            </span>
          </Link>
          <h1>Admin Login</h1>
          <p>Booking ও service request পরিচালনা করতে লগইন করুন।</p>
          {error && <div className="alert error">{error}</div>}
          <label>
            Email
            <input
              type="email"
              required
              value={login.email}
              onChange={(e) => setLogin({ ...login, email: e.target.value })}
              placeholder="admin@muhomeservice.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              value={login.password}
              onChange={(e) => setLogin({ ...login, password: e.target.value })}
              placeholder="Admin password"
            />
          </label>
          <button className="btn btn-primary btn-full" disabled={loading}>
            {loading ? "Logging in..." : "Login to Dashboard"}{" "}
            <ArrowRight size={16} />
          </button>
          <Link to="/" className="back-home">
            ← ওয়েবসাইটে ফিরে যান
          </Link>
        </form>
      </main>
    );
  return (
    <main className="admin-page">
      <div className="admin-top">
        <div className="container admin-top-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <Home size={22} />
            </span>
            <span>
              <strong>
                MU <b>HOME SERVICE</b>
              </strong>
              <small>ADMIN DASHBOARD</small>
            </span>
          </Link>
          <div className="admin-user">
            <span className="admin-welcome">Welcome, {admin?.name || "Admin"}</span>
            <div className="admin-profile-menu-wrap">
              <button
                type="button"
                className="admin-avatar-trigger"
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen(open => !open)}
              >
                <span className="admin-avatar"><UserRound size={20} /></span>
                <ChevronDown size={15} />
              </button>
              {profileMenuOpen && (
                <div className="admin-profile-dropdown">
                  <Link to="/admin" onClick={() => setProfileMenuOpen(false)}><Home size={16} /> Dashboard</Link>
                  <Link to="/profile?account=admin" onClick={() => setProfileMenuOpen(false)}><UserRound size={16} /> আমার প্রোফাইল</Link>
                  <button type="button" onClick={() => { setProfileMenuOpen(false); logout(); }}><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="container admin-content">
        <div className="admin-heading">
          <div>
            <span className="section-kicker">OPERATIONS</span>
            <h1>Service Requests</h1>
            <p>নতুন বুকিং, status ও customer details পরিচালনা করুন।</p>
          </div>
          <div className="admin-heading-actions">
            <Link className="btn btn-primary" to="/admin/cms">
              CMS / Page Builder
            </Link>
            <Link className="btn btn-outline" to="/admin/management">
              Management Center
            </Link>
            <Link className="btn btn-outline" to="/operations">
              Service Operations
            </Link>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        <div className="stats-grid">
          <button
            type="button"
            className={`stat-card stat-card-link${!statusFilter ? " is-active" : ""}`}
            onClick={() => { setQuery(""); setStatusFilter(""); }}
            aria-label={`Show all service requests: ${stats.total}`}
            aria-pressed={!statusFilter}
          >
            <span>Total bookings</span>
            <b>{stats.total}</b>
            <ClipboardList />
            <small>{!statusFilter ? "সব request দেখুন" : "সব request দেখুন"} →</small>
          </button>
          <button
            type="button"
            className={`stat-card stat-card-link${statusFilter === "New" ? " is-active" : ""}`}
            onClick={() => {
              setQuery("");
              setStatusFilter((current) => current === "New" ? "" : "New");
            }}
            aria-label={`Show new service requests: ${stats.fresh}`}
            aria-pressed={statusFilter === "New"}
          >
            <span>New requests</span>
            <b>{stats.fresh}</b>
            <CalendarDays />
            <small>{statusFilter === "New" ? "সব request দেখুন" : "নতুন request দেখুন"} →</small>
          </button>
          <button
            type="button"
            className={`stat-card stat-card-link${statusFilter === "In Progress" ? " is-active" : ""}`}
            onClick={() => { setQuery(""); setStatusFilter((current) => current === "In Progress" ? "" : "In Progress"); }}
            aria-label={`Show in-progress service requests: ${stats.progress}`}
            aria-pressed={statusFilter === "In Progress"}
          >
            <span>In progress</span>
            <b>{stats.progress}</b>
            <Wrench />
            <small>{statusFilter === "In Progress" ? "সব request দেখুন" : "In-progress request দেখুন"} →</small>
          </button>
          <button
            type="button"
            className={`stat-card stat-card-link${statusFilter === "Completed" ? " is-active" : ""}`}
            onClick={() => { setQuery(""); setStatusFilter((current) => current === "Completed" ? "" : "Completed"); }}
            aria-label={`Show completed service requests: ${stats.completed}`}
            aria-pressed={statusFilter === "Completed"}
          >
            <span>Completed</span>
            <b>{stats.completed}</b>
            <CheckCircle2 />
            <small>{statusFilter === "Completed" ? "সব request দেখুন" : "Completed request দেখুন"} →</small>
          </button>
        </div>
        <div className="admin-operations-tabs" role="tablist" aria-label="Admin operations">
          <button type="button" role="tab" aria-selected={adminOpsTab === "requests"} className={`admin-operations-tab${adminOpsTab === "requests" ? " is-active" : ""}`} onClick={() => setAdminOpsTab("requests")}>All Requests</button>
          <button type="button" role="tab" aria-selected={adminOpsTab === "commission"} className={`admin-operations-tab${adminOpsTab === "commission" ? " is-active" : ""}`} onClick={() => setAdminOpsTab("commission")}>Technician Commission Rate</button>
          <button type="button" role="tab" aria-selected={adminOpsTab === "payments"} className={`admin-operations-tab${adminOpsTab === "payments" ? " is-active" : ""}`} onClick={() => setAdminOpsTab("payments")}>Online Payments &amp; Refunds</button>
          <button type="button" role="tab" aria-selected={adminOpsTab === "customers"} className={`admin-operations-tab${adminOpsTab === "customers" ? " is-active" : ""}`} onClick={() => setAdminOpsTab("customers")}>Customer Directory</button>
        </div>
        {adminOpsTab === "commission" && (
        <div className="admin-table-card" style={{marginBottom:18}}>
          <div className="table-toolbar"><div><h2>Technician Commission Rate</h2><p>প্রতিটি Technician-এর কমিশন হার Admin এখান থেকে নিয়ন্ত্রণ করতে পারবেন।</p></div></div>
          <div className="table-scroll"><table className="bookings-table"><thead><tr><th>Technician</th><th>Skills / Area</th><th>Commission %</th><th>Action</th></tr></thead><tbody>
            {commissionTechnicians.map(t=><tr key={t._id}><td><b>{t.name}</b><small style={{display:'block'}}>{t.phone||t.email||''}</small></td><td>{(t.skills||[]).join(', ')||'—'} <small style={{display:'block'}}>{(t.serviceAreas||[]).join(', ')||'Area not set'}</small></td><td><input aria-label={`${t.name} commission rate`} type="number" min="0" max="100" step="0.25" defaultValue={Number(t.commissionRate||0)} id={`commission-${t._id}`} style={{width:100,padding:8,border:'1px solid #dce3ea',borderRadius:8}} /></td><td><button className="btn btn-primary btn-small" onClick={async()=>{try{const input=document.getElementById(`commission-${t._id}`);await api(`/admin/technicians/${t._id}/commission`,{method:'PATCH',body:JSON.stringify({commissionRate:Number(input.value)})});setNotice(`${t.name}-এর commission rate আপডেট হয়েছে।`);await refresh()}catch(e){setError(e.message)}}}>Save rate</button></td></tr>)}
            {!commissionTechnicians.length&&<tr><td colSpan="4">Technician পাওয়া যায়নি।</td></tr>}
          </tbody></table></div>
        </div>
        )}
        {adminOpsTab === "payments" && (
        <div className="admin-table-card" style={{marginBottom:18}}>
          <div className="table-toolbar"><div><h2>Online Payments & Refunds</h2><p>Refund request তৈরি করুন এবং Provider-side refund যাচাইয়ের পরে status আপডেট করুন।</p></div></div>
          <div className="table-scroll"><table className="bookings-table"><thead><tr><th>Payment</th><th>Booking</th><th>Amount</th><th>Status</th><th>Refund</th></tr></thead><tbody>
            {onlinePayments.map(p=><tr key={p.paymentId}><td><b>{p.paymentId}</b><small style={{display:'block'}}>{p.providerTransactionId||'No provider ref'}</small></td><td>{p.ticketId}</td><td>৳{Number(p.amount||0).toLocaleString('en-BD')}</td><td>{p.status}</td><td><button className="btn btn-outline btn-small" disabled={p.status!=='paid'} onClick={async()=>{const amount=window.prompt('Refund amount (BDT)',String(p.amount));if(!amount)return;const reason=window.prompt('Refund reason');if(!reason)return;try{await api('/admin/refunds',{method:'POST',body:JSON.stringify({paymentId:p.paymentId,amount:Number(amount),reason})});setNotice('Refund request রেকর্ড হয়েছে; provider refund এখনো আলাদাভাবে process করতে হবে।');await refresh()}catch(e){setError(e.message)}}}>Request refund</button></td></tr>)}
            {!onlinePayments.length&&<tr><td colSpan="5">Online payment record পাওয়া যায়নি।</td></tr>}
          </tbody></table></div>
          <div className="table-scroll" style={{marginTop:16}}><table className="bookings-table"><thead><tr><th>Refund ID</th><th>Ticket</th><th>Amount</th><th>Reason</th><th>Status / Review</th></tr></thead><tbody>{refundRequests.map(r=><tr key={r.refundId}><td>{r.refundId}</td><td>{r.ticketId||r.bookingId}</td><td>৳{Number(r.amount||0).toLocaleString('en-BD')}</td><td>{r.reason}</td><td><div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}><span>{r.status}</span>{['requested','approved','reconciliation_required'].includes(r.status)&&<><button className="btn btn-outline btn-small" onClick={async()=>{try{await api(`/admin/refunds/${r.refundId}`,{method:'PATCH',body:JSON.stringify({status:'approved'})});setNotice('Refund approved; provider-side refund execute করে reference সংরক্ষণ করুন।');await refresh()}catch(e){setError(e.message)}}}>Approve</button><button className="btn btn-outline btn-small" onClick={async()=>{try{await api(`/admin/refunds/${r.refundId}`,{method:'PATCH',body:JSON.stringify({status:'rejected',reviewNote:'Rejected by admin'})});await refresh()}catch(e){setError(e.message)}}}>Reject</button><button className="btn btn-primary btn-small" onClick={async()=>{if(!window.confirm('Provider-এর refund API কল করে refund process করবেন?'))return;try{const result=await api(`/admin/refunds/${r.refundId}/process`,{method:'POST',body:JSON.stringify({})});setNotice(`Refund provider থেকে নিশ্চিত হয়েছে: ${result.providerRefundReference||''}`);await refresh()}catch(e){setError(e.message)}}}>Process provider refund</button></>}</div></td></tr>)}{!refundRequests.length&&<tr><td colSpan="5">কোনো Refund request নেই।</td></tr>}</tbody></table></div>
        </div>
        )}
        {adminOpsTab === "customers" && (
        <div className="admin-table-card" style={{marginBottom:18}}>
          <div className="table-toolbar"><div><h2>Customer Directory</h2><p>সব Customer খুঁজুন; ফলাফল পেজ অনুযায়ী দেখানো হয়।</p></div><span>{customerPagination.total||0} customers</span></div>
          <div className="table-filters"><label className="search-box"><Search size={17}/><input value={customerQuery} onChange={e=>setCustomerQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(setCustomerPage(1),refresh())} placeholder="নাম, ফোন বা Email দিয়ে খুঁজুন"/></label><button className="btn btn-outline btn-small" onClick={()=>{setCustomerPage(1);refresh()}}>Search</button></div>
          <div className="table-scroll"><table className="bookings-table"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Account</th><th>Registered</th></tr></thead><tbody>{customerDirectory.map(c=><tr key={c._id}><td>{c.name}</td><td>{c.phone||'—'}</td><td>{c.email||'—'}</td><td>{c.accountStatus||'active'}</td><td>{c.createdAt?new Date(c.createdAt).toLocaleDateString('bn-BD'):'—'}</td></tr>)}{!customerDirectory.length&&<tr><td colSpan="5">কোনো Customer নেই।</td></tr>}</tbody></table></div>
          <div style={{display:'flex',gap:10,alignItems:'center',justifyContent:'flex-end',marginTop:12}}><span>Page {customerPagination.page||1} / {customerPagination.pages||1}</span><button className="btn btn-outline btn-small" disabled={(customerPagination.page||1)<=1} onClick={()=>setCustomerPage(p=>Math.max(1,p-1))}>Previous</button><button className="btn btn-outline btn-small" disabled={(customerPagination.page||1)>=(customerPagination.pages||1)} onClick={()=>setCustomerPage(p=>Math.min(customerPagination.pages||1,p+1))}>Next</button></div>
        </div>
        )}
        {adminOpsTab === "requests" && (
        <div className="admin-table-card">
          <div className="table-toolbar">
            <div>
              <h2>All requests</h2>
              <p>Pagination-সহ সব request পরিচালনা করুন।</p>
            </div>
            <div className="table-filters">
              <label className="search-box">
                <Search size={17} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && refresh()}
                  placeholder="নাম, ফোন বা Ticket ID"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">সব Status</option>
                {[
                  "New",
                  "Contacted",
                  "Assigned",
                  "On the way",
                  "Inspection",
                  "Quotation sent",
                  "Quotation rejected",
                  "Approved",
                  "In progress",
                  "Completed",
                  "Cancelled",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button className="btn btn-primary btn-small" onClick={() => { setBookingPage(1); refresh(); }}>
                <Filter size={15} /> Filter
              </button>
            </div>
          </div>
          {bookings.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={36} />
              <h3>কোনো booking পাওয়া যায়নি</h3>
              <p>নতুন service request এলে এখানে দেখা যাবে।</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Ticket / Date</th>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Area & Problem</th>
                    <th>Status</th>
                    <th>Assign technician(s) / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id}>
                      <td>
                        <b className="ticket-id">{b.ticketId}</b>
                        <small>
                          {new Date(b.createdAt).toLocaleString("en-BD")}
                        </small>
                      </td>
                      <td>
                        <b>{b.name}</b>
                        <small>
                          <a href={`tel:${b.phone}`}>{b.phone}</a>
                        </small>
                        {b.email && <small>{b.email}</small>}
                      </td>
                      <td>{b.serviceName}</td>
                      <td>
                        <b>{b.area}</b>
                        <small>{b.address}</small>
                        <p className="problem-cell">{b.problem}</p>
                        {b.preferredDate && (
                          <small>
                            Preferred: {b.preferredDate} · {b.preferredTime}
                          </small>
                        )}
                      </td>
                      <td>
                        <select
                          className={`status-select status-${b.status.toLowerCase().replaceAll(" ", "-")}`}
                          value={b.status}
                          onChange={(e) => updateStatus(b._id, e.target.value)}
                        >
                          {[
                            "New",
                            "Contacted",
                            "Assigned",
                            "On the way",
                            "Inspection",
                            "Quotation sent",
                            "Quotation rejected",
                            "Approved",
                            "In progress",
                            "Completed",
                            "Cancelled",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="booking-assignment-controls">
                          <select className="technician-multi-select" multiple aria-label={`Assign technicians for ${b.ticketId}`} value={assignmentSelections[b._id] ?? b.technicianIds ?? (b.technicianId ? [b.technicianId] : [])} onChange={e => setAssignmentSelections(prev => ({ ...prev, [b._id]: Array.from(e.target.selectedOptions, o => o.value) }))} style={{ minHeight: 72 }}>
                            {assignableTechnicians.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                          </select>
                          <button type="button" className="btn btn-outline btn-small assign-technicians-button" onClick={() => assignTechnicians(b)}>Assign technician(s)</button>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-small delete-booking-button"
                          onClick={() => deleteBooking(b)}
                          title="Delete booking"
                          aria-label={`Delete booking ${b.ticketId}`}
                          style={{ color: "#b91c1c", borderColor: "#fecaca" }}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="table-toolbar" style={{marginTop:16}}><small>মোট {bookingPagination.total} টি Booking · Page {bookingPagination.page} / {bookingPagination.pages}</small><div style={{display:"flex",gap:8}}><button className="btn btn-outline btn-small" disabled={bookingPage<=1} onClick={()=>setBookingPage(p=>Math.max(1,p-1))}>Previous</button><button className="btn btn-primary btn-small" disabled={bookingPage>=bookingPagination.pages} onClick={()=>setBookingPage(p=>Math.min(bookingPagination.pages,p+1))}>Next</button></div></div>
        </div>
        )}
        <p className="admin-security-note">
          <ShieldCheck size={15} /> Admin API is protected by JWT. Log out when
          finished, especially on shared devices.
        </p>
      </div>
    </main>
  );
}

export function ContentManagerPage({ embedded = false } = {}) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("muAdminToken") || "",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState({ services: [], packages: [] });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [successPopup, setSuccessPopup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("services");
  const [editingIndex, setEditingIndex] = useState(null);
  async function api(path, opts = {}) {
    const r = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Request failed");
    return d;
  }
  async function load() {
    try {
      const d = await api("/admin/content");
      setContent({ services: d.services || [], packages: d.packages || [] });
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (token) load();
  }, []);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if ((d.user || d.admin)?.role !== "admin")
        throw new Error("এই পেজ শুধু Admin ব্যবহার করতে পারবেন।");
      sessionStorage.setItem("muAdminToken", d.token);
      sessionStorage.setItem("muAdmin", JSON.stringify(d.user || d.admin));
      setToken(d.token);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function update(i, k, v) {
    setContent((c) => ({
      ...c,
      [tab]: c[tab].map((x, n) => (n === i ? { ...x, [k]: v } : x)),
    }));
  }
  function add() {
    setEditingIndex(content[tab].length);
    setContent((c) => ({
      ...c,
      [tab]: [
        ...c[tab],
        tab === "services"
          ? {
              id: `service-${Date.now()}`,
              icon: "🛠️",
              name: "New Service",
              subtitle: "সার্ভিসের বিবরণ",
              price: 300,
              items: [],
              image: "",
            }
          : {
              id: `package-${Date.now()}`,
              name: "New Package",
              price: 1999,
              period: "বছর",
              label: "নতুন প্যাকেজ",
              visits: "সার্ভিস ভিজিট",
              features: [],
              note: "",
              image: "",
            },
      ],
    }));
  }
  function remove(i) {
    if (!window.confirm("এই item-টি মুছে ফেলতে চান? পরিবর্তন সংরক্ষণ করতে Save চাপুন।")) return;
    setContent((c) => ({ ...c, [tab]: c[tab].filter((_, n) => n !== i) }));
    setEditingIndex((current) => current === i ? null : current !== null && current > i ? current - 1 : current);
  }
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await api("/admin/content", {
        method: "PUT",
        body: JSON.stringify(content),
      });
      setContent({
        services: saved.services || content.services,
        packages: saved.packages || content.packages,
      });
      setNotice("");
      setEditingIndex(null);
      setSuccessPopup(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="content-editor-page">
      <div className="container">
        {!embedded && <div className="dashboard-title">
          <div>
            <span className="section-kicker">CONTENT MANAGEMENT</span>
            <h1>Website Editor</h1>
            <p>
              কার্ড ও ফর্ম ব্যবহার করে সার্ভিস, প্যাকেজ, ছবি ও মূল্য পরিবর্তন
              করুন।
            </p>
          </div>
          <Link className="btn btn-outline" to="/admin">
            ← Dashboard
          </Link>
        </div>}
        {!token ? (
          <form className="account-card editor-login" onSubmit={login}>
            <h2>Admin Login</h2>
            <label>
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="btn btn-primary btn-full" disabled={busy}>
              Login to edit
            </button>
          </form>
        ) : (
          <div className="editor-card">
            {!embedded && <div className="editor-help">
              <b>Graphical Content Editor</b>
              <p>
                ছবি যোগ করতে image URL দিন। ছবি আপনার নিজস্ব hosting-এ রাখুন
                অথবা image URL ব্যবহার করুন।
              </p>
            </div>}
        <div className="editor-tabs">
              <button
                className={`btn ${tab === "services" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTab("services")}
              >
                সার্ভিস ({content.services.length})
              </button>
              <button
                className={`btn ${tab === "packages" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTab("packages")}
              >
                প্যাকেজ ({content.packages.length})
              </button>
              <button className="btn btn-outline" onClick={add}>
                ＋ নতুন {tab === "services" ? "সার্ভিস" : "প্যাকেজ"}
              </button>
            </div>
            <div className="content-item-list">
              {content[tab].length === 0 && <p className="editor-empty">কোনো {tab === "services" ? "সার্ভিস" : "প্যাকেজ"} নেই। ＋ নতুন বাটনে ক্লিক করে যোগ করুন।</p>}
              {content[tab].map((item, i) => (
                <div className="content-item-row" key={item.id || i}>
                  <div className="content-item-summary">
                    {item.image ? <img src={item.image} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <span className="content-item-icon">{item.icon || (tab === "services" ? "🛠️" : "📦")}</span>}
                    <div><strong>{item.name || "নামহীন"}</strong><small>{item.id || "No ID"} · ৳{item.price ?? 0}</small></div>
                  </div>
                  <div className="content-item-actions">
                    <button type="button" className="icon-action" title="Update" aria-label="Update" onClick={() => setEditingIndex(i)}><Pencil size={18} /></button>
                    <button type="button" className="icon-action danger" title="Delete" aria-label="Delete" onClick={() => remove(i)}><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
            {editingIndex !== null && content[tab][editingIndex] && (() => {
              const item = content[tab][editingIndex];
              const i = editingIndex;
              return <div className="content-editor-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditingIndex(null); }}>
                <article className="visual-editor-item selected-content-editor content-editor-modal" role="dialog" aria-modal="true" aria-labelledby="content-editor-modal-title">
                <div className="selected-editor-heading"><h3 id="content-editor-modal-title">{item.name || "নতুন item"} — Update</h3><button type="button" className="btn btn-outline" onClick={() => setEditingIndex(null)}>বন্ধ করুন</button></div>
                {item.image && <img className="editor-image-preview" src={item.image} alt="Preview" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                <div className="editor-field-grid">
                  <label>নাম<input value={item.name || ""} onChange={(e) => update(i, "name", e.target.value)} /></label>
                  <label>মূল্য (৳)<input type="number" min="0" value={item.price ?? 0} onChange={(e) => update(i, "price", Number(e.target.value))} /></label>
                  <label>ID<input value={item.id || ""} onChange={(e) => update(i, "id", e.target.value)} /></label>
                  {tab === "services" && <label>Icon / Emoji<input value={item.icon || ""} onChange={(e) => update(i, "icon", e.target.value)} /></label>}
                  <label className="editor-wide">ছবির URL<input value={item.image || ""} placeholder="https://example.com/image.jpg" onChange={(e) => update(i, "image", e.target.value)} /></label>
                  {tab === "services" ? <>
                    <label className="editor-wide">সংক্ষিপ্ত বিবরণ<input value={item.subtitle || ""} onChange={(e) => update(i, "subtitle", e.target.value)} /></label>
                    <label className="editor-wide">কাজের তালিকা (প্রতি লাইনে একটি)<textarea rows="3" value={(item.items || []).join("\n")} onChange={(e) => update(i, "items", e.target.value.split("\n").filter(Boolean))} /></label>
                  </> : <>
                    <label>পিরিয়ড<input value={item.period || ""} onChange={(e) => update(i, "period", e.target.value)} /></label>
                    <label>লেবেল<input value={item.label || ""} onChange={(e) => update(i, "label", e.target.value)} /></label>
                    <label className="editor-wide">সুবিধা (প্রতি লাইনে একটি)<textarea rows="3" value={(item.features || []).join("\n")} onChange={(e) => update(i, "features", e.target.value.split("\n").filter(Boolean))} /></label>
                    <label className="editor-wide">নোট<input value={item.note || ""} onChange={(e) => update(i, "note", e.target.value)} /></label>
                  </>}
                </div>
                <div className="editor-actions content-editor-modal-actions">
                  <button className="btn btn-outline" onClick={load} disabled={busy}>
                    বর্তমান কনটেন্ট রিলোড
                  </button>
                  <button className="btn btn-primary" onClick={save} disabled={busy}>
                    {busy ? "সংরক্ষণ হচ্ছে…" : "পরিবর্তন সংরক্ষণ করুন"}
                  </button>
                </div>
                </article>
              </div>;
            })()}
          </div>
        )}
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        {successPopup && <div className="content-editor-modal-backdrop success-popup-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSuccessPopup(false); }}>
          <section className="success-popup" role="alertdialog" aria-modal="true" aria-labelledby="content-save-success-title">
            <div className="success-popup-icon"><CheckCircle2 size={34} /></div>
            <h2 id="content-save-success-title">সফলভাবে আপডেট হয়েছে!</h2>
            <p>পরিবর্তনগুলো ডাটাবেজে সংরক্ষণ করা হয়েছে।</p>
            <button type="button" className="btn btn-primary" onClick={() => setSuccessPopup(false)}>ঠিক আছে</button>
          </section>
        </div>}
      </div>
    </main>
  );
}

export function TicketTrackingPage() {
  const [ticket, setTicket] = useState("");
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function track(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setBooking(null);
    try {
      const r = await fetch(
        `${API}/tracking/${encodeURIComponent(ticket.trim())}`,
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "টিকিট পাওয়া যায়নি");
      setBooking(d.booking);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="inner-page">
      <div className="container tracking-wrap">
        <span className="section-kicker">TICKET TRACKING</span>
        <h1>
          আপনার সার্ভিসের <span>অগ্রগতি দেখুন</span>
        </h1>
        <p>বুকিং করার সময় পাওয়া Ticket ID লিখুন।</p>
        <form className="tracking-form" onSubmit={track}>
          <input
            required
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="যেমন: MU-2026-A4B0C2"
          />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "খোঁজা হচ্ছে…" : "টিকিট ট্র্যাক করুন"}
          </button>
        </form>
        {error && <div className="alert error">{error}</div>}
        {booking && (
          <div className="tracking-result">
            <h2>{booking.ticketId}</h2>
            <p>
              <b>সার্ভিস:</b> {booking.serviceName}
            </p>
            <p>
              <b>এলাকা:</b> {booking.area}
            </p>
            <p>
              <b>বর্তমান স্ট্যাটাস:</b>{" "}
              <span className={`status-pill status-${String(booking.status || "").toLowerCase().replaceAll(" ", "-")}`}>{booking.status}</span>
            </p>
            <p>
              <b>বুকিং:</b>{" "}
              {new Date(booking.createdAt).toLocaleString("bn-BD")}
            </p>
            <p>
              <b>সর্বশেষ আপডেট:</b>{" "}
              {new Date(booking.updatedAt || booking.createdAt).toLocaleString(
                "bn-BD",
              )}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export function AdminOperationsPage() {
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get("tab") || "overview"),
    [data, setData] = useState({
      technicians: [],
      staff: [],
      entries: [],
      items: [],
      income: 0,
      expense: 0,
      profit: 0,
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [finance, setFinance] = useState({
    type: "expense",
    category: "",
    amount: "",
    note: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [item, setItem] = useState({
    name: "",
    sku: "",
    quantity: "0",
    unit: "pcs",
    costPrice: "0",
    reorderLevel: "0",
  });
  const [editingItemId, setEditingItemId] = useState("");
  const [opsBookings, setOpsBookings] = useState([]);
  const [adminQuotations, setAdminQuotations] = useState([]);
  const [quotationPagination, setQuotationPagination] = useState({page:1,pages:1,total:0,limit:25});
  const [onlinePayments, setOnlinePayments] = useState({ payments: [], counts: {} });
  const [integrationConfig, setIntegrationConfig] = useState({ onlinePaymentAvailable: false, smsNotificationsEnabled: false, paymentProvider: "bkash", currency: "BDT", smsProvider: "mimsms" });
  const [serviceReports, setServiceReports] = useState([]);
  const [partsRequests, setPartsRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const [approvedPartners, setApprovedPartners] = useState([]);
  const [partnerDocuments, setPartnerDocuments] = useState([]);
  const [partnerFilter, setPartnerFilter] = useState("pending");
  const [partnerEdits, setPartnerEdits] = useState({});
  const [partnerQuality, setPartnerQuality] = useState({ partners: [], claims: [] });
  const [partnerSettlements, setPartnerSettlements] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [manualCompletion, setManualCompletion] = useState({ bookingId: "", reason: "" });
  const [partnerDispatch, setPartnerDispatch] = useState({ bookingId: "", partnerId: "" });
  const [serviceFulfilment, setServiceFulfilment] = useState({ serviceId: "", fulfilment: "inhouse", partnerIds: "" });
  const [settlementEdits, setSettlementEdits] = useState({});
  const [payoutAmountEdits, setPayoutAmountEdits] = useState({});
  const [payment, setPayment] = useState({ bookingId: "", amount: "", method: "cash", reference: "" });
  const [movementItemId, setMovementItemId] = useState("");
  const [movement, setMovement] = useState({ type: "out", quantity: "1", unitCost: "0", bookingId: "", note: "" });
  const token = sessionStorage.getItem("muAdminToken");
  async function request(path, opts = {}) {
    const r = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...opts.headers,
      },
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Request failed");
    return d;
  }
  async function load() {
    setError("");
    try {
      const [f, i, t, st, summary, bookingResult, reportResult, partsResult, onlinePaymentResult, integrationResult, partnerResult] = await Promise.all([
        request("/admin/finance"), request("/admin/inventory"), request("/admin/technicians"), request("/admin/staff"),
        request("/admin/operations/summary"), request("/admin/operations/bookings"),
        request("/operations/service-reports"), request("/operations/parts-requests"), request("/admin/online-payments"), request("/admin/integrations/status"), request(`/admin/partners?status=${partnerFilter}&limit=100`),
      ]);
      setData({ ...f, ...i, ...t, ...st, ...summary });
      setOpsBookings(bookingResult.bookings || []); setPartners(partnerResult.partners || []);
      const approvedPartnerResult = await request("/admin/partners?status=approved&limit=100"); setApprovedPartners(approvedPartnerResult.partners || []);
      const docsResult = await request("/admin/partner-documents"); setPartnerDocuments(docsResult.documents || []);
      const qualityResult = await request("/admin/partner-quality"); setPartnerQuality(qualityResult || { partners: [], claims: [] }); setOnlinePayments(onlinePaymentResult || { payments: [], counts: {} }); setIntegrationConfig(integrationResult || { onlinePaymentAvailable: false, smsNotificationsEnabled: false, paymentProvider: "bkash", currency: "BDT", smsProvider: "mimsms" }); setServiceReports(reportResult.reports || []); setPartsRequests(partsResult.requests || []);
      const quotationResult = await request("/admin/quotations?limit=100"); setAdminQuotations(quotationResult.quotations || []); setQuotationPagination(quotationResult.pagination || {page:1,pages:1,total:0,limit:100});
      const [settlementResult, leaveResult, auditResult] = await Promise.all([
        request("/admin/partner-settlements").catch(() => ({ settlements: [] })),
        request("/admin/technician-leave-requests").catch(() => ({ requests: [] })),
        request("/admin/audit-logs?limit=100").catch(() => ({ logs: [] })),
      ]);
      setPartnerSettlements(settlementResult.settlements || []); setLeaveRequests(leaveResult.requests || []); setAuditLogs(auditResult.logs || []);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (token) load();
  }, []);
  useEffect(() => {
    if (!token) return;
    request(`/admin/partners?status=${partnerFilter}&limit=100`).then(result => setPartners(result.partners || [])).catch(e => setError(e.message));
  }, [partnerFilter]);
  async function sendPartnerOffer() {
    setBusy(true); setError("");
    try { await request(`/admin/bookings/${partnerDispatch.bookingId}/partner-offers`, { method: "POST", body: JSON.stringify({ partnerId: partnerDispatch.partnerId }) }); setNotice("Partner offer পাঠানো হয়েছে।"); setPartnerDispatch({ bookingId: "", partnerId: "" }); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function saveServiceFulfilment() {
    setBusy(true); setError("");
    try { await request(`/admin/services/${encodeURIComponent(serviceFulfilment.serviceId)}/fulfilment`, { method: "PATCH", body: JSON.stringify({ fulfilment: serviceFulfilment.fulfilment, partnerIds: serviceFulfilment.partnerIds.split(",").map(x => x.trim()).filter(Boolean) }) }); setNotice("Service fulfilment configuration সংরক্ষিত হয়েছে।"); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function approvePartnerPayout(booking) {
    const amount = Number(payoutAmountEdits[booking._id]);
    if (!Number.isFinite(amount) || amount <= 0) { setError("সঠিক Partner payout amount দিন।"); return; }
    setBusy(true); setError("");
    try { await request(`/admin/partner-settlements/${booking._id}/approve-amount`, { method: "PATCH", body: JSON.stringify({ partnerId: booking.partnerId, amount }) }); setNotice("Partner payout amount অনুমোদিত হয়েছে।"); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function settlePartner(entry, status) {
    const partnerId = entry.partnerId || ""; const bookingId = String(entry.bookingId || "");
    setBusy(true); setError("");
    try { await request(`/admin/partner-settlements/${bookingId}`, { method: "PATCH", body: JSON.stringify({ status, partnerId, reference: settlementEdits[entry._id] || "" }) }); setNotice(status === "paid" ? "Partner payout Paid হিসেবে নিশ্চিত হয়েছে।" : "Settlement বাতিল করা হয়েছে।"); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function manualCompleteBooking() {
    setBusy(true); setError("");
    try { await request(`/admin/bookings/${manualCompletion.bookingId}/manual-completion`, { method: "POST", body: JSON.stringify({ reason: manualCompletion.reason }) }); setNotice("Manual completion audit সহ সংরক্ষিত হয়েছে।"); setManualCompletion({ bookingId: "", reason: "" }); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function reviewLeave(requestId, status) {
    setBusy(true); setError("");
    try { await request(`/admin/technician-leave-requests/${encodeURIComponent(requestId)}`, { method: "PATCH", body: JSON.stringify({ status }) }); setNotice(`Leave request ${status} হয়েছে।`); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function updatePartnerStatus(partner, status) {
    setBusy(true); setError("");
    try { await request(`/admin/partners/${partner._id}/status`, {method:"PATCH", body:JSON.stringify({status})}); setNotice("Partner account status আপডেট হয়েছে।"); await load(); }
    catch(e){setError(e.message);} finally{setBusy(false);}
  }
  async function savePartnerProfile(partner) {
    const edit=partnerEdits[partner._id]||{}; setBusy(true); setError("");
    try { await request(`/admin/partners/${partner._id}/profile`, {method:"PATCH", body:JSON.stringify({serviceIds:(edit.serviceIds??partner.partnerProfile?.serviceIds?.join(",")??"").split(",").map(x=>x.trim()).filter(Boolean),serviceAreas:(edit.serviceAreas??partner.partnerProfile?.serviceAreas?.join(",")??"").split(",").map(x=>x.trim()).filter(Boolean),commissionRate:Number(edit.commissionRate??partner.partnerCommissionRate??0)})}); setNotice("Partner service coverage ও commission সংরক্ষণ হয়েছে।"); await load(); }
    catch(e){setError(e.message);} finally{setBusy(false);}
  }
  async function addFinance(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/admin/finance", {
        method: "POST",
        body: JSON.stringify(finance),
      });
      setFinance({ ...finance, category: "", amount: "", note: "" });
      setNotice("আয়/ব্যয়ের হিসাব সংরক্ষণ হয়েছে।");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function recordPayment(e) {
    e.preventDefault();
    if (!payment.bookingId) { setError("একটি Booking নির্বাচন করুন।"); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/admin/bookings/${payment.bookingId}/payments`, { method: "POST", body: JSON.stringify({ amount: Number(payment.amount), method: payment.method, reference: payment.reference }) });
      setPayment({ bookingId: "", amount: "", method: "cash", reference: "" });
      setNotice("Payment রেকর্ড হয়েছে এবং Income Ledger আপডেট হয়েছে।"); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function saveMovement(e) {
    e.preventDefault(); if (!movementItemId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/admin/inventory/${movementItemId}/movements`, { method: "POST", body: JSON.stringify({ ...movement, quantity: Number(movement.quantity), unitCost: Number(movement.unitCost), recordPurchaseExpense: movement.type === "in", recordUsageExpense: true }) });
      setMovement({ type: "out", quantity: "1", unitCost: "0", bookingId: "", note: "" }); setMovementItemId("");
      setNotice("Stock movement সংরক্ষণ হয়েছে; প্রযোজ্য ক্ষেত্রে Finance Ledger-ও আপডেট হয়েছে।"); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function resetItemForm() {
    setEditingItemId("");
    setItem({
      name: "",
      sku: "",
      quantity: "0",
      unit: "pcs",
      costPrice: "0",
      reorderLevel: "0",
    });
  }
  function editItem(row) {
    setEditingItemId(String(row._id));
    setItem({
      name: row.name || "",
      sku: row.sku || "",
      quantity: String(row.quantity ?? 0),
      unit: row.unit || "pcs",
      costPrice: String(row.costPrice ?? 0),
      reorderLevel: String(row.reorderLevel ?? 0),
    });
    setError("");
    setNotice("");
    document.querySelector(".inventory-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function addItem(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        name: item.name.trim(),
        sku: item.sku.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim() || "pcs",
        costPrice: Number(item.costPrice),
        reorderLevel: Number(item.reorderLevel || 0),
      };
      await request(
        editingItemId ? `/admin/inventory/${editingItemId}` : "/admin/inventory",
        {
          method: editingItemId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setNotice(editingItemId ? "Inventory item আপডেট হয়েছে।" : "ইনভেন্টরি আইটেম সংরক্ষণ হয়েছে।");
      resetItemForm();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteItem(row) {
    if (!window.confirm(`"${row.name}" আইটেমটি স্থায়ীভাবে মুছে ফেলতে চান?`)) return;
    setError("");
    setNotice("");
    try {
      await request(`/admin/inventory/${row._id}`, { method: "DELETE" });
      if (editingItemId === String(row._id)) resetItemForm();
      setNotice(`"${row.name}" ইনভেন্টরি থেকে মুছে ফেলা হয়েছে।`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function technicianStatus(t, status) {
    try {
      await request(`/admin/technicians/${t._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice("Technician status আপডেট হয়েছে।");
      load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function staffStatus(member, status) {
    try {
      await request(`/admin/staff/${member._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setNotice("Staff account status আপডেট হয়েছে।");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  if (!token)
    return (
      <main className="admin-login-page">
        <div className="admin-login-card">
          <h1>Admin Login Required</h1>
          <p>এই পেজটি দেখতে আগে Admin হিসেবে লগইন করুন।</p>
          <Link className="btn btn-primary" to="/admin">
            Admin Login
          </Link>
        </div>
      </main>
    );
  return (
    <main className="admin-page">
      <div className="container admin-content">
        <div className="dashboard-title">
          <div>
            <span className="section-kicker">BUSINESS OPERATIONS</span>
            <h1>Admin Management Center</h1>
            <p>Technician, আয়-ব্যয়, রিপোর্ট ও ইনভেন্টরি পরিচালনা করুন।</p>
          </div>
          <div className="admin-heading-actions">
            <Link to="/admin" className="btn btn-outline">
              <ClipboardList size={15} /> Booking Dashboard
            </Link>
            <Link to="/admin/roles" className="btn btn-outline">
              <ShieldCheck size={15} /> Permissions
            </Link>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        <div className="editor-tabs">
          {[
            ["overview", "Overview & Reports"],
            ["technicians", `Technician Management${data.technicians.filter(t => (t.technicianStatus || t.accountStatus || "pending") === "pending").length ? ` (${data.technicians.filter(t => (t.technicianStatus || t.accountStatus || "pending") === "pending").length})` : ""}`],
            ["staff", `Staff Account Approval${data.staff.filter(m => (m.accountStatus || "pending") === "pending").length ? ` (${data.staff.filter(m => (m.accountStatus || "pending") === "pending").length})` : ""}`],
            ["partners", "Partner Management"],
            ["partnerQuality", "Partner Performance & Quality"],
            ["leaveRequests", "Technician Leave Approval"],
            ["finance", "আয়-ব্যয়"],
            ["payments", "Booking Payments"],
            ["quotations", "Quotations"],
            ["inventory", "Inventory"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={`btn ${tab === v ? "btn-primary" : "btn-outline"}`}
              onClick={() => setTab(v)}
            >
              {l}
            </button>
          ))}
          <button className="btn btn-outline" onClick={load}>
            Refresh
          </button>
        </div>
        {tab === "overview" && (
          <>
            <div className="stats-grid management-summary-grid">
              <div className="stat-card management-summary-card summary-income">
                <div className="management-summary-icon"><Wallet size={22} /></div>
                <span>মোট আয়</span>
                <b>৳{Number(data.income || 0).toLocaleString("en-BD")}</b>
                <small>মোট রেকর্ডকৃত আয়</small>
              </div>
              <div className="stat-card management-summary-card summary-expense">
                <div className="management-summary-icon"><TrendingDown size={22} /></div>
                <span>মোট ব্যয়</span>
                <b>৳{Number(data.expense || 0).toLocaleString("en-BD")}</b>
                <small>মোট রেকর্ডকৃত ব্যয়</small>
              </div>
              <div className="stat-card management-summary-card summary-balance">
                <div className="management-summary-icon"><Scale size={22} /></div>
                <span>নিট ব্যালেন্স</span>
                <b>৳{Number(data.profit || 0).toLocaleString("en-BD")}</b>
                <small>আয় থেকে ব্যয় বাদ দিয়ে</small>
              </div>
              <div className="stat-card management-summary-card summary-inventory">
                <div className="management-summary-icon"><Package size={22} /></div>
                <span>Inventory Items</span>
                <b>{data.items.length}</b>
                <small>মোট ইনভেন্টরি আইটেম</small>
              </div>
            </div>
            <div className="admin-table-card">
              <div className="table-toolbar">
                <div>
                  <h2>Low stock report</h2>
                  <p>Reorder level-এর সমান বা কম স্টক</p>
                </div>
              </div>
              <div className="table-scroll">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>SKU</th>
                      <th>Stock</th>
                      <th>Cost price</th>
                      <th>Alert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items
                      .filter(
                        (x) => Number(x.quantity) <= Number(x.reorderLevel),
                      )
                      .map((x) => (
                        <tr key={x._id}>
                          <td>{x.name}</td>
                          <td>{x.sku || "—"}</td>
                          <td>
                            {x.quantity} {x.unit}
                          </td>
                          <td>৳{x.costPrice}</td>
                          <td>
                            <span className="alert error">Low stock</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {tab === "technicians" && (
          <div className="admin-table-card">
            <div className="table-toolbar">
              <div>
                <h2>Technician Management</h2>
                <p>নিবন্ধিত টেকনিশিয়ানদের অনুমোদন ও স্থগিত করুন।</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>নাম</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Registration Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.technicians.map((t) => (
                    <tr key={t._id}>
                      <td>{t.name || "—"}</td>
                      <td>{t.email}</td>
                      <td>{t.phone || "—"}</td>
                      <td>{t.createdAt ? new Date(t.createdAt).toLocaleDateString("bn-BD") : "—"}</td>
                      <td>{t.technicianStatus || "pending"}</td>
                      <td>
                        <select
                          value={t.technicianStatus || "pending"}
                          onChange={(e) => technicianStatus(t, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === "partners" && (
          <div className="admin-table-card">
            <div className="table-toolbar"><div><h2>Partner Management</h2><p>Partner আবেদন যাচাই, অনুমোদন, সার্ভিস এলাকা ও কমিশন নিয়ন্ত্রণ করুন।</p></div><div className="table-filters"><select value={partnerFilter} onChange={e=>setPartnerFilter(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option></select><button className="btn btn-outline btn-small" onClick={load}>Refresh</button></div></div>
            <section className="partner-card" style={{marginTop:20}}><h3>Partner Document Verification</h3><p>Trade License, NID ও অন্যান্য নথি যাচাই করে সিদ্ধান্ত দিন।</p><div className="partner-admin-list">{partnerDocuments.map(doc=><article className="partner-admin-card" key={`${doc.partnerId}-${doc.documentId}`}><div className="partner-admin-head"><div><b>{doc.partnerName}</b><small>{doc.email} · {doc.type} · {doc.originalName}</small><small>Status: {doc.status}</small></div><div><button className="btn btn-outline btn-small" onClick={async()=>{try{const r=await fetch(`${API}/admin/partner-documents/${doc.partnerId}/${doc.documentId}/file`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error('Document open failed');const blob=await r.blob();const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');}catch(e){setError(e.message)}}}>View Document</button><select value={doc.status} onChange={async e=>{try{await request(`/admin/partner-documents/${doc.partnerId}/${doc.documentId}`,{method:'PATCH',body:JSON.stringify({status:e.target.value,reviewNote:''})});setNotice('Document verification status updated.');await load();}catch(err){setError(err.message)}}}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></div></article>)}{!partnerDocuments.length&&<div className="partner-empty">কোনো Partner document জমা হয়নি।</div>}</div></section>
            <section className="partner-card" style={{marginTop:20,padding:20}}><h3>Partner Job Dispatch</h3><p>Booking ID এবং অনুমোদিত Partner ID দিয়ে কাজের Offer পাঠান।</p><div className="partner-admin-fields"><label>Booking ID<input value={partnerDispatch.bookingId} onChange={e=>setPartnerDispatch(v=>({...v,bookingId:e.target.value}))} placeholder="Booking MongoDB ID" /></label><label>Partner<select value={partnerDispatch.partnerId} onChange={e=>setPartnerDispatch(v=>({...v,partnerId:e.target.value}))}><option value="">Select approved partner</option>{approvedPartners.map(p=><option key={p._id} value={p._id}>{p.partnerProfile?.businessName||p.name} — {p.email}</option>)}</select></label><button className="btn btn-primary" disabled={busy||!partnerDispatch.bookingId||!partnerDispatch.partnerId} onClick={sendPartnerOffer}>Send Partner Offer</button></div></section>
            <section className="partner-card" style={{marginTop:16,padding:20}}><h3>Service Fulfilment Configuration</h3><p>সার্ভিসটি In-house, Partner অথবা Mixed পদ্ধতিতে পরিচালনা করুন। Partner/Mixed হলে অনুমোদিত Partner ID নির্বাচন করুন।</p><div className="partner-admin-fields"><label>Service ID<input value={serviceFulfilment.serviceId} onChange={e=>setServiceFulfilment(v=>({...v,serviceId:e.target.value}))} placeholder="CMS service ID" /></label><label>Fulfilment<select value={serviceFulfilment.fulfilment} onChange={e=>setServiceFulfilment(v=>({...v,fulfilment:e.target.value}))}><option value="inhouse">In-house</option><option value="partner">Partner</option><option value="mixed">Mixed</option></select></label><label>Approved Partner IDs (comma separated)<input value={serviceFulfilment.partnerIds} onChange={e=>setServiceFulfilment(v=>({...v,partnerIds:e.target.value}))} placeholder="Partner MongoDB IDs" /></label><button className="btn btn-primary" disabled={busy||!serviceFulfilment.serviceId} onClick={saveServiceFulfilment}>Save Fulfilment</button></div></section>
            <section className="partner-card" style={{marginTop:16,padding:20}}><h3>Approve Partner Payout Amount</h3><p>Partner-এর accepted/completed job-এর প্রস্তাবিত payout যাচাই করে অনুমোদন দিন। অনুমোদিত অঙ্ক Customer booking value অতিক্রম করতে পারবে না।</p><div className="partner-admin-list">{opsBookings.filter(b=>b.partnerId&&["accepted","completed"].includes(b.partnerStatus)&&!b.partnerPayout?.approvedBy).map(b=><article className="partner-admin-card" key={b._id}><div className="partner-admin-head"><div><b>{b.ticketId||b._id} · {b.serviceName}</b><small>Partner: {b.partnerId} · Proposed: {money(b.partnerPayout?.amount||0)} · Customer total: {money(b.totalAmount||b.quotedAmount||0)}</small></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input type="number" min="1" max={Number(b.totalAmount||b.quotedAmount||0)||undefined} placeholder="Approved amount" value={payoutAmountEdits[b._id]??b.partnerPayout?.amount??""} onChange={e=>setPayoutAmountEdits(v=>({...v,[b._id]:e.target.value}))}/><button className="btn btn-primary btn-small" disabled={busy} onClick={()=>approvePartnerPayout(b)}>Approve Amount</button></div></div></article>)}{!opsBookings.some(b=>b.partnerId&&["accepted","completed"].includes(b.partnerStatus)&&!b.partnerPayout?.approvedBy)&&<div className="partner-empty">অনুমোদনের অপেক্ষায় কোনো Partner payout নেই।</div>}</div></section>
            <section className="partner-card" style={{marginTop:16,padding:20}}><h3>Partner Settlement Approval</h3><p>Pending payout যাচাই করে Paid অথবা Rejected করুন। Paid করার আগে payment reference লিখুন।</p><div className="partner-admin-list">{partnerSettlements.map(entry=><article className="partner-admin-card" key={entry._id||entry.sourceKey}><div className="partner-admin-head"><div><b>{entry.ticketId||entry.bookingId}</b><small>Partner: {entry.partnerId} · Amount: {money(entry.amount)} · {new Date(entry.createdAt).toLocaleString("en-GB")}</small></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input aria-label="Payment reference" placeholder="Payment reference" value={settlementEdits[entry._id]||""} onChange={e=>setSettlementEdits(v=>({...v,[entry._id]:e.target.value}))}/><button className="btn btn-primary btn-small" disabled={busy||!settlementEdits[entry._id]} onClick={()=>settlePartner(entry,"paid")}>Mark Paid</button><button className="btn btn-outline btn-small" disabled={busy} onClick={()=>settlePartner(entry,"rejected")}>Reject</button></div></div></article>)}{!partnerSettlements.length&&<div className="partner-empty">কোনো Pending Partner Settlement নেই।</div>}</div></section>
            <div className="partner-admin-list">{partners.map(partner=>{const edit=partnerEdits[partner._id]||{};return <article key={partner._id} className="partner-admin-card"><div className="partner-admin-head"><div><b>{partner.partnerProfile?.businessName||partner.name}</b><small>{partner.name} · {partner.email} · {partner.phone||"—"}</small></div><select value={partner.accountStatus||"pending"} disabled={busy} onChange={e=>updatePartnerStatus(partner,e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option></select></div><div className="partner-admin-fields"><label>Service IDs (comma separated)<input value={edit.serviceIds??(partner.partnerProfile?.serviceIds||[]).join(", ")} onChange={e=>setPartnerEdits(s=>({...s,[partner._id]:{...s[partner._id],serviceIds:e.target.value}}))} placeholder="ac-repair, electrical"/></label><label>Service Areas<input value={edit.serviceAreas??(partner.partnerProfile?.serviceAreas||[]).join(", ")} onChange={e=>setPartnerEdits(s=>({...s,[partner._id]:{...s[partner._id],serviceAreas:e.target.value}}))} placeholder="Chattogram, Agrabad"/></label><label>Commission / Partner Rate (%)<input type="number" min="0" max="100" value={edit.commissionRate??partner.partnerCommissionRate??0} onChange={e=>setPartnerEdits(s=>({...s,[partner._id]:{...s[partner._id],commissionRate:e.target.value}}))}/></label><button className="btn btn-primary" disabled={busy} onClick={()=>savePartnerProfile(partner)}>Save Partner Profile</button></div><small className="partner-admin-meta">Type: {partner.partnerProfile?.partnerType||"individual"} · Registered: {partner.createdAt?new Date(partner.createdAt).toLocaleDateString("en-GB"):"—"} · Rating: {partner.partnerRating||"Not rated"}</small></article>})}{!partners.length&&<div className="partner-empty">এই Status-এ কোনো Partner পাওয়া যায়নি।</div>}</div>
          </div>
        )}
        {tab === "leaveRequests" && (
          <>
          <section className="partner-card" style={{marginTop:20,padding:20}}><h3>SMS Failure – Admin Manual Completion</h3><p>শুধু SMS/OTP delivery ব্যর্থ হলে ব্যবহার করুন। কারণ বাধ্যতামূলক এবং প্রতিটি override Audit Log-এ সংরক্ষিত হবে।</p><div className="partner-admin-fields"><label>Booking MongoDB ID<input value={manualCompletion.bookingId} onChange={e=>setManualCompletion(v=>({...v,bookingId:e.target.value}))} placeholder="Booking ID" /></label><label>Override reason<input value={manualCompletion.reason} onChange={e=>setManualCompletion(v=>({...v,reason:e.target.value}))} placeholder="SMS gateway failed; customer verified by phone..." /></label><button className="btn btn-primary" disabled={busy||!manualCompletion.bookingId||manualCompletion.reason.trim().length<10} onClick={manualCompleteBooking}>Record Manual Completion</button></div></section>
          <section className="partner-card" style={{marginTop:16,padding:20}}><h3>Admin Audit Log</h3><p>সর্বশেষ ১০০টি Admin mutation এবং manual completion override। Sensitive request body সংরক্ষণ করা হয় না।</p><div className="partner-admin-list">{auditLogs.map((log,i)=><article className="partner-admin-card" key={log._id||i}><b>{log.action}</b><small>{log.actorId} · HTTP {log.statusCode||"—"} · {log.createdAt?new Date(log.createdAt).toLocaleString("en-GB"):"—"}</small></article>)}{!auditLogs.length&&<div className="partner-empty">এখনো Audit Log নেই।</div>}</div></section>
          <div className="admin-table-card"><div className="table-toolbar"><div><h2>Technician Leave Requests</h2><p>Technician-এর ছুটির আবেদন পর্যালোচনা ও অনুমোদন করুন।</p></div><button className="btn btn-outline btn-small" onClick={load}>Refresh</button></div>
            <div className="partner-admin-list">{leaveRequests.map(item=><article className="partner-admin-card" key={item.requestId}><div className="partner-admin-head"><div><b>{item.technicianName||item.technicianId}</b><small>{item.startDate} → {item.endDate} · Submitted {item.createdAt?new Date(item.createdAt).toLocaleString("en-GB"):"—"}</small><p>{item.reason}</p><small>Status: {item.status}</small></div>{item.status==="pending"&&<div style={{display:"flex",gap:8}}><button className="btn btn-primary btn-small" disabled={busy} onClick={()=>reviewLeave(item.requestId,"approved")}>Approve</button><button className="btn btn-outline btn-small" disabled={busy} onClick={()=>reviewLeave(item.requestId,"rejected")}>Reject</button></div>}</div></article>)}{!leaveRequests.length&&<div className="partner-empty">কোনো Leave Request নেই।</div>}</div>
          </div>
          </>
        )}
        {tab === "partnerQuality" && (
          <div className="admin-table-card">
            <div className="table-toolbar"><div><h2>Partner Performance & Quality Control</h2><p>কাজের সফলতা, Customer Rating, পাওনা এবং Warranty/Complaint পর্যবেক্ষণ করুন।</p></div><button className="btn btn-outline btn-small" onClick={load}>Refresh</button></div>
            <div className="table-scroll"><table className="bookings-table"><thead><tr><th>Partner</th><th>Jobs</th><th>Completed</th><th>Completion</th><th>Rating</th><th>Open Claims</th><th>Pending Payable</th><th>Paid</th></tr></thead><tbody>
              {partnerQuality.partners.map(p => <tr key={p.partnerId}><td><b>{p.name}</b><small>{p.email} · {p.status}</small></td><td>{p.totalJobs}</td><td>{p.completedJobs}</td><td>{p.completionRate}%</td><td>{p.averageRating ?? "Not rated"} ({p.ratingCount})</td><td>{p.openClaims}</td><td>{money(p.pendingPayable)}</td><td>{money(p.paidPayout)}</td></tr>)}
              {!partnerQuality.partners.length && <tr><td colSpan="8">কোনো Partner performance data পাওয়া যায়নি।</td></tr>}
            </tbody></table></div>
            <div className="table-toolbar"><div><h3>Warranty Claims & Complaints</h3><p>Customer-এর অভিযোগ ও Warranty Claim পর্যালোচনা করুন।</p></div></div>
            <div className="table-scroll"><table className="bookings-table"><thead><tr><th>Ticket</th><th>Type</th><th>Subject</th><th>Status</th><th>Review Note</th><th>Action</th></tr></thead><tbody>
              {partnerQuality.claims.map(c => <tr key={c.claimId}><td>{c.ticketId}</td><td>{c.type}</td><td>{c.subject}</td><td><select value={c.status} onChange={async e=>{const status=e.target.value;try{await request(`/admin/partner-quality/claims/${c.claimId}`,{method:"PATCH",body:JSON.stringify({status,reviewNote:c.reviewNote||""})});setNotice("Claim status আপডেট হয়েছে।");const q=await request("/admin/partner-quality");setPartnerQuality(q);}catch(err){setError(err.message);}}}><option value="open">Open</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="rejected">Rejected</option></select></td><td>{c.reviewNote||"—"}</td><td><button className="btn btn-outline btn-small" onClick={async()=>{const reviewNote=window.prompt("Review note লিখুন",c.reviewNote||"");if(reviewNote===null)return;try{await request(`/admin/partner-quality/claims/${c.claimId}`,{method:"PATCH",body:JSON.stringify({status:c.status,reviewNote})});const q=await request("/admin/partner-quality");setPartnerQuality(q);setNotice("Review note সংরক্ষিত হয়েছে।");}catch(err){setError(err.message);}}}>Review note</button></td></tr>)}
              {!partnerQuality.claims.length && <tr><td colSpan="6">কোনো Warranty Claim বা Complaint নেই।</td></tr>}
            </tbody></table></div>
          </div>
        )}
        {tab === "staff" && (
          <div className="admin-table-card">
            <div className="table-toolbar">
              <div>
                <h2>Staff Account Approval</h2>
                <p>নতুন Staff account যাচাই করে অনুমোদন, Pending অথবা Suspend করুন। অনুমোদন না পাওয়া পর্যন্ত Staff লগইন করতে পারবে না।</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="bookings-table">
                <thead><tr><th>নাম</th><th>Email</th><th>Phone</th><th>Registration Date</th><th>Status / Action</th></tr></thead>
                <tbody>
                  {data.staff.map((member) => {
                    const status = member.accountStatus || "pending";
                    return <tr key={member._id}>
                      <td>{member.name || "—"}</td>
                      <td>{member.email}</td>
                      <td>{member.phone || "—"}</td>
                      <td>{member.createdAt ? new Date(member.createdAt).toLocaleDateString("bn-BD") : "—"}</td>
                      <td>
                        <select aria-label={`Update status for ${member.email}`} value={status} onChange={(e) => staffStatus(member, e.target.value)}>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="suspended">Suspended</option>
                        </select>
                      </td>
                    </tr>;
                  })}
                  {data.staff.length === 0 && <tr><td colSpan="5">কোনো Staff account পাওয়া যায়নি।</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === "service-operations" && (
          <div className="admin-table-card"><div className="table-toolbar"><div><h2>Service Operations</h2><p>Service Reports, Parts Requests ও Notification পরিচালনা করুন।</p></div></div></div>
        )}
        {tab === "finance" && (
          <>
            <form className="editor-card" onSubmit={addFinance}>
              <h2>নতুন আয় / ব্যয় যোগ করুন</h2>
              <div className="editor-field-grid">
                <label>
                  ধরন
                  <select
                    value={finance.type}
                    onChange={(e) =>
                      setFinance({ ...finance, type: e.target.value })
                    }
                  >
                    <option value="income">আয়</option>
                    <option value="expense">ব্যয়</option>
                  </select>
                </label>
                <label>
                  খাত
                  <input
                    required
                    value={finance.category}
                    onChange={(e) =>
                      setFinance({ ...finance, category: e.target.value })
                    }
                    placeholder="যেমন: Service income / Parts"
                  />
                </label>
                <label>
                  পরিমাণ (৳)
                  <input
                    required
                    min="1"
                    type="number"
                    value={finance.amount}
                    onChange={(e) =>
                      setFinance({ ...finance, amount: e.target.value })
                    }
                  />
                </label>
                <label>
                  তারিখ
                  <input
                    type="date"
                    value={finance.date}
                    onChange={(e) =>
                      setFinance({ ...finance, date: e.target.value })
                    }
                  />
                </label>
                <label className="editor-wide">
                  বিবরণ
                  <input
                    value={finance.note}
                    onChange={(e) =>
                      setFinance({ ...finance, note: e.target.value })
                    }
                  />
                </label>
              </div>
              <button className="btn btn-primary" disabled={busy}>
                হিসাব সংরক্ষণ
              </button>
            </form>
            <div className="admin-table-card">
              <h2>আয়-ব্যয়ের রিপোর্ট</h2>
              <div className="table-scroll">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>তারিখ</th>
                      <th>ধরন</th>
                      <th>খাত</th>
                      <th>বিবরণ</th>
                      <th>পরিমাণ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entries.map((x) => (
                      <tr key={x._id}>
                        <td>{new Date(x.date).toLocaleDateString("en-BD")}</td>
                        <td>{x.type === "income" ? "আয়" : "ব্যয়"}</td>
                        <td>{x.category}</td>
                        <td>{x.note}</td>
                        <td>৳{Number(x.amount).toLocaleString("en-BD")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {tab === "payments" && (
          <>
            <form className="editor-card" onSubmit={recordPayment}>
              <h2>কাস্টমারের পেমেন্ট রেকর্ড করুন</h2>
              <p>পেমেন্ট সংরক্ষণ হলে বুকিংয়ের paid amount এবং Finance-এর Income Ledger একসঙ্গে আপডেট হবে।</p>
              <div className="editor-field-grid">
                <label>Booking / Ticket<select required value={payment.bookingId} onChange={e => setPayment({ ...payment, bookingId: e.target.value })}><option value="">Booking নির্বাচন করুন</option>{opsBookings.map(b => <option key={b._id} value={b._id}>{b.ticketId || b._id} · {b.serviceName || "Service"} · Paid ৳{Number(b.paidAmount || 0).toLocaleString("en-BD")}</option>)}</select></label>
                <label>প্রাপ্ত টাকা (৳)<input required type="number" min="1" step="0.01" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })}/></label>
                <label>Payment Method<select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })}><option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank</option><option value="card">Card</option><option value="other">Other</option></select></label>
                <label>Reference (ঐচ্ছিক)<input value={payment.reference} onChange={e => setPayment({ ...payment, reference: e.target.value })} placeholder="Transaction ID"/></label>
              </div>
              <button className="btn btn-primary" disabled={busy || !opsBookings.length}>{busy ? "সংরক্ষণ হচ্ছে…" : "Payment সংরক্ষণ ও Income তৈরি"}</button>
              {!opsBookings.length && <p>এখন কোনো সক্রিয় Booking পাওয়া যায়নি।</p>}
            </form>
            <div className="admin-table-card"><h2>Booking Payment Status</h2><div className="table-scroll"><table className="bookings-table"><thead><tr><th>Ticket</th><th>Service</th><th>Status</th><th>Paid</th><th>Payment Status</th></tr></thead><tbody>{opsBookings.map(b => <tr key={b._id}><td>{b.ticketId || b._id}</td><td>{b.serviceName || "—"}</td><td>{b.status || "—"}</td><td>৳{Number(b.paidAmount || 0).toLocaleString("en-BD")}</td><td>{b.paymentStatus || (b.paidAmount ? "partial" : "unpaid")}</td></tr>)}</tbody></table></div></div>
            <div className="admin-table-card"><h2>Integration Configuration Status</h2><div className="dashboard-stats"><div className="stat-card"><span>Online Payment</span><b>{integrationConfig.onlinePaymentAvailable ? "Configured" : "Not configured"}</b></div><div className="stat-card"><span>Provider</span><b>{integrationConfig.paymentProvider}</b></div><div className="stat-card"><span>Currency</span><b>{integrationConfig.currency}</b></div><div className="stat-card"><span>SMS Provider</span><b>{integrationConfig.smsProvider || "generic"}</b></div><div className="stat-card"><span>SMS</span><b>{integrationConfig.smsNotificationsEnabled ? "Configured" : "Not configured"}</b></div></div><p>Provider credentials server-এর environment variables-এ রাখতে হবে; এই UI-তে secret দেখানো বা সংরক্ষণ করা হয় না।</p></div>
            <div className="admin-table-card"><h2>Online Payment Gateway Activity</h2><p>সর্বশেষ ১০০টি online payment। `reconciliation_required` থাকলে Provider transaction যাচাই করে reconciliation করুন; এই তালিকা থেকে সরাসরি Payment সফল করা যায় না।</p><div className="dashboard-stats" style={{marginBottom:14}}>{Object.entries(onlinePayments.counts || {}).map(([status,count])=><div className="stat-card" key={status}><span>{status}</span><b>{count}</b></div>)}</div><div className="table-scroll"><table className="bookings-table"><thead><tr><th>Payment ID</th><th>Ticket</th><th>Amount</th><th>Status</th><th>Provider Ref</th><th>Created</th><th>Note</th></tr></thead><tbody>{(onlinePayments.payments || []).map(p=><tr key={p.paymentId}><td>{p.paymentId}</td><td>{p.ticketId || p.bookingId}</td><td>{p.currency} {Number(p.amount || 0).toLocaleString("en-BD")}</td><td>{p.status}</td><td>{p.providerTransactionId || "—"}</td><td>{p.createdAt ? new Date(p.createdAt).toLocaleString("bn-BD") : "—"}</td><td>{p.reconciliationReason || "—"}</td></tr>)}{!onlinePayments.payments?.length && <tr><td colSpan="7">এখনো online payment record নেই।</td></tr>}</tbody></table></div></div>
          </>
        )}
        {tab === "quotations" && (
          <div className="admin-table-card"><div className="table-toolbar"><div><h2>All Quotations</h2><p>সকল Customer-এর Quotation, সংশ্লিষ্ট Booking ও সিদ্ধান্তের Status এখানে দেখা যাবে।</p></div><span>{adminQuotations.length} / {quotationPagination.total||adminQuotations.length}</span></div><div className="table-scroll"><table className="bookings-table"><thead><tr><th>Quotation</th><th>Customer / Ticket</th><th>Service</th><th>Created</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>{adminQuotations.map(q=><tr key={q.quotationId}><td>{q.quotationId}</td><td><b>{q.booking?.name||"—"}</b><small style={{display:"block"}}>{q.booking?.ticketId||q.bookingId}</small><small>{q.booking?.phone||""}</small></td><td>{q.booking?.serviceName||"—"}</td><td>{q.createdAt?new Date(q.createdAt).toLocaleString("bn-BD"):"—"}</td><td>{(q.items||[]).map(i=>`${i.description} × ${i.quantity}`).join(", ")}</td><td>৳{Number(q.total||0).toLocaleString("en-BD")}</td><td>{q.status}</td></tr>)}{!adminQuotations.length&&<tr><td colSpan="7">কোনো Quotation পাওয়া যায়নি।</td></tr>}</tbody></table></div><button className="btn btn-outline" style={{marginTop:12}} onClick={load}>Refresh quotations</button></div>
        )}
        {tab === "inventory" && (
          <>
            <form className="editor-card" onSubmit={addItem}>
              <h2>নতুন Inventory Item</h2>
              <div className="editor-field-grid">
                {[
                  ["name", "পণ্যের নাম"],
                  ["sku", "SKU / Code"],
                  ["quantity", "পরিমাণ"],
                  ["unit", "Unit"],
                  ["costPrice", "ক্রয়মূল্য (৳)"],
                  ["reorderLevel", "Low stock alert level"],
                ].map(([k, l]) => (
                  <label key={k}>
                    {l}
                    <input
                      required={["name", "quantity", "costPrice"].includes(k)}
                      type={
                        ["quantity", "costPrice", "reorderLevel"].includes(k)
                          ? "number"
                          : "text"
                      }
                      min={
                        ["quantity", "costPrice", "reorderLevel"].includes(k)
                          ? "0"
                          : undefined
                      }
                      value={item[k]}
                      onChange={(e) =>
                        setItem({ ...item, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="inventory-form-actions">
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "সংরক্ষণ হচ্ছে…" : editingItemId ? "পরিবর্তন সংরক্ষণ করুন" : "Inventory-তে যোগ করুন"}
                </button>
                {editingItemId && (
                  <button type="button" className="btn btn-outline" disabled={busy} onClick={resetItemForm}>
                    বাতিল
                  </button>
                )}
              </div>
            </form>
            <form className="editor-card" onSubmit={saveMovement}>
              <h2>Stock In / Stock Out</h2>
              <p>Stock In করলে চাইলে ক্রয়ব্যয় Ledger-এ যাবে; Booking-এর জন্য Stock Out করলে ব্যবহৃত মালামালের খরচ Finance-এ যুক্ত হবে।</p>
              <div className="editor-field-grid">
                <label>Inventory Item<select required value={movementItemId} onChange={e => { setMovementItemId(e.target.value); const selected = data.items.find(x => x._id === e.target.value); if (selected) setMovement(m => ({ ...m, unitCost: String(selected.costPrice || 0) })); }}><option value="">পণ্য নির্বাচন করুন</option>{data.items.map(x => <option key={x._id} value={x._id}>{x.name} · Stock {x.quantity} {x.unit}</option>)}</select></label>
                <label>Movement<select value={movement.type} onChange={e => setMovement({ ...movement, type: e.target.value })}><option value="in">Stock In (ক্রয়/যোগ)</option><option value="out">Stock Out (ব্যবহার/বের)</option></select></label>
                <label>পরিমাণ<input required type="number" min="0.01" step="0.01" value={movement.quantity} onChange={e => setMovement({ ...movement, quantity: e.target.value })}/></label>
                <label>প্রতি ইউনিট খরচ (৳)<input required type="number" min="0" step="0.01" value={movement.unitCost} onChange={e => setMovement({ ...movement, unitCost: e.target.value })}/></label>
                {movement.type === "out" && <label>Booking (ঐচ্ছিক)<select value={movement.bookingId} onChange={e => setMovement({ ...movement, bookingId: e.target.value })}><option value="">Booking ছাড়া</option>{opsBookings.map(b => <option key={b._id} value={b._id}>{b.ticketId || b._id} · {b.serviceName || "Service"}</option>)}</select></label>}
                <label>বিবরণ<input value={movement.note} onChange={e => setMovement({ ...movement, note: e.target.value })} placeholder="চালান / ব্যবহার বিবরণ"/></label>
              </div>
              <button className="btn btn-primary" disabled={busy || !movementItemId}>{busy ? "সংরক্ষণ হচ্ছে…" : "Stock Movement সংরক্ষণ"}</button>
            </form>
            <div className="admin-table-card inventory-list-card">
              <div className="inventory-list-heading">
                <div>
                  <h2>Inventory List</h2>
                  <p>পণ্যের তথ্য, স্টক এবং মূল্য পরিচালনা করুন</p>
                </div>
                <span>{data.items.length} items</span>
              </div>
              <div className="table-scroll">
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>পণ্য</th>
                      <th>SKU</th>
                      <th>Stock</th>
                      <th>Unit cost</th>
                      <th>Stock value</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((x) => (
                      <tr key={x._id}>
                        <td>{x.name}</td>
                        <td>{x.sku || "—"}</td>
                        <td>
                          {x.quantity} {x.unit}
                          {Number(x.quantity) <= Number(x.reorderLevel)
                            ? " ⚠️"
                            : ""}
                        </td>
                        <td>৳{x.costPrice}</td>
                        <td>
                          ৳
                          {(
                            Number(x.quantity) * Number(x.costPrice)
                          ).toLocaleString("en-BD")}
                        </td>
                        <td>
                          <div className="inventory-row-actions">
                            <button type="button" className="btn btn-outline btn-small" onClick={() => editItem(x)}>
                              Edit
                            </button>
                            <button type="button" className="btn btn-outline btn-small inventory-delete-btn" onClick={() => deleteItem(x)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export function RolePermissionsPage() {
  const [roles, setRoles] = useState([]),
    [role, setRole] = useState("staff"),
    [permissions, setPermissions] = useState({}),
    [staffUsers, setStaffUsers] = useState([]),
    [selectedStaffId, setSelectedStaffId] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const token =
    sessionStorage.getItem("muAdminToken") ||
    sessionStorage.getItem("muUserToken");
  const resources = [
    "dashboard",
    "bookings",
    "assignedBookings",
    "ownBookings",
    "ownPayments",
    "ownQuotations",
    "earnings",
    "servicePhotos",
    "quotations",
    "payments",
    "inventory",
    "reports",
    "customers",
    "services",
    "pages",
    "media",
    "users",
    "roles",
    "settings",
    "profile",
    "bookingAttachments",
    "bookingReschedule",
    "invoices",
    "receipts",
    "warrantyClaims",
    "complaints",
    "completionOtp",
    "attendance",
    "leaveRequests",
    "technicianSkills",
    "serviceAreas",
    "commissionRates",
    "serviceReports",
    "partsRequests",
    "refunds",
    "notifications",
    "whatsappNotifications",
    "quotationTemplates",
    "finance",
    "paymentReconciliation",
    "customerDirectory",
    "staffApproval",
    "technicianManagement",
    "mediaUploads",
    "cmsBuilder",
  ];
  const actions = [
    "read",
    "create",
    "update",
    "delete",
    "assign",
    "status",
    "publish",
    "*",
  ];
  async function load() {
    try {
      const r = await fetch(`${API}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Role list load failed");
      setRoles(d.roles || []);
      const staffResponse = await fetch(`${API}/admin/staff`, { headers: { Authorization: `Bearer ${token}` } });
      const staffData = await staffResponse.json();
      if (!staffResponse.ok) throw new Error(staffData.message || "Staff permission list load failed");
      const staffList = staffData.staff || [];
      setStaffUsers(staffList);
      setSelectedStaffId(currentId => currentId && staffList.some(u => u._id === currentId) ? currentId : (staffList[0]?._id || ""));
      const current = (d.roles || []).find((x) => x.role === role);
      setPermissions(current?.permissions || {});
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  React.useEffect(() => {
    load();
  }, []);
  function choose(next) {
    setRole(next);
    setPermissions(roles.find((x) => x.role === next)?.permissions || {});
    setNotice("");
  }
  function toggle(resource, action, checked) {
    setPermissions((old) => {
      const next = { ...old };
      const values = new Set(next[resource] || []);
      checked ? values.add(action) : values.delete(action);
      if (values.size) next[resource] = [...values];
      else delete next[resource];
      return next;
    });
  }
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch(`${API}/roles/${role}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissions }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Save failed");
      setNotice("Permission সফলভাবে সংরক্ষণ হয়েছে।");
      await load();
      setPermissions(d.permissions || permissions);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-page">
      <div className="admin-top">
        <div className="container admin-top-inner">
          <Link to="/admin" className="brand">
            <span className="brand-mark">
              <Home size={22} />
            </span>
            <span>
              <strong>
                MU <b>HOME SERVICE</b>
              </strong>
              <small>ROLE & PERMISSIONS</small>
            </span>
          </Link>
          <Link to="/admin" className="btn btn-outline">
            ← Dashboard
          </Link>
        </div>
      </div>
      <div className="container admin-content">
        <div className="admin-heading">
          <div>
            <span className="section-kicker">ACCESS CONTROL</span>
            <h1>Role & Permission Manager</h1>
            <p>
              Role অনুযায়ী মডিউল ও কাজের অনুমতি নির্ধারণ করুন। Admin-এর পূর্ণ
              অধিকার পরিবর্তনযোগ্য নয়।
            </p>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        <div className="admin-table-card" style={{ padding: 24 }}>
          <label>
            Role নির্বাচন
            <select value={role} onChange={(e) => choose(e.target.value)}>
              {roles
                .filter((r) => r.role !== "admin")
                .map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.role}
                  </option>
                ))}
            </select>
          </label>
          <p>
            প্রতিটি Resource-এর জন্য অনুমতি নির্বাচন করুন। পরিবর্তন Backend-এ
            সংরক্ষিত হবে।
          </p>
          <div className="table-scroll">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Module / Resource</th>
                  {actions.map((a) => (
                    <th key={a}>{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource}>
                    <td>
                      <b>{resource}</b>
                    </td>
                    {actions.map((action) => (
                      <td key={action}>
                        <input
                          aria-label={`${resource} ${action}`}
                          type="checkbox"
                          checked={
                            (permissions[resource] || []).includes(action) ||
                            (permissions[resource] || []).includes("*")
                          }
                          onChange={(e) =>
                            toggle(resource, action, e.target.checked)
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button
              className="btn btn-primary"
              disabled={busy || role === "admin"}
              onClick={save}
            >
              {busy ? "Saving…" : "Save Permissions"}
            </button>
            <button className="btn btn-outline" onClick={load}>
              Reload
            </button>
          </div>
        </div>
        <div className="admin-table-card" style={{ padding: 24, marginTop: 20 }}>
          <div className="table-toolbar"><div><h2>Staff Account Permissions</h2><p>Staff approval থেকে permission controls সরানো হয়েছে। Staff-এর নির্দিষ্ট অনুমতি শুধু এই Permission tab থেকেই পরিচালনা করুন।</p></div></div>
          <label style={{ display: "grid", gap: 8, maxWidth: 460, marginBottom: 18 }}>Staff account নির্বাচন
            <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)}>
              {staffUsers.map(member => <option key={member._id} value={member._id}>{member.name || member.email} — {member.email}</option>)}
            </select>
          </label>
          {selectedStaffId ? <div className="editor-field-grid">{[["assignTechnicians","Assign technician(s)"],["manageQuotations","Create quotations"],["manageBookings","Manage bookings"],["managePayments","Manage payments & finance"],["manageInventory","Manage inventory"],["viewReports","View reports"]].map(([permission,label]) => { const member = staffUsers.find(x => x._id === selectedStaffId); return <label key={permission} style={{display:"flex",gap:10,alignItems:"center",padding:"10px 12px",border:"1px solid var(--border-color, #dbe4f0)",borderRadius:10}}><input type="checkbox" checked={(member?.permissions || []).includes(permission)} disabled={(member?.accountStatus || "pending") !== "approved"} onChange={async e => { const enabled = e.target.checked; try { const response = await fetch(`${API}/admin/staff/${selectedStaffId}/permissions`, { method:"PATCH", headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`}, body:JSON.stringify({permission,enabled}) }); const result = await response.json(); if (!response.ok) throw new Error(result.message || "Permission update failed"); setStaffUsers(list => list.map(u => u._id === selectedStaffId ? {...u, permissions: enabled ? [...new Set([...(u.permissions||[]),permission])] : (u.permissions||[]).filter(x=>x!==permission)} : u)); setNotice(`${label} permission আপডেট হয়েছে।`); } catch(err) { setError(err.message); } }}/>{label}</label>; })}</div> : <p>Staff account পাওয়া যায়নি। আগে Staff Account Approval থেকে account approve করুন।</p>}
        </div>
        <p className="admin-security-note">
          নিরাপত্তা: Admin Role Public Registration-এ পাওয়া যায় না। Staff ও
          Technician-এর অ্যাকাউন্ট Admin অনুমোদনের পর সক্রিয় হবে।
        </p>
      </div>
    </main>
  );
}
