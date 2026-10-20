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
  LayoutDashboard,
} from "lucide-react";
import CMSPage, { PublicCMSPage } from "../pages-CMS.jsx";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
import { fallbackServices, fallbackPackages, money } from "../models/catalog.js";
import { useSiteContent } from "../hooks/useSiteContent.js";


export function Header() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("muUser") ||
          sessionStorage.getItem("muAdmin") ||
          "null",
      );
    } catch {
      return null;
    }
  });
  const location = useLocation();
  useEffect(() => {
    try {
      setAccount(
        JSON.parse(
          sessionStorage.getItem("muUser") ||
            sessionStorage.getItem("muAdmin") ||
            "null",
        ),
      );
    } catch {
      setAccount(null);
    }
  }, [location.pathname, location.search]);
  useEffect(() => {
    const sync = () => {
      try {
        setAccount(
          JSON.parse(
            sessionStorage.getItem("muUser") ||
              sessionStorage.getItem("muAdmin") ||
              "null",
          ),
        );
      } catch {
        setAccount(null);
      }
    };
    window.addEventListener("storage", sync);
    window.addEventListener("mu-account-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mu-account-changed", sync);
    };
  }, []);
  const loggedIn = !!(
    account &&
    (sessionStorage.getItem("muUserToken") ||
      sessionStorage.getItem("muAdminToken"))
  );
  const photoUrl = account?.profilePhoto
    ? `${API}${account.profilePhoto.startsWith("/api/") ? account.profilePhoto.replace(/^\/api/, "") : account.profilePhoto.startsWith("/") ? account.profilePhoto : `/${account.profilePhoto}`}${account.profilePhoto.includes("?") ? "&" : "?"}v=${encodeURIComponent(account.updatedAt || account.profilePhoto)}`
    : "";
  function logout() {
    const isAdmin = account?.role === "admin";
    sessionStorage.removeItem(isAdmin ? "muAdminToken" : "muUserToken");
    sessionStorage.removeItem(isAdmin ? "muAdmin" : "muUser");
    setAccount(null);
    setOpen(false);
    window.dispatchEvent(new Event("mu-account-changed"));
    window.location.assign("/");
  }
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <Home size={22} />
            <span className="brand-dot" />
          </span>
          <span>
            <strong>
              MU <b>HOME SERVICE</b>
            </strong>
            <small>HOME • OFFICE • TECH CARE</small>
          </span>
        </Link>
        <button
          className="mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "nav-links open" : "nav-links"}>
          <NavLink to="/" onClick={() => setOpen(false)}>
            হোম
          </NavLink>
          <a href="/#services" onClick={() => setOpen(false)}>
            সার্ভিসসমূহ
          </a>
          <a href="/#packages" onClick={() => setOpen(false)}>
            প্যাকেজ
          </a>
          <a href="/#process" onClick={() => setOpen(false)}>
            কীভাবে কাজ করে
          </a>
          <a href="/#contact" onClick={() => setOpen(false)}>
            যোগাযোগ
          </a>
          <Link
            to="/track"
            className="nav-account"
            onClick={() => setOpen(false)}
          >
            টিকিট ট্র্যাক
          </Link>
          {!loggedIn ? (
            <>
              <Link
                to="/login"
                className="nav-account"
                onClick={() => setOpen(false)}
              >
                লগইন
              </Link>
              <Link
                to="/register"
                className="nav-account"
                onClick={() => setOpen(false)}
              >
                রেজিস্টার
              </Link>
            </>
          ) : (
            <div className="nav-profile-menu">
              <button
                className="nav-profile-trigger"
                aria-label="প্রোফাইল মেনু"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="প্রোফাইল" />
                ) : (
                  <UserRound size={23} />
                )}
              </button>
              <div className="nav-profile-dropdown">
                <div className="nav-profile-name">
                  {account?.name || "আমার অ্যাকাউন্ট"}
                </div>
                <Link
                  to={
                    account?.role === "admin"
                      ? "/admin"
                      : account?.role === "technician"
                        ? "/technician/dashboard"
                        : "/dashboard"
                  }
                  onClick={() => setOpen(false)}
                >
                  <LayoutDashboard size={16} /> ড্যাশবোর্ড
                </Link>
                <Link
                  to={
                    account?.role === "admin"
                      ? "/profile?account=admin"
                      : "/profile"
                  }
                  onClick={() => setOpen(false)}
                >
                  <UserRound size={16} /> প্রোফাইল আপডেট
                </Link>
                <button type="button" onClick={logout}>
                  <LogOut size={16} /> লগ আউট
                </button>
              </div>
            </div>
          )}
          <Link
            to="/book"
            className="btn btn-primary nav-cta"
            onClick={() => setOpen(false)}
          >
            সার্ভিস বুক করুন <ArrowUpRight size={16} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function WhatsAppFloat() {
  return (
    <a
      className="whatsapp-float"
      href="https://wa.me/8801683988686?text=Assalamu%20Alaikum%2C%20MU%20Home%20Service%20er%20service%20nitte%20chai"
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
    >
      <MessageCircle size={23} />
    </a>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link to="/" className="brand footer-brand">
            <span className="brand-mark">
              <Home size={22} />
            </span>
            <span>
              <strong>
                MU <b>HOME SERVICE</b>
              </strong>
              <small>HOME • OFFICE • TECH CARE</small>
            </span>
          </Link>
          <p>
            বাসা ও অফিসের প্রয়োজনীয় টেকনিক্যাল সার্ভিস—একটি নির্ভরযোগ্য জায়গা
            থেকে।
          </p>
          <div className="footer-location">
            <MapPin size={16} /> মাইজদী, নোয়াখালী, বাংলাদেশ
          </div>
        </div>
        <div>
          <h4>সার্ভিস</h4>
          <a href="/#services">Electrical & CCTV</a>
          <a href="/#services">Computer & Networking</a>
          <a href="/#services">AC & Plumbing</a>
          <a href="/#services">Home Maintenance</a>
        </div>
        <div>
          <h4>দ্রুত লিংক</h4>
          <Link to="/book">সার্ভিস বুক করুন</Link>
          <a href="/#packages">সার্ভিস প্যাকেজ</a>
          <a href="/#contact">যোগাযোগ</a>
          <Link to="/admin">Admin Login</Link>
        </div>
        <div>
          <h4>যোগাযোগ</h4>
          <a href="tel:+8801683988686">
            <Phone size={15} /> 01683-988686
          </a>
          <a
            href="https://wa.me/8801683988686"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
          <p className="footer-note">
            সার্ভিসের চূড়ান্ত মূল্য কাজের পরিধি ও যন্ত্রাংশ অনুযায়ী নির্ধারিত
            হবে।
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} MU Home Service. All rights reserved.
        </span>
        <span>Powered by MU Computer Tech</span>
      </div>
    </footer>
  );
}

