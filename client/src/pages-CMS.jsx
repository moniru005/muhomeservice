import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ContentManagerPage } from "./components/admin.jsx";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CloudUpload,
  Copy,
  ExternalLink,
  Eye,
  FileImage,
  FileText,
  Globe,
  Home,
  ImagePlus,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Monitor,
  MoreHorizontal,
  PanelLeft,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Workflow,
  Wrench,
  Building2,
  ShieldCheck,
  Filter,
  X,
} from "lucide-react";
import "./cms.css";
const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
const defaultPages = [
  {
    slug: "home",
    title: "Home",
    status: "draft",
    seoTitle: "MU Home Service",
    seoDescription: "Home and office technical services in Noakhali",
    sections: [
      {
        id: "hero",
        type: "hero",
        visible: true,
        heading: "আপনার বাসা ও অফিসের সব সার্ভিস, এক জায়গায়।",
        text: "বিশ্বস্ত টেকনিশিয়ান বুক করুন সহজেই।",
        image: "",
        buttonText: "সার্ভিস বুক করুন",
        buttonUrl: "/book",
      },
      {
        id: "services",
        type: "services",
        visible: true,
        heading: "আমাদের সার্ভিসসমূহ",
        text: "আপনার প্রয়োজন অনুযায়ী সার্ভিস বেছে নিন।",
        image: "",
      },
      {
        id: "packages",
        type: "packages",
        visible: true,
        heading: "সার্ভিস প্যাকেজ",
        text: "বাসা ও অফিসের নিয়মিত যত্ন নিন।",
        image: "",
      },
    ],
  },
  {
    slug: "about",
    title: "About Us",
    status: "draft",
    seoTitle: "About MU Home Service",
    seoDescription: "",
    sections: [
      {
        id: "about-intro",
        type: "text",
        visible: true,
        heading: "আমাদের সম্পর্কে",
        text: "বাসা ও অফিসের প্রয়োজনীয় টেকনিক্যাল সার্ভিস—একটি নির্ভরযোগ্য জায়গা থেকে।",
        image: "",
      },
    ],
  },
  {
    slug: "services",
    title: "Services",
    status: "draft",
    seoTitle: "Services | MU Home Service",
    seoDescription: "",
    sections: [
      {
        id: "services-intro",
        type: "services",
        visible: true,
        heading: "আমাদের সার্ভিসসমূহ",
        text: "বাসা ও অফিসের নির্ভরযোগ্য সার্ভিস।",
        image: "",
      },
    ],
  },
  {
    slug: "packages",
    title: "Packages",
    status: "draft",
    seoTitle: "Packages | MU Home Service",
    seoDescription: "",
    sections: [
      {
        id: "packages-intro",
        type: "packages",
        visible: true,
        heading: "সার্ভিস প্যাকেজ",
        text: "আপনার প্রয়োজনের উপযোগী প্যাকেজ।",
        image: "",
      },
    ],
  },
  {
    slug: "contact",
    title: "Contact",
    status: "draft",
    seoTitle: "Contact MU Home Service",
    seoDescription: "",
    sections: [
      {
        id: "contact-info",
        type: "contact",
        visible: true,
        heading: "যোগাযোগ করুন",
        text: "মাইজদী, নোয়াখালী, বাংলাদেশ | 01683-988686",
        image: "",
      },
    ],
  },
];
const sectionTypes = [
  ["hero", "Hero banner"],
  ["text", "Text / About"],
  ["services", "Services grid"],
  ["packages", "Packages"],
  ["banner", "Promotional banner"],
  ["contact", "Contact details"],
  ["testimonials", "Testimonials"],
  ["faq", "FAQ"],
  ["gallery", "Gallery"],
  ["cta", "Call to action"],
];
const navGroups = [
  {
    title: "Workspace",
    items: [
      ["overview", "Overview", LayoutDashboard],
      ["pages", "Visual page builder", Layers],
      ["media", "Media library", FileImage],
      ["catalog", "Services & packages", Wrench],
      ["business-control", "Business Control", Building2],
      ["management-center", "Management Center", ShieldCheck],
    ],
  },
  {
    title: "Quick access",
    items: [
      ["bookings", "Bookings", ClipboardList],
      ["team", "Technicians & customers", Users],
      ["reports", "Reports & analytics", BarChart3],
      ["settings", "CMS settings", Settings],
    ],
  },
];
function Metric({ icon: Icon, label, value, delta, color, caption }) {
  return (
    <article className="pro-metric">
      <div className={`pro-metric-icon ${color}`}>
        <Icon size={20} />
      </div>
      <div className="pro-metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>
          <b>{delta}</b> {caption}
        </small>
      </div>
    </article>
  );
}
export default function CMSPage() {
  const [token, setToken] = useState(
      () => sessionStorage.getItem("muAdminToken") || "",
    ),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [tab, setTab] = useState("overview"),
    [pages, setPages] = useState(defaultPages),
    [selected, setSelected] = useState("home"),
    [media, setMedia] = useState([]),
    [services, setServices] = useState([]),
    [packages, setPackages] = useState([]),
    [activeTheme, setActiveTheme] = useState("classic"),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [mobileNav, setMobileNav] = useState(false),
    [profileMenuOpen, setProfileMenuOpen] = useState(false),
    [preview, setPreview] = useState(false),
    [showAddPage, setShowAddPage] = useState(false),
    [newPageTitle, setNewPageTitle] = useState(""),
    [globalSettings, setGlobalSettings] = useState({
      siteName: "MU Home Service",
      siteUrl: "https://muhomeservice.com",
      accent: "#2563eb",
    });
  const page = pages.find((p) => p.slug === selected) || pages[0];
  async function api(path, opts = {}) {
    const r = await fetch(API + path, {
      ...opts,
      headers: {
        ...(opts.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Request failed");
    return d;
  }
  async function load() {
    try {
      const d = await api("/admin/cms");
      setPages(d.pages?.length ? d.pages : defaultPages);
      setMedia(d.media || []);
      setServices(d.services || []);
      setPackages(d.packages || []);
      setActiveTheme(d.theme?.activeTheme || "classic");
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (token) load();
  }, [token]);
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if ((d.user || d.admin)?.role !== "admin")
        throw new Error("শুধু Admin CMS ব্যবহার করতে পারবেন।");
      sessionStorage.setItem("muAdminToken", d.token);
      sessionStorage.setItem("muAdmin", JSON.stringify(d.user || d.admin));
      setToken(d.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function updatePage(k, v) {
    setPages((old) =>
      old.map((p) => (p.slug === selected ? { ...p, [k]: v } : p)),
    );
  }
  function updateSection(id, k, v) {
    updatePage(
      "sections",
      page.sections.map((s) => (s.id === id ? { ...s, [k]: v } : s)),
    );
  }
  function addSection(type = "text") {
    updatePage("sections", [
      ...page.sections,
      {
        id: `section-${Date.now()}`,
        type,
        visible: true,
        heading:
          type === "hero" ? "আপনার সার্ভিসের হিরো শিরোনাম" : "নতুন সেকশন",
        text: "এখানে আপনার কনটেন্ট লিখুন।",
        image: "",
        buttonText: type === "hero" || type === "cta" ? "এখনই বুক করুন" : "",
        buttonUrl: "/book",
      },
    ]);
    setNotice("নতুন সেকশন যোগ হয়েছে।");
  }
  function moveSection(i, dir) {
    const next = [...page.sections],
      j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    updatePage("sections", next);
  }
  function duplicateSection(s) {
    updatePage("sections", [
      ...page.sections,
      {
        ...s,
        id: `section-${Date.now()}`,
        heading: `${s.heading || "Section"} (Copy)`,
      },
    ]);
  }
  function removeSection(id) {
    updatePage(
      "sections",
      page.sections.filter((s) => s.id !== id),
    );
  }
  async function save(status) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const p = pages.map((x) =>
        x.slug === selected
          ? {
              ...x,
              status,
              updatedAt: new Date().toISOString(),
              ...(status === "published"
                ? { publishedAt: new Date().toISOString() }
                : {}),
            }
          : x,
      );
      await api("/admin/cms/pages", {
        method: "PUT",
        body: JSON.stringify({ pages: p }),
      });
      setPages(p);
      setNotice(
        status === "published"
          ? "পেজটি সফলভাবে Publish হয়েছে।"
          : "Draft MongoDB-তে সংরক্ষিত হয়েছে।",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    setBusy(true);
    try {
      const d = await api("/admin/cms/media", { method: "POST", body: fd });
      setMedia((m) => [d.media, ...m]);
      setNotice("ছবি Media Library-তে আপলোড হয়েছে।");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  async function deleteMedia(m) {
    if (!window.confirm("এই মিডিয়া ফাইলটি মুছে ফেলবেন?")) return;
    try {
      await api(`/admin/cms/media/${m._id}`, { method: "DELETE" });
      setMedia((old) => old.filter((x) => x._id !== m._id));
      setNotice("মিডিয়া ফাইল মুছে ফেলা হয়েছে।");
    } catch (e) {
      setError(e.message);
    }
  }
  function createPage(e) {
    e.preventDefault();
    const slug = newPageTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!slug) {
      setError("Page title দিন (English title দিলে URL slug তৈরি হবে)।");
      return;
    }
    if (pages.some((p) => p.slug === slug)) {
      setError("এই slug-এ পেজ আগে থেকেই আছে।");
      return;
    }
    const p = {
      slug,
      title: newPageTitle,
      status: "draft",
      seoTitle: newPageTitle,
      seoDescription: "",
      sections: [
        {
          id: `section-${Date.now()}`,
          type: "hero",
          visible: true,
          heading: newPageTitle,
          text: "আপনার পেজের পরিচিতি এখানে লিখুন।",
          image: "",
          buttonText: "যোগাযোগ করুন",
          buttonUrl: "/book",
        },
      ],
    };
    setPages((old) => [...old, p]);
    setSelected(slug);
    setTab("pages");
    setShowAddPage(false);
    setNewPageTitle("");
    setNotice("নতুন পেজ তৈরি হয়েছে। Save Draft চাপুন।");
  }
  const filteredPages = useMemo(
    () =>
      pages.filter((p) =>
        `${p.title} ${p.slug}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [pages, search],
  );
  const logout = () => {
    sessionStorage.removeItem("muAdminToken");
    sessionStorage.removeItem("muAdmin");
    setToken("");
    setPassword("");
  };
  if (!token)
    return (
      <main className="pro-login-wrap">
        <div className="pro-login-art">
          <div className="pro-logo">
            <span className="pro-logo-mark">
              <Home size={25} />
            </span>
            <span>
              <b>MU HOME SERVICE</b>
              <small>CMS & ADMIN WORKSPACE</small>
            </span>
          </div>
          <div className="pro-login-message">
            <span className="pro-eyebrow">
              <Sparkles size={15} /> SMART CONTENT WORKSPACE
            </span>
            <h1>
              আপনার ওয়েবসাইট,
              <br />
              <em>আপনার নিয়ন্ত্রণে।</em>
            </h1>
            <p>
              ওয়েবসাইটের পেজ, ছবি, সার্ভিস এবং SEO এক জায়গা থেকে পরিচালনা করুন।
            </p>
            <div className="pro-login-points">
              <span>
                <CheckCircle2 size={17} /> Visual page builder
              </span>
              <span>
                <CheckCircle2 size={17} /> Media library
              </span>
              <span>
                <CheckCircle2 size={17} /> Publish workflow
              </span>
            </div>
          </div>
          <small className="pro-login-foot">
            © {new Date().getFullYear()} MU Home Service · Noakhali, Bangladesh
          </small>
        </div>
        <form className="pro-login-form" onSubmit={login}>
          <div className="pro-login-heading">
            <span className="pro-login-mobile-mark">
              <Home size={22} />
            </span>
            <small>WELCOME BACK</small>
            <h2>Admin sign in</h2>
            <p>আপনার Admin account দিয়ে প্রবেশ করুন।</p>
          </div>
          {error && <div className="pro-alert error">{error}</div>}
          <label>
            Email address
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="আপনার পাসওয়ার্ড"
            />
          </label>
          <button className="pro-button pro-button-blue" disabled={busy}>
            {busy ? "প্রবেশ করা হচ্ছে…" : "Sign in to CMS"}
            <ChevronRight size={18} />
          </button>
          <Link to="/admin" className="pro-back-link">
            <ArrowLeft size={15} /> Main admin dashboard
          </Link>
          <p className="pro-login-secure">
            <ShieldCheck size={15} /> Secure access · Admin only
          </p>
        </form>
      </main>
    );
  return (
    <main className="pro-cms-app">
      <aside className={`pro-sidebar ${mobileNav ? "is-open" : ""}`}>
        <div className="pro-sidebar-brand">
          <span className="pro-logo-mark">
            <Home size={23} />
          </span>
          <span>
            <b>MU HOME SERVICE</b>
            <small>CMS WORKSPACE</small>
          </span>
          <button className="pro-close-nav" onClick={() => setMobileNav(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="pro-workspace">
          <span className="pro-workspace-dot" />
          <span>
            <b>MU Home Service</b>
            <small>Production website</small>
          </span>
          <ChevronDown size={15} />
        </div>
        {navGroups.map((group) => (
          <div className="pro-nav-group" key={group.title}>
            <p>{group.title}</p>
            {group.items.map(([id, label, Icon]) =>
              ["business-control", "management-center"].includes(id) ? (
                <Link
                  key={id}
                  to={
                    id === "business-control"
                      ? "/admin/business-control"
                      : "/admin/management"
                  }
                  className="pro-nav-item"
                  onClick={() => setMobileNav(false)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ) : (
                <button
                  key={id}
                  className={`pro-nav-item ${tab === id ? "active" : ""}`}
                  onClick={() => {
                    setTab(id);
                    setMobileNav(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {id === "pages" && <small>{pages.length}</small>}
                </button>
              ),
            )}
          </div>
        ))}
        <div className="pro-sidebar-bottom">
          <div className="pro-help-card">
            <span>
              <Sparkles size={16} />
            </span>
            <b>Need a hand?</b>
            <p>CMS ব্যবহার সংক্রান্ত গাইড দেখুন।</p>
            <button
              onClick={() =>
                setNotice(
                  "গাইড: Page Builder → Section edit → Save Draft → Preview → Publish.",
                )
              }
            >
              View quick guide <ChevronRight size={14} />
            </button>
          </div>
          <Link to="/admin" className="pro-nav-item">
            <ArrowLeft size={17} />
            <span>Main Admin Dashboard</span>
          </Link>
          <button className="pro-nav-item pro-logout" onClick={logout}>
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
          <small className="pro-version">MU Home Service · CMS v2.0</small>
        </div>
      </aside>
      <section className="pro-main-area">
        <header className="pro-topbar">
          <div className="pro-top-left">
            <button
              className="pro-mobile-menu"
              onClick={() => setMobileNav((v) => !v)}
            >
              <Menu size={20} />
            </button>
            <div className="pro-breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <b>
                {{
                  overview: "Overview",
                  pages: "Page Builder",
                  media: "Media Library",
                  catalog: "Services & Packages",
                  bookings: "Bookings",
                  team: "People",
                  reports: "Analytics",
                  settings: "Settings",
                }[tab] || "Overview"}
              </b>
            </div>
          </div>
          <div className="pro-top-right">
            <label className="pro-global-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pages..."
              />
              <kbd>⌘ K</kbd>
            </label>
            <a
              className="pro-icon-button"
              href="/"
              target="_blank"
              rel="noreferrer"
              title="Visit website"
            >
              <Globe size={18} />
            </a>
            <div
              className={`pro-account-menu ${profileMenuOpen ? "is-open" : ""}`}
              onMouseEnter={() => setProfileMenuOpen(true)}
              onMouseLeave={() => setProfileMenuOpen(false)}
            >
              <Link
                to="/profile?account=admin"
                className="pro-account-link"
                title="Open administrator profile"
                onClick={() => setProfileMenuOpen(false)}
              >
                <span className="pro-avatar">MU</span>
                <span className="pro-user-meta">
                  <b>
                    {JSON.parse(sessionStorage.getItem("muAdmin") || "{}")
                      .name || "MU Home Service Admin"}
                  </b>
                  <small>Website administrator</small>
                </span>
              </Link>
              <button
                className="pro-chevron-button"
                type="button"
                aria-label="Open account menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((open) => !open)}
                title="Account options"
              >
                <ChevronDown size={16} />
              </button>
              {profileMenuOpen && (
                <div className="pro-account-dropdown">
                  <Link to="/admin" onClick={() => setProfileMenuOpen(false)}>
                    <Home size={15} /> Dashboard
                  </Link>
                  <Link
                    to="/profile?account=admin"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    <Settings size={15} /> Update profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="pro-content">
          <div className="pro-page-heading">
            <div>
              <div className="pro-eyebrow">
                MU HOME SERVICE / CONTENT STUDIO
              </div>
              <h1>
                {{
                  overview: "Dashboard overview",
                  pages: "Visual page builder",
                  media: "Media library",
                  catalog: "Services & packages",
                  bookings: "Bookings overview",
                  team: "People & access",
                  reports: "Reports & analytics",
                  settings: "CMS settings",
                }[tab] || "Dashboard overview"}
              </h1>
              <p>
                {{
                  overview:
                    "আপনার ওয়েবসাইট ও কনটেন্টের গুরুত্বপূর্ণ তথ্য এক নজরে দেখুন।",
                  pages:
                    "পেজ তৈরি করুন, সেকশন সাজান এবং publish করার আগে preview দেখুন।",
                  media:
                    "আপনার ওয়েবসাইটের ছবি এক জায়গায় আপলোড ও পরিচালনা করুন।",
                  catalog: "ডাটাবেজে থাকা সার্ভিস ও প্যাকেজ সম্পাদনা করুন।",
                  bookings:
                    "সার্ভিস বুকিং পরিচালনার জন্য অপারেশনস ড্যাশবোর্ড ব্যবহার করুন।",
                  team: "Technician, customer এবং admin account পরিচালনা করুন।",
                  reports: "বুকিং ও ব্যবসার রিপোর্ট দেখুন।",
                  settings: "CMS-এর সাধারণ সেটিংস পরিচালনা করুন।",
                }[tab] || ""}
              </p>
            </div>
            <div className="pro-heading-actions">
              <span className="pro-save-state">
                <span />{" "}
                {page?.status === "published"
                  ? "Published content"
                  : "Draft workspace"}
              </span>
              {tab !== "bookings" && (
                <button
                  className="pro-button pro-button-light"
                  onClick={load}
                  disabled={busy}
                >
                  <RefreshCw size={16} /> Refresh
                </button>
              )}
              {tab === "pages" && (
                <>
                  <button
                    className="pro-button pro-button-light"
                    onClick={() => setPreview((v) => !v)}
                  >
                    <Eye size={16} /> {preview ? "Hide preview" : "Preview"}
                  </button>
                  <button
                    className="pro-button pro-button-blue"
                    onClick={() => save("published")}
                    disabled={busy}
                  >
                    <Send size={16} /> Publish
                  </button>
                </>
              )}
            </div>
          </div>
          {error && (
            <div className="pro-alert error">
              <X size={17} />
              {error}
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div className="pro-alert success">
              <CheckCircle2 size={17} />
              {notice}
              <button onClick={() => setNotice("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {tab === "overview" && (
            <>
              <div className="pro-metrics-grid">
                <Metric
                  icon={FileText}
                  label="Website pages"
                  value={pages.length}
                  delta={`${pages.filter((p) => p.status === "published").length} live`}
                  color="blue"
                  caption="published"
                />
                <Metric
                  icon={Layers}
                  label="Page sections"
                  value={pages.reduce(
                    (n, p) => n + (p.sections || []).length,
                    0,
                  )}
                  delta="Builder"
                  color="violet"
                  caption="editable blocks"
                />
                <Metric
                  icon={FileImage}
                  label="Media assets"
                  value={media.length}
                  delta="Library"
                  color="orange"
                  caption="uploaded files"
                />
                <Metric
                  icon={Wrench}
                  label="Services"
                  value={services.length}
                  delta="Database"
                  color="green"
                  caption="available records"
                />
              </div>
              <div className="pro-dashboard-grid">
                <section className="pro-card pro-activity-card">
                  <div className="pro-card-heading">
                    <div>
                      <span className="pro-card-kicker">CONTENT CONTROL</span>
                      <h2>Website content</h2>
                      <p>আপনার পেজ এবং প্রকাশনার অবস্থা</p>
                    </div>
                    <button
                      className="pro-button pro-button-blue"
                      onClick={() => setTab("pages")}
                    >
                      <Layers size={16} /> Open page builder
                    </button>
                  </div>
                  <div className="pro-publish-summary">
                    <div className="pro-publish-ring">
                      <div>
                        <b>
                          {pages.length
                            ? Math.round(
                                (pages.filter((p) => p.status === "published")
                                  .length /
                                  pages.length) *
                                  100,
                              )
                            : 0}
                          %
                        </b>
                        <small>Published</small>
                      </div>
                    </div>
                    <div className="pro-publish-detail">
                      <h3>Publishing progress</h3>
                      <p>
                        {pages.filter((p) => p.status === "published").length}{" "}
                        of {pages.length} pages are published.
                      </p>
                      <div className="pro-progress-track">
                        <span
                          style={{
                            width: `${pages.length ? (pages.filter((p) => p.status === "published").length / pages.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="pro-progress-legend">
                        <span>
                          <i className="live-dot" /> Published{" "}
                          <b>
                            {
                              pages.filter((p) => p.status === "published")
                                .length
                            }
                          </b>
                        </span>
                        <span>
                          <i className="draft-dot" /> Drafts{" "}
                          <b>
                            {
                              pages.filter((p) => p.status !== "published")
                                .length
                            }
                          </b>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="pro-table-title">
                    <h3>Recently updated pages</h3>
                    <button onClick={() => setTab("pages")}>
                      View all <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="pro-page-table">
                    {pages
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.updatedAt || 0) -
                          new Date(a.updatedAt || 0),
                      )
                      .slice(0, 5)
                      .map((p) => (
                        <button
                          key={p.slug}
                          onClick={() => {
                            setSelected(p.slug);
                            setTab("pages");
                          }}
                        >
                          <span className="pro-table-file">
                            <FileText size={17} />
                          </span>
                          <span className="pro-table-page">
                            <b>{p.title}</b>
                            <small>/{p.slug}</small>
                          </span>
                          <span className={`pro-status-pill ${p.status}`}>
                            {p.status === "published" ? "Published" : "Draft"}
                          </span>
                          <span className="pro-table-date">
                            {p.updatedAt
                              ? new Date(p.updatedAt).toLocaleDateString(
                                  "en-GB",
                                )
                              : "Not updated"}
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                  </div>
                </section>
                <aside className="pro-card pro-quick-card">
                  <div className="pro-card-heading">
                    <div>
                      <span className="pro-card-kicker">SHORTCUTS</span>
                      <h2>Quick actions</h2>
                    </div>
                    <MoreHorizontal size={19} />
                  </div>
                  <button
                    onClick={() => {
                      setTab("pages");
                      setShowAddPage(true);
                    }}
                  >
                    <span className="quick-icon blue">
                      <Plus size={18} />
                    </span>
                    <span>
                      <b>Create a page</b>
                      <small>Start a new website page</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={() => setTab("media")}>
                    <span className="quick-icon violet">
                      <Upload size={18} />
                    </span>
                    <span>
                      <b>Upload media</b>
                      <small>Add photos and graphics</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={() => setTab("catalog")}>
                    <span className="quick-icon green">
                      <Wrench size={18} />
                    </span>
                    <span>
                      <b>Manage services</b>
                      <small>Edit service catalogue</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                  <a href="/" target="_blank" rel="noreferrer">
                    <span className="quick-icon orange">
                      <ExternalLink size={18} />
                    </span>
                    <span>
                      <b>View live website</b>
                      <small>Open public website</small>
                    </span>
                    <ChevronRight size={16} />
                  </a>
                  <div className="pro-tip">
                    <Sparkles size={17} />
                    <div>
                      <b>Publishing tip</b>
                      <p>
                        প্রথমে Draft save করুন। Preview দেখে সব ঠিক থাকলে
                        Publish করুন।
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
              <div className="pro-bottom-grid">
                <button
                  className="pro-feature-card"
                  onClick={() => setTab("pages")}
                >
                  <span className="feature-icon blue">
                    <PanelLeft size={20} />
                  </span>
                  <span>
                    <b>Visual Page Builder</b>
                    <small>Sections, text, images and SEO</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="pro-feature-card"
                  onClick={() => setTab("media")}
                >
                  <span className="feature-icon violet">
                    <ImagePlus size={20} />
                  </span>
                  <span>
                    <b>Media Library</b>
                    <small>Upload and reuse images</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="pro-feature-card"
                  onClick={() => setTab("catalog")}
                >
                  <span className="feature-icon green">
                    <Workflow size={20} />
                  </span>
                  <span>
                    <b>Service catalogue</b>
                    <small>Services and package editor</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
                <button
                  className="pro-feature-card"
                  onClick={() => setTab("settings")}
                >
                  <span className="feature-icon orange">
                    <Settings size={20} />
                  </span>
                  <span>
                    <b>Website settings</b>
                    <small>Site identity and defaults</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              </div>
            </>
          )}
          {tab === "pages" && (
            <div className="pro-builder-layout">
              <aside className="pro-card pro-page-library">
                <div className="pro-library-head">
                  <div>
                    <h2>Pages</h2>
                    <small>{pages.length} website pages</small>
                  </div>
                  <button
                    className="pro-square-button"
                    onClick={() => setShowAddPage((v) => !v)}
                    title="Add page"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {showAddPage && (
                  <form className="pro-add-page" onSubmit={createPage}>
                    <label>
                      New page title
                      <input
                        autoFocus
                        value={newPageTitle}
                        onChange={(e) => setNewPageTitle(e.target.value)}
                        placeholder="e.g. Our Team"
                        required
                      />
                    </label>
                    <div>
                      <button
                        type="button"
                        className="pro-button pro-button-light"
                        onClick={() => setShowAddPage(false)}
                      >
                        Cancel
                      </button>
                      <button className="pro-button pro-button-blue">
                        Create
                      </button>
                    </div>
                  </form>
                )}
                <label className="pro-page-search">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find a page"
                  />
                </label>
                <div className="pro-page-items">
                  {filteredPages.map((p) => (
                    <button
                      key={p.slug}
                      className={`pro-page-item ${selected === p.slug ? "selected" : ""}`}
                      onClick={() => {
                        setSelected(p.slug);
                        setPreview(false);
                      }}
                    >
                      <span className="pro-page-item-icon">
                        <FileText size={17} />
                      </span>
                      <span className="pro-page-item-info">
                        <b>{p.title}</b>
                        <small>/{p.slug}</small>
                      </span>
                      <i className={p.status}>
                        {p.status === "published" ? "Live" : "Draft"}
                      </i>
                    </button>
                  ))}
                </div>
                <button
                  className="pro-add-page-button"
                  onClick={() => setShowAddPage(true)}
                >
                  <Plus size={16} /> Add new page
                </button>
                <div className="pro-library-foot">
                  <ShieldCheck size={15} /> Changes are saved to MongoDB
                </div>
              </aside>
              <div className="pro-builder-main">
                <section className="pro-card pro-editor-card">
                  <div className="pro-editor-toolbar">
                    <div className="pro-editor-title">
                      <span className="pro-editor-file-icon">
                        <FileText size={18} />
                      </span>
                      <div>
                        <h2>{page.title}</h2>
                        <small>
                          <Globe size={12} /> {globalSettings.siteUrl}/p/
                          {page.slug}
                        </small>
                      </div>
                      <span className={`pro-status-pill ${page.status}`}>
                        {page.status === "published" ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="pro-editor-actions">
                      <button
                        className="pro-button pro-button-light"
                        onClick={() => setPreview((v) => !v)}
                      >
                        <Eye size={15} />
                        {preview ? "Edit" : "Preview"}
                      </button>
                      <button
                        className="pro-button pro-button-light"
                        onClick={() => save("draft")}
                        disabled={busy}
                      >
                        <Save size={15} /> Save draft
                      </button>
                      <button
                        className="pro-button pro-button-blue"
                        onClick={() => save("published")}
                        disabled={busy}
                      >
                        <Send size={15} /> Publish
                      </button>
                    </div>
                  </div>
                  <div className="pro-editor-tabs">
                    <span className="active">
                      <Layers size={14} /> Content
                    </span>
                    <span>
                      <Settings size={14} /> Page settings
                    </span>
                    <button
                      onClick={() => window.open(`/p/${page.slug}`, "_blank")}
                    >
                      <ExternalLink size={14} /> Open page
                    </button>
                  </div>
                  {preview ? (
                    <div className="pro-page-preview">
                      <div className="pro-preview-browser">
                        <span />
                        <span />
                        <span />
                        <small>
                          {globalSettings.siteUrl}/p/{page.slug}
                        </small>
                      </div>
                      <div className="pro-preview-site">
                        <div className="pro-preview-nav">
                          <b>⌂ MU HOME SERVICE</b>
                          <span>
                            Home　 About　 Services　 Packages　 Contact
                          </span>
                          <button>Book Service</button>
                        </div>
                        {page.sections
                          .filter((s) => s.visible !== false)
                          .map((s) => (
                            <section
                              key={s.id}
                              className={`pro-preview-section ${s.type === "hero" ? "hero" : ""}`}
                            >
                              {s.image && <img src={s.image} alt="" />}
                              <small>{s.type}</small>
                              <h2>{s.heading}</h2>
                              <p>{s.text}</p>
                              {s.buttonText && (
                                <a href={s.buttonUrl || "/book"}>
                                  {s.buttonText}
                                </a>
                              )}
                            </section>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="pro-page-settings">
                        <div className="pro-settings-heading">
                          <div>
                            <h3>Page settings</h3>
                            <p>
                              পেজের নাম, URL এবং search engine তথ্য নিয়ন্ত্রণ
                              করুন।
                            </p>
                          </div>
                          <button
                            className="pro-collapse"
                            onClick={() =>
                              setNotice("Page settings সবসময় editable থাকে।")
                            }
                          >
                            <ChevronDown size={17} />
                          </button>
                        </div>
                        <div className="pro-settings-grid">
                          <label>
                            Page title
                            <input
                              value={page.title}
                              onChange={(e) =>
                                updatePage("title", e.target.value)
                              }
                            />
                          </label>
                          <label>
                            URL slug
                            <div className="pro-slug-input">
                              <span>/p/</span>
                              <input
                                value={page.slug}
                                onChange={(e) =>
                                  updatePage(
                                    "slug",
                                    e.target.value
                                      .toLowerCase()
                                      .replace(/[^a-z0-9-]/g, ""),
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="wide">
                            SEO title
                            <input
                              value={page.seoTitle || ""}
                              onChange={(e) =>
                                updatePage("seoTitle", e.target.value)
                              }
                              placeholder="Search result title"
                            />
                            <small>
                              {(page.seoTitle || "").length}/60 characters
                              recommended
                            </small>
                          </label>
                          <label className="wide">
                            Meta description
                            <textarea
                              rows="2"
                              value={page.seoDescription || ""}
                              onChange={(e) =>
                                updatePage("seoDescription", e.target.value)
                              }
                              placeholder="Describe this page for search engines"
                            />
                            <small>
                              {(page.seoDescription || "").length}/160
                              characters recommended
                            </small>
                          </label>
                        </div>
                      </div>
                      <div className="pro-sections-heading">
                        <div>
                          <h3>
                            Page sections <span>{page.sections.length}</span>
                          </h3>
                          <p>সেকশন যোগ, সাজানো, hide/show বা duplicate করুন।</p>
                        </div>
                        <div className="pro-add-section-wrap">
                          <select
                            aria-label="Section type"
                            id="pro-section-type"
                          >
                            {sectionTypes.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="pro-button pro-button-blue"
                            onClick={() =>
                              addSection(
                                document.getElementById("pro-section-type")
                                  ?.value || "text",
                              )
                            }
                          >
                            <Plus size={15} /> Add section
                          </button>
                        </div>
                      </div>
                      <div className="pro-section-list">
                        {page.sections.map((s, i) => (
                          <article
                            className={`pro-section-editor ${s.visible === false ? "is-hidden" : ""}`}
                            key={s.id}
                          >
                            <div className="pro-section-row">
                              <span className="pro-drag-handle">
                                <Layers size={16} />
                              </span>
                              <span className="pro-section-number">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="pro-section-type-icon">
                                <Monitor size={17} />
                              </span>
                              <div className="pro-section-row-title">
                                <b>
                                  {s.heading ||
                                    sectionTypes.find(
                                      (x) => x[0] === s.type,
                                    )?.[1] ||
                                    s.type}
                                </b>
                                <small>
                                  {sectionTypes.find(
                                    (x) => x[0] === s.type,
                                  )?.[1] || s.type}{" "}
                                  · {s.visible === false ? "Hidden" : "Visible"}
                                </small>
                              </div>
                              <div className="pro-section-row-actions">
                                <button
                                  title="Move up"
                                  disabled={i === 0}
                                  onClick={() => moveSection(i, -1)}
                                >
                                  <ArrowUp size={15} />
                                </button>
                                <button
                                  title="Move down"
                                  disabled={i === page.sections.length - 1}
                                  onClick={() => moveSection(i, 1)}
                                >
                                  <ArrowDown size={15} />
                                </button>
                                <button
                                  title="Duplicate section"
                                  onClick={() => duplicateSection(s)}
                                >
                                  <Copy size={15} />
                                </button>
                                <button
                                  title={
                                    s.visible === false
                                      ? "Show section"
                                      : "Hide section"
                                  }
                                  onClick={() =>
                                    updateSection(
                                      s.id,
                                      "visible",
                                      s.visible === false,
                                    )
                                  }
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  className="danger"
                                  title="Delete section"
                                  onClick={() => removeSection(s.id)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                            <div className="pro-section-fields">
                              <div className="pro-settings-grid">
                                <label>
                                  Section type
                                  <select
                                    value={s.type}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        "type",
                                        e.target.value,
                                      )
                                    }
                                  >
                                    {sectionTypes.map(([value, label]) => (
                                      <option key={value} value={value}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  Heading
                                  <input
                                    value={s.heading || ""}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        "heading",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label className="wide">
                                  Description / body
                                  <textarea
                                    rows="3"
                                    value={s.text || ""}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        "text",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label>
                                  Button label
                                  <input
                                    value={s.buttonText || ""}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        "buttonText",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Optional"
                                  />
                                </label>
                                <label>
                                  Button link
                                  <input
                                    value={s.buttonUrl || ""}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        "buttonUrl",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="/book"
                                  />
                                </label>
                                <label className="wide">
                                  Image URL
                                  <input
                                    value={s.image || ""}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        "image",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Paste image URL or choose from Media Library"
                                  />
                                </label>
                              </div>
                              {s.image && (
                                <img
                                  className="pro-section-image"
                                  src={s.image}
                                  alt="Section"
                                />
                              )}
                              <div className="pro-section-footer">
                                <label className="pro-visible-switch">
                                  <input
                                    type="checkbox"
                                    checked={s.visible !== false}
                                    onChange={(e) =>
                                      updateSection(
                                        s.id,
                                        "visible",
                                        e.target.checked,
                                      )
                                    }
                                  />
                                  <span className="pro-switch-track" />
                                  <span>
                                    {s.visible === false
                                      ? "Section hidden"
                                      : "Visible on website"}
                                  </span>
                                </label>
                                <button
                                  onClick={() => {
                                    setTab("media");
                                    setNotice(
                                      "Media Library থেকে image URL কপি করে section-এর Image URL-এ বসান।",
                                    );
                                  }}
                                >
                                  <ImagePlus size={14} /> Choose from media
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                        {!page.sections.length && (
                          <div className="pro-empty-state">
                            <Layers size={32} />
                            <b>This page has no sections yet</b>
                            <p>Add a section to start building your page.</p>
                            <button
                              className="pro-button pro-button-blue"
                              onClick={() => addSection("hero")}
                            >
                              <Plus size={15} /> Add first section
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>
            </div>
          )}
          {tab === "media" && (
            <section className="pro-card pro-media-card">
              <div className="pro-card-heading">
                <div>
                  <span className="pro-card-kicker">ASSET MANAGER</span>
                  <h2>Media library</h2>
                  <p>
                    ছবি আপলোড করুন, URL কপি করুন অথবা অপ্রয়োজনীয় ফাইল মুছুন।
                  </p>
                </div>
                <label className="pro-button pro-button-blue pro-upload-label">
                  <CloudUpload size={17} /> Upload image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={upload}
                  />
                </label>
              </div>
              <div className="pro-media-summary">
                <span>
                  <FileImage size={17} /> {media.length} assets
                </span>
                <span>PNG, JPG, WEBP, GIF · Max 5 MB</span>
              </div>
              <div className="pro-media-grid">
                {media.map((m) => (
                  <article key={m._id || m.url}>
                    <div className="pro-media-image">
                      <img src={m.url} alt={m.originalName || "Media asset"} />
                      <button
                        title="Copy image URL"
                        onClick={() => {
                          navigator.clipboard?.writeText(m.url);
                          setNotice("Image URL কপি হয়েছে।");
                        }}
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                    <div className="pro-media-meta">
                      <b title={m.originalName}>
                        {m.originalName || "Image asset"}
                      </b>
                      <small>
                        {Math.ceil((m.size || 0) / 1024)} KB ·{" "}
                        {m.mimetype || "Image"}
                      </small>
                      <div>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(m.url);
                            setNotice("Image URL কপি হয়েছে।");
                          }}
                        >
                          <Copy size={14} /> Copy URL
                        </button>
                        <button
                          className="danger"
                          onClick={() => deleteMedia(m)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!media.length && (
                <div className="pro-empty-state">
                  <FileImage size={34} />
                  <b>Your media library is empty</b>
                  <p>Upload an image to use it in your website sections.</p>
                  <label className="pro-button pro-button-blue pro-upload-label">
                    <Upload size={16} /> Upload first image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={upload}
                    />
                  </label>
                </div>
              )}
            </section>
          )}
          {tab === "catalog" && (
            <section
              className="pro-card pro-catalog-editor"
              aria-label="Service and package management"
            >
              <ContentManagerPage embedded />
            </section>
          )}
          {tab === "bookings" && <CMSBookingsPanel />}
          {tab === "team" && (
            <section className="pro-card pro-placeholder-panel">
              <span className="pro-catalog-icon violet">
                <Users size={23} />
              </span>
              <h2>Technicians & customers</h2>
              <p>
                Technician approval, role management এবং customer accounts
                পরিচালনা করতে Management Center খুলুন।
              </p>
              <Link
                className="pro-button pro-button-blue"
                to="/admin/management"
              >
                Open management center <ChevronRight size={16} />
              </Link>
            </section>
          )}
          {tab === "reports" && (
            <section className="pro-card pro-placeholder-panel">
              <span className="pro-catalog-icon green">
                <BarChart3 size={23} />
              </span>
              <h2>Reports & analytics</h2>
              <p>
                আয়-ব্যয় এবং পরিচালনাগত রিপোর্টের জন্য Management Center ব্যবহার
                করুন।
              </p>
              <Link
                className="pro-button pro-button-blue"
                to="/admin/management"
              >
                Open reports <ChevronRight size={16} />
              </Link>
            </section>
          )}
          {tab === "settings" && (
            <>
            <section className="pro-card pro-settings-card pro-theme-settings">
              <div className="pro-card-heading">
                <div>
                  <span className="pro-card-kicker">FRONTEND APPEARANCE</span>
                  <h2>Ready-made website themes</h2>
                  <p>Select a design and publish it to update the public website in one click.</p>
                </div>
                <Globe size={20} />
              </div>
              <div className="pro-theme-grid">
                {[
                  {id:"classic",name:"Classic Original",desc:"The current MU Home Service navy and lime look.",colors:["#0b2340","#c7f36b","#f5f8fa"]},
                  {id:"ocean",name:"Ocean Blue",desc:"Clean blue gradients with a bright, professional feel.",colors:["#123b70","#35b6d8","#eef6ff"]},
                  {id:"emerald",name:"Emerald Fresh",desc:"Fresh green accents and calm, nature-inspired surfaces.",colors:["#123c35","#a7e6bd","#f0faf5"]},
                  {id:"sunset",name:"Sunset Warm",desc:"Warm terracotta accents with soft cream backgrounds.",colors:["#542d2b","#ffb36b","#fff7ef"]}
                ].map((theme) => (
                  <button type="button" key={theme.id} className={`pro-theme-option ${activeTheme===theme.id?"selected":""}`} onClick={()=>setActiveTheme(theme.id)} aria-pressed={activeTheme===theme.id}>
                    <span className={`pro-theme-preview theme-preview-${theme.id}`}>
                      <i /><i /><i />
                      <b />
                    </span>
                    <span className="pro-theme-option-copy"><b>{theme.name}</b><small>{theme.desc}</small></span>
                    <span className="pro-theme-swatches">{theme.colors.map(c=><i key={c} style={{background:c}} />)}</span>
                    {activeTheme===theme.id && <span className="pro-theme-selected"><CheckCircle2 size={14}/> Selected</span>}
                  </button>
                ))}
              </div>
              <div className="pro-theme-publish-row">
                <span><ShieldCheck size={16}/> The selected theme applies to the public website, not the Admin workspace.</span>
                <button className="pro-button pro-button-blue" disabled={busy} onClick={async()=>{setBusy(true);setError("");setNotice("");try{const d=await api("/admin/cms/theme",{method:"PUT",body:JSON.stringify({activeTheme})});setActiveTheme(d.theme?.activeTheme||activeTheme);setNotice("Website theme published successfully. The public frontend will use this theme now.");}catch(e){setError(e.message);}finally{setBusy(false);}}}><Globe size={15}/>{busy?"Publishing…":"Publish Theme"}</button>
              </div>
            </section>
            <section className="pro-card pro-settings-card">
              <div className="pro-card-heading">
                <div>
                  <span className="pro-card-kicker">SITE CONFIGURATION</span>
                  <h2>General settings</h2>
                  <p>
                    CMS workspace-এর site identity এবং preview URL সেট করুন।
                  </p>
                </div>
                <Settings size={20} />
              </div>
              <div className="pro-settings-grid">
                <label>
                  Website name
                  <input
                    value={globalSettings.siteName}
                    onChange={(e) =>
                      setGlobalSettings((s) => ({
                        ...s,
                        siteName: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Website URL
                  <input
                    value={globalSettings.siteUrl}
                    onChange={(e) =>
                      setGlobalSettings((s) => ({
                        ...s,
                        siteUrl: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Brand accent colour
                  <input
                    type="color"
                    value={globalSettings.accent}
                    onChange={(e) =>
                      setGlobalSettings((s) => ({
                        ...s,
                        accent: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="pro-alert info">
                <Activity size={17} /> এই সেটিংস বর্তমানে CMS workspace-এর
                preview-তে ব্যবহৃত হয়; public website-এর global settings API-তে
                সংরক্ষিত নয়।
              </div>
              <button
                className="pro-button pro-button-light"
                onClick={() =>
                  setGlobalSettings({
                    siteName: "MU Home Service",
                    siteUrl: "https://muhomeservice.com",
                    accent: "#2563eb",
                  })
                }
              >
                Reset defaults
              </button>
            </section>
            </>
          )}
          <footer className="pro-footer">
            <span>© {new Date().getFullYear()} MU Home Service</span>
            <span>
              <ShieldCheck size={14} /> Admin workspace · Secure session
            </span>
            <span>CMS v2.0</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
function CMSBookingsPanel() {
  const token = sessionStorage.getItem("muAdminToken") || "";
  const [bookings, setBookings] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    fresh: 0,
    progress: 0,
    completed: 0,
  });
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [selections, setSelections] = useState({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const api = async (path, opts = {}) => {
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
  };
  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [b, st, t] = await Promise.all([
        api(
          `/admin/bookings?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}`,
        ),
        api("/admin/stats"),
        api("/admin/technicians"),
      ]);
      setBookings(b.bookings || []);
      setStats(st || {});
      setTechnicians(
        (t.technicians || []).filter(
          (x) => (x.technicianStatus || x.accountStatus) === "approved",
        ),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh();
  }, [status]);
  const updateStatus = async (id, next) => {
    try {
      await api(`/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setNotice("Booking status আপডেট হয়েছে।");
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };
  const assign = async (b) => {
    const technicianIds =
      selections[b._id] ??
      b.technicianIds ??
      (b.technicianId ? [b.technicianId] : []);
    try {
      await api(`/bookings/${b._id}/technicians`, {
        method: "PATCH",
        body: JSON.stringify({ technicianIds }),
      });
      setNotice("Technician assignment আপডেট হয়েছে।");
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async (b) => {
    if (
      !window.confirm(`আপনি কি ${b.ticketId || "এই booking"} মুছে ফেলতে চান?`)
    )
      return;
    try {
      await api(`/admin/bookings/${b._id}`, { method: "DELETE" });
      setNotice("Booking মুছে ফেলা হয়েছে।");
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };
  const statuses = [
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
  ];
  return (
    <section className="pro-card pro-bookings-panel">
      <div className="pro-card-heading">
        <div>
          <span className="pro-card-kicker">BOOKING OPERATIONS</span>
          <p>
            সকল service request, customer details, booking status এবং technician
            assignment এখান থেকে পরিচালনা করুন।
          </p>
        </div>
        <div className="pro-bookings-heading-actions">
          <Link
            className="pro-button pro-button-light pro-operation-button"
            to="/operations"
          >
            <ExternalLink size={16} /> <span>Operation Dashboard</span>
          </Link>
          <button className="pro-button pro-refresh-button" onClick={refresh}>
            <RefreshCw size={16} /> <span>Refresh</span>
          </button>
        </div>
      </div>
      {error && <div className="pro-alert error">{error}</div>}
      {notice && <div className="pro-alert success">{notice}</div>}
      <div className="pro-metrics-grid">
        {[
          ["Total bookings", stats.total || 0, CalendarDays, "total"],
          ["New requests", stats.fresh || 0, ClipboardCheck, "new"],
          ["In progress", stats.progress || 0, Activity, "progress"],
          ["Completed", stats.completed || 0, CheckCircle2, "completed"],
        ].map(([label, value, MetricIcon, tone]) => (
          <article
            className={`pro-metric pro-booking-metric pro-booking-metric-${tone}`}
            key={label}
          >
            <span className="pro-booking-metric-icon">
              <MetricIcon size={21} strokeWidth={2.2} />
            </span>
            <div className="pro-metric-copy">
              <span>{label}</span>
              <strong>{value}</strong>
              <small>
                {tone === "total"
                  ? "All service requests"
                  : tone === "new"
                    ? "Awaiting first action"
                    : tone === "progress"
                      ? "Currently being handled"
                      : "Successfully finished"}
              </small>
            </div>
            <span className="pro-booking-metric-glow" aria-hidden="true" />
          </article>
        ))}
      </div>
      <div className="pro-booking-toolbar">
        <label>
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
            placeholder="নাম, ফোন বা Ticket ID"
          />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">সব Status</option>
          {statuses.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button className="pro-button pro-button-blue" onClick={refresh}>
          <Filter size={15} /> Filter
        </button>
      </div>
      {loading ? (
        <p>Bookings লোড হচ্ছে…</p>
      ) : !bookings.length ? (
        <div className="pro-empty-state">
          <ClipboardList size={34} />
          <b>কোনো booking পাওয়া যায়নি</b>
          <p>নতুন service request এলে এখানে দেখা যাবে।</p>
        </div>
      ) : (
        <div className="pro-bookings-table-wrap">
          <table className="pro-bookings-table">
            <thead>
              <tr>
                <th>Ticket / Date</th>
                <th>Customer</th>
                <th>Service</th>
                <th>Area & Problem</th>
                <th>Status</th>
                <th>Technician / Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b._id}>
                  <td>
                    <b>{b.ticketId || b._id}</b>
                    <small>
                      {b.createdAt
                        ? new Date(b.createdAt).toLocaleString("en-BD")
                        : "—"}
                    </small>
                  </td>
                  <td>
                    <b>{b.name || "—"}</b>
                    <small>{b.phone || "—"}</small>
                    {b.email && <small>{b.email}</small>}
                  </td>
                  <td>{b.serviceName || "—"}</td>
                  <td>
                    <b>{b.area || "—"}</b>
                    <small>{b.address || ""}</small>
                    <small>{b.problem || ""}</small>
                    {b.preferredDate && (
                      <small>
                        Preferred: {b.preferredDate} · {b.preferredTime}
                      </small>
                    )}
                  </td>
                  <td>
                    <select
                      value={b.status || "New"}
                      onChange={(e) => updateStatus(b._id, e.target.value)}
                    >
                      {statuses.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      multiple
                      aria-label={`Assign technicians for ${b.ticketId}`}
                      value={
                        selections[b._id] ??
                        b.technicianIds ??
                        (b.technicianId ? [b.technicianId] : [])
                      }
                      onChange={(e) =>
                        setSelections((prev) => ({
                          ...prev,
                          [b._id]: Array.from(
                            e.target.selectedOptions,
                            (o) => o.value,
                          ),
                        }))
                      }
                    >
                      {technicians.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} ({t.email})
                        </option>
                      ))}
                    </select>
                    <button
                      className="pro-button pro-button-blue"
                      onClick={() => assign(b)}
                    >
                      Assign technician(s)
                    </button>
                    <button
                      className="pro-button pro-button-danger"
                      onClick={() => remove(b)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function PublicCMSPage() {
  const [page, setPage] = useState(null),
    [error, setError] = useState("");
  const slug = window.location.pathname.split("/").filter(Boolean).pop();
  useEffect(() => {
    fetch(`${API}/cms/pages/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Page not found");
        setPage(d.page);
        document.title = d.page.seoTitle || d.page.title;
      })
      .catch((e) => setError(e.message));
  }, [slug]);
  if (error)
    return (
      <main className="cms-public">
        <h1>Page not available</h1>
        <p>{error}. This page may be a draft.</p>
        <a href="/">Return to home</a>
      </main>
    );
  if (!page) return <main className="cms-public">Loading page…</main>;
  return (
    <main className="cms-public">
      <div className="cms-public-inner">
        {page.sections
          .filter((s) => s.visible !== false)
          .map((s) => (
            <section
              key={s.id}
              className={`cms-public-section ${s.type === "hero" ? "hero-section" : ""}`}
            >
              {s.image && <img src={s.image} alt={s.heading || ""} />}
              <small>{s.type}</small>
              {s.heading && <h1>{s.heading}</h1>}
              {s.text && <p>{s.text}</p>}
              {s.buttonText && (
                <a className="cms-public-button" href={s.buttonUrl || "/book"}>
                  {s.buttonText}
                </a>
              )}
            </section>
          ))}
      </div>
    </main>
  );
}
