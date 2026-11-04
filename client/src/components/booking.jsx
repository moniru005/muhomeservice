
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
} from "lucide-react";
import CMSPage, { PublicCMSPage } from "../pages-CMS.jsx";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
import { fallbackServices, fallbackPackages, money } from "../models/catalog.js";
import { useSiteContent } from "../hooks/useSiteContent.js";


export function BookingForm({
  services,
  packages = fallbackPackages,
  initialService = "",
  compact = false,
}) {
  const readAccount = () => {
    try {
      return JSON.parse(sessionStorage.getItem("muUser") || "null");
    } catch {
      return null;
    }
  };
  const [account, setAccount] = useState(readAccount);
  const [hasToken, setHasToken] = useState(() =>
    Boolean(sessionStorage.getItem("muUserToken")),
  );
  const canBook = Boolean(hasToken && account && account.role === "customer");
  const [form, setForm] = useState(() => {
    const a = readAccount();
    return {
      name: a?.name || "",
      phone: a?.phone || "",
      email: a?.email || "",
      serviceId: initialService,
      address: "",
      area: "Maijdee",
      preferredDate: "",
      preferredTime: "যেকোনো সময়",
      problem: "",
    };
  });
  const [state, setState] = useState({
    loading: false,
    error: "",
    success: null,
  });
  const [bookingPhotos, setBookingPhotos] = useState([]);
  const [bookingConfig, setBookingConfig] = useState({ service: {}, business: {} });
  const configuredAreaOptions = useMemo(() => String(bookingConfig.service.serviceAreas || "").split(/[\n,;]+/).map(x => x.trim()).filter(Boolean), [bookingConfig.service.serviceAreas]);
  const areaOptions = configuredAreaOptions.length ? configuredAreaOptions : ["Maijdee", "Sonapur", "Chowmuhani", "Noakhali Sadar", "Other area"];
  const selectedCatalogItem = useMemo(() => [...(services || []), ...(packages || [])].find(item => item.id === form.serviceId) || null, [services, packages, form.serviceId]);
  const quotePreview = useMemo(() => {
    const toAmount = value => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; };
    const price = toAmount(selectedCatalogItem?.price);
    const minimum = toAmount(bookingConfig.service.minimumBooking);
    const base = Math.max(price, minimum);
    const emergency = form.emergency && bookingConfig.business.emergencyService ? toAmount(bookingConfig.service.emergencyFee) : 0;
    const taxRate = Math.min(100, toAmount(bookingConfig.service.taxRate));
    const subtotal = base + emergency;
    const tax = Math.round((subtotal * taxRate / 100 + Number.EPSILON) * 100) / 100;
    const total = Math.round((subtotal + tax + Number.EPSILON) * 100) / 100;
    const advanceInput = toAmount(bookingConfig.service.bookingAdvance);
    const advance = String(bookingConfig.service.advanceType || "fixed").toLowerCase() === "percentage"
      ? Math.min(total, total * Math.min(100, advanceInput) / 100) : Math.min(total, advanceInput);
    return { price, base, emergency, taxRate, tax, total, advance: Math.round((advance + Number.EPSILON) * 100) / 100, balance: Math.round((total - advance + Number.EPSILON) * 100) / 100, minimum, meetsMinimum: price >= minimum };
  }, [selectedCatalogItem, bookingConfig, form.emergency]);
  const formatQuoteMoney = value => `৳${Number(value || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  useEffect(() => {
    if (areaOptions.length && !areaOptions.some(area => area.toLocaleLowerCase() === String(form.area || "").toLocaleLowerCase())) {
      setForm(previous => ({ ...previous, area: areaOptions[0] }));
    }
  }, [areaOptions, form.area]);
  useEffect(() => {
    let active = true;
    fetch(`${API}/site-settings`).then(r => r.ok ? r.json() : null).then(d => {
      if (active && d?.settings) setBookingConfig({ service: d.settings.service || {}, business: d.settings.business || {} });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (initialService) setForm((p) => ({ ...p, serviceId: initialService }));
  }, [initialService]);
  const update = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  async function submit(e) {
    e.preventDefault();
    const token = sessionStorage.getItem("muUserToken");
    let current;
    try {
      current = JSON.parse(sessionStorage.getItem("muUser") || "null");
    } catch {
      current = null;
    }
    if (!token || !current) {
      sessionStorage.removeItem("muUserToken");
      sessionStorage.removeItem("muUser");
      setHasToken(false);
      setAccount(null);
      setState({
        loading: false,
        error: "বুকিং করার আগে Customer/Client অ্যাকাউন্টে লগইন করুন।",
        success: null,
      });
      return;
    }
    if (current.role !== "customer") {
      setState({
        loading: false,
        error: "শুধুমাত্র Customer/Client অ্যাকাউন্ট থেকে বুকিং করা যাবে।",
        success: null,
      });
      return;
    }
    if (selectedCatalogItem && !quotePreview.meetsMinimum) {
      setState({ loading: false, error: `এই সার্ভিসের মূল্য নির্ধারিত Minimum Booking (${formatQuoteMoney(quotePreview.minimum)})-এর কম। এই সার্ভিসের জন্য এখন বুকিং করা যাবে না।`, success: null });
      return;
    }
    setState({ loading: true, error: "", success: null });
    try {
      const res = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem("muUserToken");
          sessionStorage.removeItem("muUser");
          setHasToken(false);
          setAccount(null);
          throw new Error(
            "আপনার লগইন সেশন শেষ হয়েছে। বুকিং করতে Customer/Client হিসেবে আবার লগইন করুন।",
          );
        }
        throw new Error(data.message || "বুকিং করা যায়নি");
      }
      let finalData = data;
      let uploadWarning = "";
      if (bookingPhotos.length && data.bookingId) {
        const photoBody = new FormData();
        bookingPhotos.slice(0, 5).forEach((file) => photoBody.append("photos", file));
        const photoRes = await fetch(`${API}/customer/bookings/${data.bookingId}/photos`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: photoBody });
        const photoData = await photoRes.json().catch(() => ({}));
        if (!photoRes.ok) { uploadWarning = `বুকিং তৈরি হয়েছে (${data.ticketId}), কিন্তু ছবি আপলোড হয়নি: ${photoData.message || "Dashboard থেকে আবার আপলোড করুন"}`; }
        else finalData = { ...data, message: `${data.message || "বুকিং গ্রহণ করা হয়েছে।"} নির্বাচিত ছবিও যুক্ত হয়েছে।` };
      }
      setState({ loading: false, error: uploadWarning, success: finalData });
      setBookingPhotos([]);
      setForm({
        name: current.name || "",
        phone: current.phone || "",
        email: current.email || "",
        serviceId: initialService,
        address: "",
        area: "Maijdee",
        preferredDate: "",
        preferredTime: "যেকোনো সময়",
        problem: "",
      });
    } catch (err) {
      setState({
        loading: false,
        error: err.message.includes("Failed to fetch")
          ? "সার্ভারের সঙ্গে সংযোগ হচ্ছে না। Backend চালু আছে কি না দেখুন।"
          : err.message,
        success: null,
      });
    }
  }
  if (!canBook) {
    return (
      <div className={`booking-form ${compact ? "compact-form" : ""}`}>
        <div className="alert error" role="alert">
          <b>বুকিং করতে Customer/Client হিসেবে লগইন করুন।</b>
          <p style={{ margin: "8px 0" }}>
            আপনার বুকিং অ্যাকাউন্টের সঙ্গে যুক্ত থাকবে। লগইন না করা পর্যন্ত
            বুকিং জমা দেওয়া যাবে না।
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" to="/login?redirect=/book">
              Customer হিসেবে লগইন করুন
            </Link>
            <Link className="btn btn-outline" to="/register">
              নতুন Customer অ্যাকাউন্ট খুলুন
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <form
      className={`booking-form ${compact ? "compact-form" : ""}`}
      onSubmit={submit}
    >
      {state.success && (
        <div className="alert success">
          <CheckCircle2 size={19} />
          <div>
            <b>বুকিং গ্রহণ করা হয়েছে!</b>
            <br />
            {state.success.message}
            <br />
            <strong>Ticket ID: {state.success.ticketId}</strong>
            {state.success.amount && <div style={{marginTop:8}}>
              <div>Base: {formatQuoteMoney(state.success.amount.base)}</div>
              {Number(state.success.amount.emergencyFee || 0) > 0 && <div>জরুরি চার্জ: {formatQuoteMoney(state.success.amount.emergencyFee)}</div>}
              {Number(state.success.amount.tax || 0) > 0 && <div>Tax/VAT: {formatQuoteMoney(state.success.amount.tax)}</div>}
              <b>মোট: {formatQuoteMoney(state.success.amount.total)}</b>
              {Number(state.success.amount.advanceDue || 0) > 0 && <div>Advance due: {formatQuoteMoney(state.success.amount.advanceDue)}</div>}
            </div>}
          </div>
        </div>
      )}
      {state.error && (
        <div className="alert error" role="alert">
          {state.error}{" "}
          {(!sessionStorage.getItem("muUserToken") ||
            readAccount()?.role !== "customer") && (
            <Link to="/login?redirect=/book">Customer হিসেবে লগইন করুন</Link>
          )}
        </div>
      )}
      <div className="form-grid">
        <label>
          আপনার নাম *
          <input
            required
            name="name"
            value={form.name}
            onChange={update}
            placeholder="পূর্ণ নাম"
            minLength="2"
          />
        </label>
        <label>
          মোবাইল নম্বর *
          <input
            required
            name="phone"
            value={form.phone}
            onChange={update}
            placeholder="01XXXXXXXXX"
            inputMode="tel"
          />
        </label>
        <label>
          সার্ভিস নির্বাচন *
          <select
            required
            name="serviceId"
            value={form.serviceId}
            onChange={update}
          >
            <option value="">সার্ভিস বেছে নিন</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — শুরু {money(s.price)}
              </option>
            ))}
            <optgroup label="বার্ষিক প্যাকেজ">
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {money(p.price)}/{p.period}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          এলাকা *
          <select name="area" value={form.area} onChange={update}>
            {areaOptions.map(area => <option key={area} value={area}>{area}</option>)}
          </select>
        </label>
        <label className="full-field">
          সম্পূর্ণ ঠিকানা *
          <input
            required
            name="address"
            value={form.address}
            onChange={update}
            placeholder="বাড়ি/রোড/এলাকা"
            minLength="5"
          />
        </label>
        <label>
          পছন্দের তারিখ
          <input
            type="date"
            name="preferredDate"
            value={form.preferredDate}
            onChange={update}
            min={new Date().toISOString().slice(0, 10)}
          />
        </label>
        <label>
          পছন্দের সময়
          <select
            name="preferredTime"
            value={form.preferredTime}
            onChange={update}
          >
            <option>যেকোনো সময়</option>
            <option>সকাল ৯টা–১২টা</option>
            <option>দুপুর ১২টা–৩টা</option>
            <option>বিকাল ৩টা–৬টা</option>
            <option>জরুরি</option>
          </select>
        </label>
        {bookingConfig.business.emergencyService && <label className="full-field booking-emergency-option">
          <input type="checkbox" checked={Boolean(form.emergency)} onChange={e => setForm(p => ({ ...p, emergency: e.target.checked }))} />
          জরুরি সার্ভিস প্রয়োজন (প্রযোজ্য হলে অতিরিক্ত চার্জ যুক্ত হবে)
        </label>}
        <label className="full-field">
          সমস্যার ছবি (ঐচ্ছিক, সর্বোচ্চ ৫টি)
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setBookingPhotos(Array.from(e.target.files || []).slice(0, 5))} />
          <small>{bookingPhotos.length ? `${bookingPhotos.length}টি ছবি নির্বাচিত` : "প্রতি ছবি সর্বোচ্চ ৫ MB; JPG, PNG বা WebP"}</small>
        </label>
        <label className="full-field">
          সমস্যার বিবরণ *
          <textarea
            required
            name="problem"
            value={form.problem}
            onChange={update}
            placeholder="কী ধরনের সার্ভিস প্রয়োজন, সংক্ষেপে লিখুন..."
            rows="3"
            minLength="5"
          />
        </label>
      </div>
      {selectedCatalogItem && !quotePreview.meetsMinimum && <div className="alert error" role="alert">এই সার্ভিসের মূল্য {formatQuoteMoney(quotePreview.price)}; Minimum Booking হলো {formatQuoteMoney(quotePreview.minimum)}। Minimum Booking পূরণ না হওয়ায় বুকিং পাঠানো যাবে না।</div>}
      {selectedCatalogItem && <section className="booking-amount-preview" aria-live="polite" style={{border:"1px solid #dbe4ee",borderRadius:12,padding:16,margin:"14px 0",background:"#f8fafc"}}>
        <h3 style={{margin:"0 0 10px"}}>বুকিংয়ের আনুমানিক খরচ</h3>
        <div style={{display:"grid",gap:6}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span>সার্ভিস মূল্য</span><b>{formatQuoteMoney(quotePreview.price)}</b></div>
          {quotePreview.base > quotePreview.price && <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span>Minimum Booking অনুযায়ী অতিরিক্ত</span><b>{formatQuoteMoney(quotePreview.base - quotePreview.price)}</b></div>}
          <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span>Base amount</span><b>{formatQuoteMoney(quotePreview.base)}</b></div>
          {quotePreview.emergency > 0 && <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span>জরুরি সার্ভিস চার্জ</span><b>{formatQuoteMoney(quotePreview.emergency)}</b></div>}
          {quotePreview.taxRate > 0 && <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span>Tax / VAT ({quotePreview.taxRate}%)</span><b>{formatQuoteMoney(quotePreview.tax)}</b></div>}
          <div style={{display:"flex",justifyContent:"space-between",gap:12,borderTop:"1px solid #cbd5e1",paddingTop:8}}><strong>আনুমানিক মোট খরচ</strong><strong>{formatQuoteMoney(quotePreview.total)}</strong></div>
          {quotePreview.advance > 0 && <>
            <div style={{display:"flex",justifyContent:"space-between",gap:12}}><span>বুকিং advance (আগে পরিশোধযোগ্য)</span><b>− {formatQuoteMoney(quotePreview.advance)}</b></div>
            <div style={{display:"flex",justifyContent:"space-between",gap:12,borderTop:"1px solid #cbd5e1",paddingTop:8,fontSize:17,color:"#14532d"}}><strong>Advance বাদে বাকি</strong><strong>{formatQuoteMoney(quotePreview.balance)}</strong></div>
          </>}
        </div>
        <small style={{display:"block",marginTop:8,color:"#64748b"}}>General Settings ও নির্বাচিত সার্ভিসের ভিত্তিতে আনুমানিক হিসাব। চূড়ান্ত মূল্য Admin/Technician quotation-এ নিশ্চিত করবেন।</small>
      </section>}
      {(bookingConfig.service.cancellationPolicy || bookingConfig.service.reschedulePolicy) && <div className="booking-policy-note">
        {bookingConfig.service.cancellationPolicy && <p><b>বাতিলের নীতি:</b> {bookingConfig.service.cancellationPolicy}</p>}
        {bookingConfig.service.reschedulePolicy && <p><b>সময় পরিবর্তনের নীতি:</b> {bookingConfig.service.reschedulePolicy}</p>}
      </div>}
      <p className="form-disclaimer">
        <ShieldCheck size={15} /> বুকিং পাঠানোর পর Minimum Booking, প্রযোজ্য Emergency Fee ও VAT অনুযায়ী আনুমানিক খরচ নির্ধারিত হবে। চূড়ান্ত quotation আমাদের টিম নিশ্চিত করবে।
      </p>
      <button className="btn btn-primary btn-full" disabled={state.loading || Boolean(selectedCatalogItem && !quotePreview.meetsMinimum)}>
        {state.loading ? "পাঠানো হচ্ছে..." : "সার্ভিস রিকোয়েস্ট পাঠান"}{" "}
        <ArrowRight size={17} />
      </button>
    </form>
  );
}

export function BookPage({ services, packages }) {
  const params = new URLSearchParams(window.location.search);
  const initial = params.get("service") || "";
  return (
    <main className="inner-page">
      <div className="inner-hero">
        <div className="container">
          <span className="section-kicker light-kicker">BOOK A SERVICE</span>
          <h1>
            আপনার সার্ভিস <span>বুক করুন</span>
          </h1>
          <p>তথ্য দিন, আমাদের টিম ফোন করে booking ও quotation নিশ্চিত করবে।</p>
          <div className="breadcrumb">
            <Link to="/">হোম</Link>
            <span>/</span>
            <span>সার্ভিস বুকিং</span>
          </div>
        </div>
      </div>
      <div className="container book-layout">
        <div className="book-form-wrap">
          <h2>বুকিংয়ের তথ্য</h2>
          <p>তারকাচিহ্ন (*) দেওয়া তথ্যগুলো পূরণ করা বাধ্যতামূলক।</p>
          <BookingForm
            services={services}
            packages={packages}
            initialService={initial}
          />
        </div>
        <aside className="booking-aside">
          <div className="aside-card">
            <span className="aside-icon">
              <Headphones />
            </span>
            <h3>সহায়তা প্রয়োজন?</h3>
            <p>ফর্ম পূরণে সমস্যা হলে সরাসরি আমাদের সঙ্গে যোগাযোগ করুন।</p>
            <a href="tel:+8801683988686" className="btn btn-primary btn-full">
              <Phone size={17} /> 01683-988686
            </a>
          </div>
          <div className="aside-card pale-card">
            <ShieldCheck size={23} />
            <h3>স্বচ্ছ সার্ভিস</h3>
            <ul>
              <li>কাজ শুরুর আগে quotation</li>
              <li>আপনার অনুমতি ছাড়া extra work নয়</li>
              <li>Parts ও labour আলাদা দেখানো হবে</li>
              <li>Booking-এর পর ফোনে নিশ্চিতকরণ</li>
            </ul>
          </div>
          <div className="aside-note">
            <MapPin size={17} />
            <span>প্রাথমিক সার্ভিস এলাকা: মাইজদী, সোনাপুর ও নোয়াখালী সদর।</span>
          </div>
        </aside>
      </div>
    </main>
  );
}