export function ServiceCard({ service, onBook }) {
  return (
    <article className="service-card">
      {service.image && (
        <img
          className="service-card-image"
          src={service.image}
          alt={service.name}
        />
      )}
      <div className="service-card-top">
        <span className="service-icon">{service.icon}</span>
        <span className="starting">
          শুরু <b>{money(service.price)}</b>
        </span>
      </div>
      <h3>{service.name}</h3>
      <p>{service.subtitle}</p>
      <ul>
        {(service.items || []).slice(0, 3).map((x) => (
          <li key={x}>
            <Check size={15} />
            {x}
          </li>
        ))}
      </ul>
      <button className="text-link" onClick={() => onBook(service.id)}>
        সার্ভিস বুক করুন <ArrowRight size={16} />
      </button>
    </article>
  );
}

export function PackageCard({ item, onBook }) {
  return (
    <article
      className={`package-card ${item.featured ? "package-featured" : ""}`}
    >
      {item.image && (
        <img className="package-card-image" src={item.image} alt={item.name} />
      )}
      {item.featured && (
        <span className="popular-pill">
          <Sparkles size={13} /> MOST POPULAR
        </span>
      )}
      <div className="package-head">
        <span>{item.label}</span>
        <h3>{item.name}</h3>
      </div>
      <div className="package-price">
        {money(item.price)}
        <small> / {item.period}</small>
      </div>
      <p className="package-visits">
        <CalendarDays size={16} />
        {item.visits}
      </p>
      <div className="package-divider" />
      <ul>
        {item.features.map((f) => (
          <li key={f}>
            <CheckCircle2 size={17} />
            {f}
          </li>
        ))}
      </ul>
      <p className="package-note">{item.note}</p>
      <button
        className={
          item.featured
            ? "btn btn-primary btn-full"
            : "btn btn-outline btn-full"
        }
        onClick={() => onBook(item.id)}
      >
        প্যাকেজ নিন <ArrowRight size={16} />
      </button>
    </article>
  );
}
