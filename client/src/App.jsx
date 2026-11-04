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
import CMSPage, { PublicCMSPage } from "./pages-CMS.jsx";
import OperationsWorkspace from "./components/operations-workspace.jsx";
import CustomerQuotations from "./components/customer-quotations.jsx";
import BusinessControl from "./components/business-control.jsx";
import { PartnerWorkspace, PartnerRegistration, PartnerTechnicianWorkspace } from "./components/partner-workspace.jsx";
import PartnerVerification from "./components/partner-verification.jsx";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
import { fallbackServices, fallbackPackages, money } from "./models/catalog.js";
import { useSiteContent } from "./hooks/useSiteContent.js";
import { useGeneralSettings } from "./hooks/useGeneralSettings.js";

import "./styles.css";
import {
  Header,
  WhatsAppFloat,
  Footer,
  ServiceCard,
  PackageCard,
  BookingForm,
  HomePage,
  BookPage,
  AdminPage,
  AccountPage,
  PasswordRecoveryPage,
  UserDashboard,
  ProfilePage,
  ContentManagerPage,
  TicketTrackingPage,
  AdminOperationsPage,
  RolePermissionsPage
} from "./components/index.js";

function RoutedApp() {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/admin") || location.pathname.startsWith("/partner");
  const general = useGeneralSettings(API);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showPreloader, setShowPreloader] = useState(false);
  useEffect(() => { if (!general.appearance?.preloader || isAdminArea) { setShowPreloader(false); return; } setShowPreloader(true); const timer = window.setTimeout(() => setShowPreloader(false), 700); return () => window.clearTimeout(timer); }, [general.appearance?.preloader, isAdminArea, location.pathname]);
  useEffect(() => { const onScroll = () => setShowBackToTop(window.scrollY > 350); window.addEventListener("scroll", onScroll, { passive: true }); onScroll(); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => {
    if (isAdminArea) return;
    const identity = general.identity || {};
    const seo = general.seo || {};
    const appearance = general.appearance || {};
    document.title = seo.metaTitle || identity.siteName || "MU Home Service";
    let description = document.querySelector('meta[name="description"]');
    if (!description) { description = document.createElement("meta"); description.name = "description"; document.head.appendChild(description); }
    if (seo.metaDescription) description.content = seo.metaDescription;
    const setMeta = (property, content) => { if (!content) return; let tag = document.querySelector(`meta[property="${property}"]`); if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", property); document.head.appendChild(tag); } tag.content = content; };
    setMeta("og:title", seo.metaTitle || identity.siteName); setMeta("og:description", seo.metaDescription); setMeta("og:image", seo.ogImage); setMeta("og:url", identity.siteUrl);
    const setNameMeta = (name, content) => { if (!content) return; let tag = document.querySelector(`meta[name="${name}"]`); if (!tag) { tag = document.createElement("meta"); tag.name = name; document.head.appendChild(tag); } tag.content = content; };
    setNameMeta("twitter:card", "summary_large_image"); setNameMeta("twitter:title", seo.metaTitle || identity.siteName); setNameMeta("twitter:description", seo.metaDescription); setNameMeta("twitter:image", seo.ogImage);
    if (identity.faviconUrl) {
      let icon = document.querySelector('link[rel="icon"]');
      if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
      icon.href = identity.faviconUrl;
    }
    if (identity.accent) document.documentElement.style.setProperty("--site-accent", identity.accent);
  }, [general, isAdminArea]);
  useEffect(() => {
    let active = true;
    if (isAdminArea) {
      document.documentElement.removeAttribute("data-public-theme");
      document.documentElement.removeAttribute("data-public-color-theme");
      return () => { active = false; };
    }
    fetch(`${API}/site-theme`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Theme unavailable")))
      .then((data) => {
        if (active) {
          const valid = ["classic", "ocean", "emerald", "sunset"];
          document.documentElement.dataset.publicTheme = valid.includes(data.activeDesignTheme || data.activeTheme) ? (data.activeDesignTheme || data.activeTheme) : "classic";
          document.documentElement.dataset.publicColorTheme = ["classic","ocean","emerald","sunset"].includes(data.activeColorTheme) ? data.activeColorTheme : "classic";
        }
      })
      .catch(() => {
        if (active) { document.documentElement.dataset.publicTheme = "classic"; document.documentElement.dataset.publicColorTheme = "classic"; }
      });
    return () => { active = false; };
  }, [isAdminArea, location.pathname]);
  const { services, packages } = useSiteContent(
    API,
    fallbackServices,
    fallbackPackages,
  );
  return (
    <>
      {showPreloader && !isAdminArea ? <div className="public-preloader" role="status" aria-label="Loading"><span /></div> : null}
      {!isAdminArea && general.appearance?.maintenanceMode ? <main className="maintenance-screen"><div><h1>{general.identity?.siteName || "Website"}</h1><p>{general.appearance?.maintenanceMessage || "We are performing scheduled maintenance. Please check back soon."}</p></div></main> : <>
      <>{!isAdminArea && <Header />}</>
      <Routes>
        <Route
          path="/"
          element={<HomePage services={services} packages={packages} />}
        />
        <Route
          path="/book"
          element={<BookPage services={services} packages={packages} />}
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/content" element={<ContentManagerPage />} />
        <Route path="/admin/cms" element={<CMSPage />} />
        <Route path="/p/:slug" element={<PublicCMSPage />} />
        <Route path="/admin/management" element={<AdminOperationsPage />} />
        <Route path="/admin/business-control" element={<BusinessControl />} />
        <Route path="/admin/roles" element={<RolePermissionsPage />} />
        <Route path="/login" element={<AccountPage mode="login" />} />
        <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
        <Route
          path="/reset-password"
          element={<PasswordRecoveryPage reset />}
        />
        <Route path="/register" element={<AccountPage mode="register" />} />
        <Route
          path="/technician/register"
          element={<AccountPage mode="technician" />}
        />
        <Route path="/partner/register" element={<PartnerRegistration />} />
        <Route path="/partner/verify/:token" element={<PartnerVerification />} />
        <Route path="/partner/dashboard" element={<PartnerWorkspace />} />
        <Route path="/partner-technician/dashboard" element={<PartnerTechnicianWorkspace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/technician/dashboard" element={<UserDashboard mode="technician" />} />
        <Route path="/operations" element={<OperationsWorkspace />} />
        <Route path="/technician/operations" element={<OperationsWorkspace mode="technician" />} />
        <Route path="/my-quotations" element={<CustomerQuotations />} />
        <Route path="/track" element={<TicketTrackingPage />} />
        <Route
          path="*"
          element={
            <main className="not-found">
              <h1>404</h1>
              <p>পেজটি পাওয়া যায়নি।</p>
              <Link className="btn btn-primary" to="/">
                হোমে ফিরে যান
              </Link>
            </main>
          }
        />
      </Routes>
      {!isAdminArea && (
        <>
          <Footer />
          <WhatsAppFloat />
          {general.appearance?.backToTop !== false && showBackToTop ? <button className="public-back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">↑</button> : null}
        </>
      )}
      </>}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  );
}

export default App;
