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
  const [login, setLogin] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [assignableTechnicians, setAssignableTechnicians] = useState([]);
  const [assignmentSelections, setAssignmentSelections] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    fresh: 0,
    progress: 0,
    completed: 0,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
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
      const [b, s, tech] = await Promise.all([
        api(`/admin/bookings?status=${encodeURIComponent(statusFilter)}&q=${encodeURIComponent(query)}`),
        api("/admin/stats"),
        api("/admin/technicians"),
      ]);
      setBookings(b.bookings);
      setStats(s);
      setAssignableTechnicians((tech.technicians || []).filter(t => (t.technicianStatus || t.accountStatus) === "approved"));
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
  }, [token, statusFilter]);
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
        `আপনি কি ${booking.ticketId} বুকিংটি স্থায়ীভাবে মুছে ফেলতে চান?`,
      )
    )
      return;
    setError("");
    setNotice("");
    try {
      await api(`/admin/bookings/${booking._id}`, { method: "DELETE" });
      setNotice(`বুকিং ${booking.ticketId} মুছে ফেলা হয়েছে।`);
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
            <span>Welcome, {admin?.name || "Admin"}</span>
            <button className="btn btn-outline btn-small" onClick={logout}>
              <LogOut size={15} /> Logout
            </button>
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
            <Link className="btn btn-outline" to="/profile?account=admin">
              আমার প্রোফাইল
            </Link>
            <Link className="btn btn-primary" to="/admin/cms">
              CMS / Page Builder
            </Link>
            <Link className="btn btn-outline" to="/admin/content">
              Service Editor
            </Link>
            <Link className="btn btn-outline" to="/admin/management">
              Management Center
            </Link>
            <Link className="btn btn-outline" to="/admin/roles">
              Role & Permissions
            </Link>
            <button className="btn btn-outline" onClick={refresh}>
              <RefreshCw size={16} /> Refresh
            </button>
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
        <div className="admin-table-card">
          <div className="table-toolbar">
            <div>
              <h2>All requests</h2>
              <p>সর্বশেষ ৩০০টি request</p>
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
                  "Approved",
                  "In progress",
                  "Completed",
                  "Cancelled",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <button className="btn btn-primary btn-small" onClick={refresh}>
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
        </div>
        <p className="admin-security-note">
          <ShieldCheck size={15} /> Admin API is protected by JWT. Log out when
          finished, especially on shared devices.
        </p>
      </div>
    </main>
  );
}

export function ContentManagerPage() {
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
        <div className="dashboard-title">
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
        </div>
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
            <div className="editor-help">
              <b>Graphical Content Editor</b>
              <p>
                ছবি যোগ করতে image URL দিন। ছবি আপনার নিজস্ব hosting-এ রাখুন
                অথবা image URL ব্যবহার করুন।
              </p>
            </div>
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
              <span className="status-pill">{booking.status}</span>
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
  const [tab, setTab] = useState("overview"),
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
      const [f, i, t, st, summary, bookingResult] = await Promise.all([
        request("/admin/finance"),
        request("/admin/inventory"),
        request("/admin/technicians"),
        request("/admin/staff"),
        request("/admin/operations/summary"),
        request("/admin/operations/bookings"),
      ]);
      setData({ ...f, ...i, ...t, ...st, ...summary });
      setOpsBookings(bookingResult.bookings || []);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (token) load();
  }, []);
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
          <Link to="/admin" className="btn btn-outline">
            ← Booking Dashboard
          </Link>
        </div>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        <div className="editor-tabs">
          {[
            ["overview", "Overview & Reports"],
            ["technicians", `Technician Management${data.technicians.filter(t => (t.technicianStatus || t.accountStatus || "pending") === "pending").length ? ` (${data.technicians.filter(t => (t.technicianStatus || t.accountStatus || "pending") === "pending").length})` : ""}`],
            ["staff", `Staff Account Approval${data.staff.filter(m => (m.accountStatus || "pending") === "pending").length ? ` (${data.staff.filter(m => (m.accountStatus || "pending") === "pending").length})` : ""}`],
            ["finance", "আয়-ব্যয়"],
            ["payments", "Booking Payments"],
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
            <div className="stats-grid">
              <div className="stat-card">
                <span>মোট আয়</span>
                <b>৳{Number(data.income || 0).toLocaleString("en-BD")}</b>
              </div>
              <div className="stat-card">
                <span>মোট ব্যয়</span>
                <b>৳{Number(data.expense || 0).toLocaleString("en-BD")}</b>
              </div>
              <div className="stat-card">
                <span>নিট ব্যালেন্স</span>
                <b>৳{Number(data.profit || 0).toLocaleString("en-BD")}</b>
              </div>
              <div className="stat-card">
                <span>Inventory Items</span>
                <b>{data.items.length}</b>
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
                <thead><tr><th>নাম</th><th>Email</th><th>Phone</th><th>Registration Date</th><th>Status / Action</th><th>Technician Assign Permission</th></tr></thead>
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
                      <td><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={(member.permissions || []).includes("assignTechnicians")} disabled={status !== "approved"} onChange={async e => { try { await request(`/admin/staff/${member._id}/assign-permission`, { method: "PATCH", body: JSON.stringify({ enabled: e.target.checked }) }); setNotice("Technician assign permission আপডেট হয়েছে।"); await load(); } catch (err) { setError(err.message); } }} /> Assign technician(s)</label></td>
                    </tr>;
                  })}
                  {data.staff.length === 0 && <tr><td colSpan="6">কোনো Staff account পাওয়া যায়নি।</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
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
          </>
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
    "customers",
    "services",
    "pages",
    "media",
    "users",
    "roles",
    "settings",
    "profile",
  ];
  const actions = [
    "read",
    "create",
    "update",
    "delete",
    "assign",
    "status",
    "publish",
  ];
  async function load() {
    try {
      const r = await fetch(`${API}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Role list load failed");
      setRoles(d.roles || []);
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
        <p className="admin-security-note">
          নিরাপত্তা: Admin Role Public Registration-এ পাওয়া যায় না। Staff ও
          Technician-এর অ্যাকাউন্ট Admin অনুমোদনের পর সক্রিয় হবে।
        </p>
      </div>
    </main>
  );
}
