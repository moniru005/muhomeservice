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
        </>
      )}
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
