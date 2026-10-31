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
  CalendarPlus,
  FileUp,
  XCircle,
  ClipboardCheck,
} from "lucide-react";
import CMSPage, { PublicCMSPage } from "../pages-CMS.jsx";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
import { fallbackServices, fallbackPackages, money } from "../models/catalog.js";
import { useSiteContent } from "../hooks/useSiteContent.js";



const BD_DIVISION_DISTRICTS = {
  "Barishal": ["Barguna","Barishal","Bhola","Jhalokati","Patuakhali","Pirojpur"],
  "Chattogram": ["Bandarban","Brahmanbaria","Chandpur","Chattogram","Cumilla","Cox's Bazar","Feni","Khagrachhari","Lakshmipur","Noakhali","Rangamati"],
  "Dhaka": ["Dhaka","Faridpur","Gazipur","Gopalganj","Kishoreganj","Madaripur","Manikganj","Munshiganj","Narayanganj","Narsingdi","Rajbari","Shariatpur","Tangail"],
  "Khulna": ["Bagerhat","Chuadanga","Jashore","Jhenaidah","Khulna","Kushtia","Magura","Meherpur","Narail","Satkhira"],
  "Mymensingh": ["Jamalpur","Mymensingh","Netrokona","Sherpur"],
  "Rajshahi": ["Bogura","Chapainawabganj","Joypurhat","Naogaon","Natore","Pabna","Rajshahi","Sirajganj"],
  "Rangpur": ["Dinajpur","Gaibandha","Kurigram","Lalmonirhat","Nilphamari","Panchagarh","Rangpur","Thakurgaon"],
  "Sylhet": ["Habiganj","Moulvibazar","Sunamganj","Sylhet"]
};
const BD_DISTRICT_AREAS = {
  "Noakhali": ["Maijdee","Noakhali Sadar","Sonapur","Chowmuhani","Kabirhat","Companigonj","Chatkhil","Sonaimuri","Begumganj","Senbagh","Hatiya","Subarnachar"],
  "Chattogram": ["Agrabad","GEC","Panchlaish","Halishahar","Khulshi","Nasirabad","Muradpur","Chawkbazar","Patenga","Oxygen","EPZ","Anderkilla","Hathazari","Sitakunda","Pahartali","Bayezid"],
  "Feni": ["Feni Sadar","Mohipal","Daganbhuiyan","Parshuram","Chhagalnaiya","Sonagazi","Fulgazi"],
  "Cox's Bazar": ["Cox's Bazar Sadar","Kolatoli","Sugandha","Teknaf","Ukhia","Ramu","Chakaria","Maheshkhali"],
  "Dhaka": ["Dhanmondi","Uttara","Mirpur","Mohammadpur","Gulshan","Banani","Badda","Motijheel","Jatrabari","Pallabi"]
};

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
      else if (["partner", "partner-technician"].includes((d.user || d.admin)?.role))
        nav("/partner/dashboard");
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
        {register && <p className="account-switch">আপনি কি সার্ভিস পার্টনার? <Link to="/partner/register">Partner হিসেবে আবেদন করুন</Link></p>}
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
        {register && <p className="account-switch">আপনি কি সার্ভিস পার্টনার? <Link to="/partner/register">Partner হিসেবে আবেদন করুন</Link></p>}
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
  const [customerNotifications, setCustomerNotifications] = useState([]);
  const [paymentsData, setPaymentsData] = useState({ payments: [], bookings: [] });
  const [integrationStatus, setIntegrationStatus] = useState({ onlinePaymentAvailable: false, smsNotificationsEnabled: false });
  const [checkoutBusy, setCheckoutBusy] = useState("");
  const [earningsData, setEarningsData] = useState(null);
  const [feedbackForms, setFeedbackForms] = useState({});
  const [photoBusy, setPhotoBusy] = useState("");
  const [bookingDocument, setBookingDocument] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveNotifications, setLeaveNotifications] = useState([]);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveDocument, setLeaveDocument] = useState(null);
  const [leaveForm, setLeaveForm] = useState({ leaveType: "casual", startDate: "", endDate: "", reason: "" });
  const [workPreferencesOpen, setWorkPreferencesOpen] = useState(false);
  const [workPreferencesBusy, setWorkPreferencesBusy] = useState(false);
  const [workPreferences, setWorkPreferences] = useState({ skills: [], areas: [] });
  const [skillSearch, setSkillSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [areaDivision, setAreaDivision] = useState("");
  const [pendingArea, setPendingArea] = useState("");
  const [areaDistrict, setAreaDistrict] = useState("");
  const isTechnicianView = mode === "technician" || user?.role === "technician";
  const isStaffView = user?.role === "staff";
  const nextTechnicianStatus = { Assigned: "On the way", "On the way": "Inspection", Inspection: "In progress" };
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
    const paymentResult = new URLSearchParams(window.location.search).get("payment");
    const paymentMessages = { success: "bKash পেমেন্ট সফলভাবে যাচাই হয়েছে।", failed: "bKash পেমেন্ট সম্পন্ন হয়নি।", cancelled: "আপনি bKash পেমেন্ট বাতিল করেছেন।", review: "পেমেন্ট পাওয়া গেছে, তবে যাচাই/হিসাব মিলিয়ে দেখার জন্য Admin-এর পর্যালোচনা প্রয়োজন।", invalid: "পেমেন্ট Callback সঠিক নয়।", "not-found": "পেমেন্ট রেকর্ড পাওয়া যায়নি।", unavailable: "bKash পেমেন্ট বর্তমানে চালু নেই।" };
    if (paymentResult && paymentMessages[paymentResult]) {
      setNotice(paymentMessages[paymentResult]);
      const url = new URL(window.location.href); url.searchParams.delete("payment"); window.history.replaceState({}, "", url.toString());
    }
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
          const [pr, fr, ir, nr] = await Promise.all([
            fetch(`${API}/customer/payments`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/customer/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/integrations/status`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (pr.ok) setPaymentsData(await pr.json());
          if (ir.ok) setIntegrationStatus(await ir.json());
          if (nr.ok) { const nd = await nr.json(); setCustomerNotifications((nd.notifications || []).filter(n => ["partner-completion-otp", "completion-otp-fallback", "booking-manual-completion"].includes(n.type))); }
          if (fr.ok) { const fd = await fr.json(); setData(old => old ? { ...old, bookings: fd.bookings } : old); }
        }
        if (d.role === "technician") {
          const [er, lr] = await Promise.all([
            fetch(`${API}/technician/earnings`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/technician/leave-requests`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (er.ok) setEarningsData(await er.json());
          if (lr.ok) { const ld = await lr.json(); setLeaveRequests(ld.requests || []); }
          const nr = await fetch(`${API}/technician/leave-notifications`, { headers: { Authorization: `Bearer ${token}` } });
          if (nr.ok) { const nd = await nr.json(); setLeaveNotifications(nd.notifications || []); }
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
  async function startOnlinePayment(booking) {
    const token = sessionStorage.getItem("muUserToken");
    setError(""); setNotice(""); setCheckoutBusy(booking._id);
    try {
      const r = await fetch(`${API}/payments/checkout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ bookingId: booking._id }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "অনলাইন পেমেন্ট শুরু করা যায়নি");
      if (!d.checkoutUrl || !/^https:\/\//i.test(d.checkoutUrl)) throw new Error("Payment provider নিরাপদ checkout link দেয়নি।");
      window.location.assign(d.checkoutUrl);
    } catch (e) { setError(e.message); } finally { setCheckoutBusy(""); }
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
  async function uploadCustomerPhotos(bookingId, files) {
    if (!files?.length) return; const token=sessionStorage.getItem("muUserToken"); const body=new FormData(); Array.from(files).slice(0,5).forEach(f=>body.append("photos",f)); setPhotoBusy(bookingId); setError("");
    try { const r=await fetch(`${API}/customer/bookings/${bookingId}/photos`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body}); const d=await r.json(); if(!r.ok)throw new Error(d.message||"ছবি আপলোড হয়নি"); setNotice("বুকিংয়ের ছবি আপলোড হয়েছে।"); }
    catch(e){setError(e.message)}finally{setPhotoBusy("")}
  }
  async function submitCustomerClaim(bookingId, type) {
    const subject=window.prompt(type==="warranty-claims"?"Warranty সমস্যার শিরোনাম লিখুন":"অভিযোগের শিরোনাম লিখুন"); if(!subject)return; const description=window.prompt("সমস্যার বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)"); if(!description)return;
    try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/customer/bookings/${bookingId}/${type}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({subject,description})});const d=await r.json();if(!r.ok)throw new Error(d.message||"অনুরোধ জমা হয়নি");setNotice(d.message)}catch(e){setError(e.message)}
  }
  async function openBookingDocument(bookingId, kind) {
    try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/customer/bookings/${bookingId}/${kind}`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.message||"ডকুমেন্ট পাওয়া যায়নি");setBookingDocument({kind,data:d.invoice||d.receipts?.[0]||d,allReceipts:d.receipts||[]})}catch(e){setError(e.message)}
  }
  async function rescheduleCustomerBooking(b) {
    const preferredDate=window.prompt("নতুন তারিখ (YYYY-MM-DD)", b.preferredDate || new Date().toISOString().slice(0,10));if(!preferredDate)return;const preferredTime=window.prompt("নতুন সময়",b.preferredTime||"যেকোনো সময়");if(!preferredTime)return;try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/customer/bookings/${b._id}/reschedule`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({preferredDate,preferredTime})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Reschedule করা যায়নি");setNotice(d.message);const rr=await fetch(`${API}/dashboard/summary`,{headers:{Authorization:`Bearer ${token}`}});if(rr.ok)setData(await rr.json())}catch(e){setError(e.message)}
  }
  async function requestNewQuotation(b) {
    try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/operations/customer/bookings/${b._id}/request-quotation`,{method:"POST",headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.message||"অনুরোধ করা যায়নি");setNotice(d.message);const rr=await fetch(`${API}/dashboard/summary`,{headers:{Authorization:`Bearer ${token}`}});if(rr.ok)setData(await rr.json())}catch(e){setError(e.message)}
  }
  async function requestCompletionOtp(bookingId) {
    try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/technician/bookings/${bookingId}/completion-otp`,{method:"POST",headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.message||"OTP পাঠানো যায়নি");setNotice(d.message);const otp=window.prompt("Customer-এর কাছ থেকে ৬ সংখ্যার Completion OTP নিন");if(!otp)return;const cr=await fetch(`${API}/technician/bookings/${bookingId}/complete`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({otp})});const cd=await cr.json();if(!cr.ok)throw new Error(cd.message||"OTP যাচাই হয়নি");setNotice(cd.message);const rr=await fetch(`${API}/dashboard/summary`,{headers:{Authorization:`Bearer ${token}`}});if(rr.ok)setData(await rr.json())}catch(e){setError(e.message)}
  }
  async function technicianAttendance(action) { try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/technician/attendance`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({action})});const d=await r.json();if(!r.ok)throw new Error(d.message||"Attendance update failed");setNotice(d.message)}catch(e){setError(e.message)} }
  async function logout() {
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
        {user?.role === "customer" && customerNotifications.length > 0 && <section className="dashboard-card" style={{marginBottom:20}}><h2>কাজ সম্পন্নের OTP / Notifications</h2>{customerNotifications.map(n => <article key={n._id} style={{padding:"12px 0",borderBottom:"1px solid #e5e7eb"}}><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small></article>)}</section>}

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
            {isTechnicianView && <div className="admin-table-card" style={{marginBottom:18}}><div className="table-toolbar"><div><h2>উপস্থিতি ও ছুটি</h2><p>দৈনিক Check-in/Check-out এবং ছুটির আবেদন।</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="btn btn-primary btn-small" onClick={()=>technicianAttendance("check-in")}>Check-in</button><button className="btn btn-outline btn-small" onClick={()=>technicianAttendance("check-out")}>Check-out</button><button className="btn btn-outline btn-small" onClick={async()=>{setError("");try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/technician/profile/work-preferences`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.message||"তথ্য লোড হয়নি");setWorkPreferences({skills:d.skills||[],areas:d.areas||[]});setWorkPreferencesOpen(true)}catch(e){setError(e.message)}}}>দক্ষতা / এলাকা</button><button className="btn btn-outline btn-small" onClick={()=>setLeaveModalOpen(true)}><CalendarPlus size={15}/> ছুটির আবেদন</button></div></div></div>}
            {isTechnicianView && <section className="leave-history-card"><div className="leave-history-heading"><div><h3><ClipboardCheck size={18}/> Leave History</h3><p>আপনার পূর্বের আবেদন ও Admin-এর সিদ্ধান্ত</p></div><button className="btn btn-outline btn-small" onClick={async()=>{try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/technician/leave-requests`,{headers:{Authorization:`Bearer ${token}`}});const d=await r.json();if(!r.ok)throw new Error(d.message);setLeaveRequests(d.requests||[]);const nr=await fetch(`${API}/technician/leave-notifications`,{headers:{Authorization:`Bearer ${token}`}});if(nr.ok){const nd=await nr.json();setLeaveNotifications(nd.notifications||[]);}}catch(e){setError(e.message)}}}><RefreshCw size={14}/> Refresh</button></div>{leaveNotifications.length>0&&<div className="leave-notification-feed">{leaveNotifications.slice(0,4).map(n=><div key={n._id} className="leave-notification-item"><CheckCircle2 size={16}/><div><b>{n.title}</b><span>{n.message}</span><small>{n.createdAt?new Date(n.createdAt).toLocaleString("en-GB"):""}</small></div></div>)}</div>}<div className="leave-history-list">{leaveRequests.map(item=><article className="leave-history-item" key={item.requestId}><div className="leave-history-main"><b>{({casual:"Casual Leave",sick:"Sick Leave",emergency:"Emergency Leave",other:"Other Leave"})[item.leaveType]||"Leave Application"}</b><span>{item.startDate} → {item.endDate} · {item.durationDays||Math.round((new Date(item.endDate)-new Date(item.startDate))/86400000)+1} দিন</span><small>{item.reason}</small>{item.reviewNote&&<small className="leave-review-note">Admin মন্তব্য: {item.reviewNote}</small>}</div><span className={`leave-status leave-status-${item.status}`}>{({pending:"Pending",approved:"Approved",rejected:"Rejected"})[item.status]||item.status}</span></article>)}{!leaveRequests.length&&<div className="leave-empty">এখনো কোনো Leave Application জমা দেওয়া হয়নি।</div>}</div></section>}
            {isTechnicianView && leaveModalOpen && <div className="leave-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!leaveSubmitting)setLeaveModalOpen(false)}}><section className="leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-modal-title"><header className="leave-modal-header"><div><span className="leave-modal-icon"><CalendarPlus size={20}/></span><div><h2 id="leave-modal-title">Leave Application</h2><p>ছুটির জন্য Admin-এর কাছে আবেদন জমা দিন</p></div></div><button type="button" className="leave-modal-close" onClick={()=>setLeaveModalOpen(false)} aria-label="Close"><X size={20}/></button></header><form onSubmit={async e=>{e.preventDefault();setLeaveSubmitting(true);setError("");try{const token=sessionStorage.getItem("muUserToken");const body=new FormData();Object.entries(leaveForm).forEach(([k,v])=>body.append(k,v));if(leaveDocument)body.append("document",leaveDocument);const r=await fetch(`${API}/technician/leave-requests`,{method:"POST",headers:{Authorization:`Bearer ${token}`},body});const d=await r.json();if(!r.ok)throw new Error(d.message||"আবেদন জমা হয়নি");setLeaveRequests(old=>[d.request,...old]);setLeaveForm({leaveType:"casual",startDate:"",endDate:"",reason:""});setLeaveDocument(null);setLeaveModalOpen(false);setNotice(d.message||"ছুটির আবেদন জমা হয়েছে");}catch(e){setError(e.message)}finally{setLeaveSubmitting(false)}}} className="leave-modal-form"><label>Leave Type<select required value={leaveForm.leaveType} onChange={e=>setLeaveForm(v=>({...v,leaveType:e.target.value}))}><option value="casual">Casual Leave</option><option value="sick">Sick Leave</option><option value="emergency">Emergency Leave</option><option value="other">Other</option></select></label><div className="leave-date-grid"><label>Start Date<input type="date" required value={leaveForm.startDate} onChange={e=>setLeaveForm(v=>({...v,startDate:e.target.value,endDate:v.endDate&&v.endDate<e.target.value?"":v.endDate}))}/></label><label>End Date<input type="date" required min={leaveForm.startDate||undefined} value={leaveForm.endDate} onChange={e=>setLeaveForm(v=>({...v,endDate:e.target.value}))}/></label></div><div className="leave-duration"><CalendarDays size={17}/><span>Leave Duration</span><b>{leaveForm.startDate&&leaveForm.endDate&&leaveForm.endDate>=leaveForm.startDate?Math.round((new Date(`${leaveForm.endDate}T00:00:00`)-new Date(`${leaveForm.startDate}T00:00:00`))/86400000)+1:0} দিন</b></div><label>Reason for Leave<textarea required minLength={5} maxLength={1000} rows={4} placeholder="ছুটির কারণ বিস্তারিত লিখুন..." value={leaveForm.reason} onChange={e=>setLeaveForm(v=>({...v,reason:e.target.value}))}/></label><label className="leave-upload-label">Supporting Document <small>(Optional · PDF, JPG, PNG, WEBP · সর্বোচ্চ 5MB)</small><span className="leave-upload-box"><FileUp size={21}/><b>{leaveDocument?.name||"ডকুমেন্ট নির্বাচন করুন"}</b><small>Medical certificate বা প্রয়োজনীয় প্রমাণপত্র</small><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={e=>{const f=e.target.files?.[0];if(f&&(f.size>5*1024*1024||![/^application\/pdf$/,/^image\/(jpeg|png|webp)$/].some(rx=>rx.test(f.type)))){setError("শুধু PDF, JPG, PNG বা WEBP ফাইল (সর্বোচ্চ 5MB) আপলোড করা যাবে।");e.target.value="";return;}setLeaveDocument(f||null)}}/></span></label>{leaveDocument&&<button type="button" className="leave-remove-file" onClick={()=>setLeaveDocument(null)}><XCircle size={14}/> ফাইল সরান</button>}<footer className="leave-modal-actions"><button type="button" className="btn btn-outline" disabled={leaveSubmitting} onClick={()=>setLeaveModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={leaveSubmitting||!leaveForm.startDate||!leaveForm.endDate||leaveForm.endDate<leaveForm.startDate||leaveForm.reason.trim().length<5}>{leaveSubmitting?"Submitting...":"Submit Application"}</button></footer></form></section></div>}
            {isTechnicianView && workPreferencesOpen && <div className="leave-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!workPreferencesBusy)setWorkPreferencesOpen(false)}}><section className="leave-modal work-preferences-modal" role="dialog" aria-modal="true" aria-labelledby="work-preferences-title"><header className="leave-modal-header"><div><span className="leave-modal-icon"><Wrench size={20}/></span><div><h2 id="work-preferences-title">Technician Work Preferences</h2><p>আপনি কোন ধরনের কাজ ও কোন এলাকায় সার্ভিস দিতে পারবেন তা নির্বাচন করুন</p></div></div><button type="button" className="leave-modal-close" onClick={()=>setWorkPreferencesOpen(false)} aria-label="Close"><X size={20}/></button></header><form className="leave-modal-form" onSubmit={async e=>{e.preventDefault();setWorkPreferencesBusy(true);setError("");try{const token=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/technician/profile/work-preferences`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(workPreferences)});const d=await r.json();if(!r.ok)throw new Error(d.message||"তথ্য সংরক্ষণ হয়নি");setWorkPreferences({skills:d.skills||[],areas:d.areas||[]});setWorkPreferencesOpen(false);setNotice(d.message||"Skills ও Service Areas আপডেট হয়েছে।")}catch(e){setError(e.message)}finally{setWorkPreferencesBusy(false)}}}>
<label className="wp-section-label"><span><Wrench size={16}/> Professional Skills</span><small>আপনি যেসব কাজ করতে দক্ষ, সেগুলো নির্বাচন করুন।</small></label><div className="wp-picker"><div className="wp-chips">{workPreferences.skills.map(v=><button type="button" key={v} className="wp-chip wp-skill-chip" onClick={()=>setWorkPreferences(x=>({...x,skills:x.skills.filter(i=>i!==v)}))}>{v} <X size={12}/></button>)}</div><input aria-label="Search skills" placeholder="দক্ষতা খুঁজুন..." value={skillSearch} onChange={e=>setSkillSearch(e.target.value)}/><div className="wp-options">{[...new Set(fallbackServices.flatMap(x=>[x.name,...(x.items||[])]))].filter(x=>x.toLowerCase().includes(skillSearch.toLowerCase())&&!workPreferences.skills.includes(x)).slice(0,12).map(v=><button type="button" key={v} onClick={()=>setWorkPreferences(x=>({...x,skills:[...x.skills,v].slice(0,50)}))}>{v}</button>)}</div><div className="wp-custom"><input value={customSkill} onChange={e=>setCustomSkill(e.target.value)} placeholder="নতুন Skill যোগ করুন"/><button type="button" className="btn btn-outline btn-small" onClick={()=>{const v=customSkill.trim();if(v&&!workPreferences.skills.includes(v))setWorkPreferences(x=>({...x,skills:[...x.skills,v].slice(0,50)}));setCustomSkill("")}}>+ Add</button></div></div>
<div className="wp-divider"/><label className="wp-section-label"><span><MapPin size={16}/> Service Areas</span><small>প্রথমে বিভাগ, তারপর জেলা এবং শেষে আপনার কাজের এলাকা নির্বাচন করুন।</small></label><div className="wp-picker"><div className="wp-chips">{workPreferences.areas.map(v=><button type="button" key={v} className="wp-chip wp-area-chip" onClick={()=>setWorkPreferences(x=>({...x,areas:x.areas.filter(i=>i!==v)}))}>{v} <X size={12}/></button>)}</div><div className="wp-area-selects"><select aria-label="Select division" value={areaDivision} onChange={e=>{setAreaDivision(e.target.value);setAreaDistrict("");setAreaSearch("");setPendingArea("");}}><option value="">বিভাগ নির্বাচন করুন</option>{Object.keys(BD_DIVISION_DISTRICTS).map(v=><option key={v} value={v}>{v}</option>)}</select><select aria-label="Select district" value={areaDistrict} disabled={!areaDivision} onChange={e=>{setAreaDistrict(e.target.value);setAreaSearch("");setPendingArea("");}}><option value="">জেলা নির্বাচন করুন</option>{(BD_DIVISION_DISTRICTS[areaDivision]||[]).map(v=><option key={v} value={v}>{v}</option>)}</select></div><input aria-label="Search service areas" placeholder={areaDistrict?"এলাকা খুঁজুন...":"জেলা নির্বাচন করার পর এলাকা খুঁজুন"} value={areaSearch} disabled={!areaDistrict} onChange={e=>{setAreaSearch(e.target.value);setPendingArea("");}}/><div className="wp-options">{(BD_DISTRICT_AREAS[areaDistrict]||[]).filter(v=>v.toLowerCase().includes(areaSearch.toLowerCase())&&!workPreferences.areas.includes(`${v}, ${areaDistrict}, ${areaDivision}`)).slice(0,20).map(v=><button type="button" key={v} className={pendingArea===v?"is-selected":""} onClick={()=>setPendingArea(v)}>{v}</button>)}{areaDistrict&&!(BD_DISTRICT_AREAS[areaDistrict]||[]).length&&<small>এই জেলার জন্য তালিকাভুক্ত এলাকা নেই। নিচে নতুন এলাকা যোগ করুন।</small>}{areaDistrict&&(BD_DISTRICT_AREAS[areaDistrict]||[]).filter(v=>v.toLowerCase().includes(areaSearch.toLowerCase())).length===0&&areaSearch.trim()&&<small>কোনো মিল পাওয়া যায়নি। নতুন এলাকা যোগ করতে নিচের ঘর ব্যবহার করুন।</small>}</div><div className="wp-custom"><input value={customArea} disabled={!areaDistrict} onChange={e=>setCustomArea(e.target.value)} placeholder={areaDistrict?"নতুন এলাকার নাম লিখুন":"আগে বিভাগ ও জেলা নির্বাচন করুন"}/><button type="button" className="btn btn-outline btn-small" disabled={!areaDistrict||(!pendingArea&&!customArea.trim())} onClick={()=>{const v=(pendingArea||customArea).trim();const full=`${v}, ${areaDistrict}, ${areaDivision}`;if(v&&!workPreferences.areas.includes(full))setWorkPreferences(x=>({...x,areas:[...x.areas,full].slice(0,30)}));setCustomArea("");setPendingArea("");setAreaSearch("");}}>+ Add</button></div></div><div className="wp-important"><b><CheckCircle2 size={15}/> Important</b><p>আপনার Skills ও Service Areas অনুযায়ী Admin আপনাকে উপযুক্ত কাজ Assign করতে পারবেন। পরিবর্তনটি Admin-কে Notification হিসেবে জানানো হবে।</p></div><footer className="leave-modal-actions"><button type="button" className="btn btn-outline" disabled={workPreferencesBusy} onClick={()=>setWorkPreferencesOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={workPreferencesBusy}>{workPreferencesBusy?"Saving...":"Save Preferences"}</button></footer></form></section></div>}
            {isTechnicianView && earningsData && <div className="dashboard-stats" style={{marginTop:16}}><div className="stat-card"><span>সম্পন্ন কাজ</span><b>{earningsData.completedJobs}</b><ClipboardList /></div><div className="stat-card"><span>কমিশন হার</span><b>{earningsData.commissionRate}%</b><Wallet /></div><div className="stat-card"><span>মোট কমিশন</span><b>৳{Number(earningsData.totalEarnings||0).toLocaleString()}</b><Wallet /></div></div>}
            {user?.role === "customer" && <div className="admin-table-card" style={{marginBottom:18}}><div className="table-toolbar"><div><h2>আমার পেমেন্ট</h2><p>আপনার বুকিংয়ের পেমেন্ট ও বকেয়া দেখুন। {integrationStatus.onlinePaymentAvailable ? "অনলাইন পেমেন্ট চালু আছে।" : "অনলাইন পেমেন্ট বর্তমানে কনফিগার করা নেই।"}</p></div></div><div className="table-scroll"><table className="bookings-table"><thead><tr><th>টিকিট</th><th>সার্ভিস</th><th>পরিশোধ</th><th>মোট বিল</th><th>স্ট্যাটাস</th></tr></thead><tbody>{(paymentsData.bookings||[]).map(p=><tr key={String(p._id)}><td>{p.ticketId}</td><td>{p.serviceName}</td><td>৳{Number(p.paidAmount||0).toLocaleString()}</td><td>৳{Number(p.expectedAmount||0).toLocaleString()}</td><td>{p.paymentStatus}</td></tr>)}{!paymentsData.bookings?.length&&<tr><td colSpan="5">এখনো কোনো পেমেন্ট রেকর্ড নেই। অনলাইন পেমেন্ট সক্রিয় না থাকলে Admin-এর সঙ্গে যোগাযোগ করুন।</td></tr>}</tbody></table></div></div>}
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
                          <td>{b.status}{user?.role === "customer" && b.partnerVerification && <div className="customer-partner-verification"><b>{b.partnerVerification.businessName}</b><span className={b.partnerVerification.status === "ACTIVE" ? "verified" : "not-verified"}>{b.partnerVerification.status === "ACTIVE" ? "✓ Verified Partner" : "Partner status: " + b.partnerVerification.status}</span>{b.partnerVerification.verificationUrl && <a href={b.partnerVerification.verificationUrl} target="_blank" rel="noreferrer">পরিচয় যাচাই করুন</a>}</div>}</td>
                          {data.canAssign && <td className="account-assignment-cell">
                            <div className="account-assignment-controls">
                            <select className="technician-multi-select" multiple value={selectedTechnicians[b._id] || b.technicianIds || (b.technicianId ? [b.technicianId] : [])} onChange={(e) => setSelectedTechnicians((old) => ({ ...old, [b._id]: Array.from(e.target.selectedOptions, (o) => o.value) }))} aria-label="Technician নির্বাচন করুন" style={{ minHeight: 76 }}>
                              {technicians.map((t) => <option key={t._id} value={t._id}>{t.name} {t.phone ? `(${t.phone})` : ""}</option>)}
                            </select>
                            <button className="btn btn-primary assign-technicians-button" disabled={assigning === b._id} onClick={() => saveTechnicianAssignment(b._id)}>{assigning === b._id ? "Saving..." : "Assign"}</button>
                            </div>
                          </td>}
                          {isTechnicianView && <td><div style={{display:"grid",gap:6,minWidth:130}}><span>{b.status}</span>{!b.myTechnicianDecision?.decision && !b.technicianDecisions?.[user?._id || user?.id || user?.userId]?.decision && <><button className="btn btn-primary btn-small" disabled={assigning === b._id} onClick={() => decideAssignment(b._id,"accepted")}>কাজ গ্রহণ</button><button className="btn btn-outline btn-small" disabled={assigning === b._id} onClick={() => decideAssignment(b._id,"rejected")}>প্রত্যাখ্যান</button></>}{nextTechnicianStatus[b.status] && <button className="btn btn-primary btn-small" disabled={assigning === b._id} onClick={() => updateJobStatus(b._id, nextTechnicianStatus[b.status])}>{assigning === b._id ? "Saving…" : nextTechnicianStatus[b.status]}</button>}{b.status === "In progress" && <button className="btn btn-primary btn-small" disabled={assigning === b._id} onClick={() => requestCompletionOtp(b._id)}>Completion OTP দিয়ে শেষ করুন</button>}</div></td>}
                          {(isTechnicianView || isStaffView || user?.role === "customer") && (user?.role === "customer" ? <td className="customer-history-actions-cell"><details className="customer-history-actions"><summary><span>সার্ভিস অ্যাকশন</span><span className="customer-actions-count">বিস্তারিত দেখুন⌄</span></summary><div className="customer-history-actions-panel">
                            <div className="customer-action-buttons">
                              { ["New","Contacted"].includes(b.status) && <><button className="btn btn-outline btn-small" onClick={()=>customerCancel(b)}>বুকিং বাতিল</button><button className="btn btn-outline btn-small" onClick={()=>rescheduleCustomerBooking(b)}>তারিখ/সময় পরিবর্তন</button></> }
                              {b.status === "Quotation rejected" && <button className="btn btn-primary btn-small" onClick={()=>requestNewQuotation(b)}>নতুন Quotation চাই</button>}
                              <label className="btn btn-outline btn-small customer-file-action" style={{cursor:"pointer"}}>বুকিংয়ের ছবি/ডকুমেন্ট<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden onChange={e=>uploadCustomerPhotos(b._id,e.target.files)} disabled={photoBusy===b._id}/></label>
                              <button className="btn btn-outline btn-small" onClick={()=>openBookingDocument(b._id,"invoice")}>ইনভয়েস দেখুন</button>
                              <button className="btn btn-outline btn-small" onClick={()=>openBookingDocument(b._id,"receipt")}>রসিদ দেখুন</button>
                              <button className="btn btn-outline btn-small" onClick={()=>submitCustomerClaim(b._id,"complaints")}>অভিযোগ জমা</button>
                              {b.status === "Completed" && <button className="btn btn-outline btn-small" onClick={()=>submitCustomerClaim(b._id,"warranty-claims")}>Warranty Claim</button>}
                              {integrationStatus.onlinePaymentAvailable && ["Quotation sent","Approved","In progress","Completed"].includes(b.status) && (() => { const bill = (paymentsData.bookings || []).find(p => String(p._id) === String(b._id)); const due = Number(bill?.expectedAmount || 0) - Number(bill?.paidAmount || 0); return due > 0 ? <button className="btn btn-primary btn-small" disabled={checkoutBusy === b._id} onClick={() => startOnlinePayment(b)}>{checkoutBusy === b._id ? "Checkout তৈরি হচ্ছে…" : `অনলাইনে পেমেন্ট · ৳${due.toLocaleString("en-BD")}`}</button> : null; })()}
                            </div>
                            {b.status === "Completed" && !feedbackForms[b._id]?.submitted && <div className="customer-feedback-panel"><h4>আপনার অভিজ্ঞতা কেমন ছিল?</h4><label>রেটিং <select value={feedbackForms[b._id]?.rating || 5} onChange={e=>setFeedbackForms(old=>({...old,[b._id]:{...(old[b._id]||{}),rating:e.target.value}}))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} ★</option>)}</select></label><textarea placeholder="আপনার মতামত লিখুন" value={feedbackForms[b._id]?.comment || ""} onChange={e=>setFeedbackForms(old=>({...old,[b._id]:{...(old[b._id]||{}),comment:e.target.value}}))}/><button className="btn btn-primary btn-small" onClick={()=>submitFeedback(b._id)}>Feedback জমা দিন</button></div>}
                          </div></details></td> : <td><div style={{display:"grid",gap:8,minWidth:160}}>
                            {isTechnicianView && <label className="btn btn-outline btn-small" style={{cursor:"pointer"}}>কাজের ছবি আপলোড<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e=>uploadWorkPhotos(b._id,e.target.files)} disabled={photoBusy===b._id}/></label>}
                            {isStaffView && <div style={{display:"flex",gap:6}}><select aria-label="Booking status" defaultValue={b.status} onChange={e=>setSelectedTechnicians(old=>({...old,[`status-${b._id}`]:e.target.value}))}><option>New</option><option>Contacted</option><option>Assigned</option><option>On the way</option><option>Inspection</option><option>Quotation sent</option><option>Quotation rejected</option><option>Approved</option><option>In progress</option><option>Completed</option><option>Cancelled</option></select><button className="btn btn-primary btn-small" onClick={async()=>{try{const t=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/bookings/${b._id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({status:selectedTechnicians[`status-${b._id}`]||b.status})});const d=await r.json();if(!r.ok)throw new Error(d.message);setNotice("Booking status আপডেট হয়েছে।");const rr=await fetch(`${API}/dashboard/summary`,{headers:{Authorization:`Bearer ${t}`}});if(rr.ok)setData(await rr.json())}catch(e){setError(e.message)}}}>Save</button></div>}
                          </div></td>)}
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
        {user?.role === "customer" && <div className="customer-privacy-wrap"><section className="dashboard-card privacy-panel"><h2>ডেটা ও অ্যাকাউন্টের গোপনীয়তা</h2><p>আপনার ডেটার কপি বা অ্যাকাউন্ট মুছে ফেলার অনুরোধ Admin-এর কাছে জমা দিতে পারেন। অনুরোধ যাচাই না হওয়া পর্যন্ত অ্যাকাউন্ট স্বাভাবিক থাকবে।</p><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="btn btn-outline btn-small" onClick={async()=>{try{const t=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/customer/privacy-requests`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({type:"data_export",reason:"Customer requested a copy of personal data."})});const d=await r.json();if(!r.ok)throw new Error(d.message);setNotice(d.message)}catch(e){setError(e.message)}}}>আমার ডেটার কপি চাই</button><button className="btn btn-outline btn-small" onClick={async()=>{if(!window.confirm("আপনি কি অ্যাকাউন্ট মুছে ফেলার অনুরোধ জমা দিতে চান? Admin যাচাই না করা পর্যন্ত অ্যাকাউন্ট মুছে যাবে না।"))return;try{const t=sessionStorage.getItem("muUserToken");const r=await fetch(`${API}/customer/privacy-requests`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({type:"account_deletion",reason:"Customer requested account deletion."})});const d=await r.json();if(!r.ok)throw new Error(d.message);setNotice(d.message)}catch(e){setError(e.message)}}}>অ্যাকাউন্ট মুছে ফেলার অনুরোধ</button></div></section></div>}
      </div>

      {bookingDocument && <div role="dialog" aria-modal="true" aria-label="Invoice or receipt" style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(15,23,42,.6)",display:"grid",placeItems:"center",padding:16}}><div style={{background:"white",color:"#0f172a",borderRadius:16,padding:24,maxWidth:720,width:"100%",maxHeight:"85vh",overflow:"auto"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><h2>{bookingDocument.kind === "invoice" ? "Invoice" : "Payment Receipt"}</h2><button className="btn btn-outline btn-small" onClick={()=>setBookingDocument(null)}>বন্ধ করুন</button></div>{bookingDocument.kind === "invoice" ? <><p><b>Invoice:</b> {bookingDocument.data.invoiceNo}</p><p><b>Ticket:</b> {bookingDocument.data.ticketId}</p><p><b>Customer:</b> {bookingDocument.data.customer}</p><p><b>Service:</b> {bookingDocument.data.serviceName}</p><hr/><p>মোট বিল: ৳{Number(bookingDocument.data.total||0).toLocaleString("en-BD")}</p><p>পরিশোধ: ৳{Number(bookingDocument.data.paid||0).toLocaleString("en-BD")}</p><p>বকেয়া: ৳{Number(bookingDocument.data.due||0).toLocaleString("en-BD")}</p></> : <>{bookingDocument.allReceipts.map((r,i)=><div key={r.receiptNo||i} style={{borderBottom:"1px solid #e2e8f0",padding:"12px 0"}}><b>{r.receiptNo}</b><p>{r.ticketId} · {r.serviceName}</p><p>৳{Number(r.amount||0).toLocaleString("en-BD")} · {r.method} · {r.status}</p><small>{r.paidAt ? new Date(r.paidAt).toLocaleString("bn-BD") : ""}</small></div>)}{!bookingDocument.allReceipts.length&&<p>এখনো কোনো রসিদ নেই।</p>}</>}<button className="btn btn-primary" style={{marginTop:16}} onClick={()=>window.print()}>Print / Save PDF</button></div></div>}
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
