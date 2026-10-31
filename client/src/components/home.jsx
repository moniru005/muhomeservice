import { ServiceCard } from "./layout.jsx";
import { PackageCard } from "./layout.jsx";
import { BookingForm } from "./booking.jsx";
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


const completePublicThemes = {
  classic: {
    eyebrow: "মাইজদী ও নোয়াখালীতে হোম সার্ভিস",
    title: "আপনার বাসা ও অফিসের", accent: "সব সার্ভিস, এক জায়গায়।",
    description: "Electrical, CCTV, Computer, AC, Plumbing থেকে শুরু করে দৈনন্দিন maintenance—বিশ্বস্ত টেকনিশিয়ান বুক করুন সহজেই।",
    heroImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85",
    heroAlt: "Home service professional working", heroCaption: "এক কলেই সমাধান", heroSub: "Home & Office Technical Care",
    badgeOne: "Verified Technicians", badgeOneSub: "কাজের আগে details confirm", badgeTwo: "Easy Booking", badgeTwoSub: "আপনার সুবিধামতো সময়",
    proof: "দ্রুত বুকিং • স্বচ্ছ quotation • নির্ভরযোগ্য সাপোর্ট",
    location: "মাইজদী • সোনাপুর • নোয়াখালী", trust: "আগে quotation, পরে কাজ", support: "Home & Corporate Support",
    servicesKicker: "OUR SERVICES", servicesTitle: "আপনার প্রয়োজনীয়", servicesAccent: "সার্ভিসসমূহ", servicesText: "ছোটখাটো মেরামত থেকে অফিসের নিয়মিত maintenance—আপনার কাজের জন্য উপযুক্ত service বেছে নিন।",
    teamKicker: "OUR VERIFIED TEAM", teamTitle: "পরিচ্ছন্ন ইউনিফর্মে", teamAccent: "MU Home Service টিম", teamText: "প্রতিটি টেকনিশিয়ানের পরিচয়, দক্ষতা ও safety gear যাচাই করে দায়িত্ব দেওয়া হয়। বুকিংয়ের আগে টিমের পরিচয় নিশ্চিত করুন।",
    teamPoints: ["যাচাইকৃত Technician ID", "কাজ অনুযায়ী safety equipment", "নির্ধারিত job assignment", "কাজ শেষে service report"],
    teamImage: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1000&q=85", teamAlt: "Technician repairing electrical equipment",
    businessKicker: "FOR BUSINESS", businessTitle: "আপনার অফিসের maintenance", businessAccent: "একটি নির্ভরযোগ্য টিমের হাতে।", businessText: "Computer, printer, CCTV, network, electrical ও AC maintenance-এর জন্য annual contract নিন। নিয়মিত check-up এবং service report রাখুন এক জায়গায়।",
    businessImage: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1100&q=85", businessAlt: "Modern office workspace",
    businessFeatures: [["IT & Networking","Computer, printer, Wi-Fi, LAN"],["CCTV & Access Control","Security, DVR, attendance"],["Facility Maintenance","Electrical, AC, plumbing"]],
    packagesKicker: "CARE PLANS", packagesTitle: "একবার নয়,", packagesAccent: "সারা বছরের যত্ন", packagesText: "বাসা ও অফিসের জন্য নির্ধারিত preventive visit-সহ বার্ষিক service package।",
    processKicker: "HOW IT WORKS", processTitle: "মাত্র", processAccent: "৪টি ধাপে", processTail: "সার্ভিস নিন", processText: "বুকিং থেকে কাজ সম্পন্ন—পুরো প্রক্রিয়া সহজ ও পরিষ্কার।",
    process: [["বুকিং দিন","ফর্মে নাম, ফোন, ঠিকানা ও সমস্যার বিবরণ দিন।"],["ফোনে নিশ্চিতকরণ","আমরা যোগাযোগ করে সময় ও visit charge নিশ্চিত করব।"],["Inspection ও quotation","সমস্যা দেখে কাজ শুরুর আগে মূল্য জানানো হবে।"],["কাজ সম্পন্ন","অনুমোদনের পর কাজ, payment receipt ও follow-up।"]],
    coverageTitle: "আপনার এলাকায় সার্ভিস প্রয়োজন?", coverageText: "মাইজদী, সোনাপুর, নোয়াখালী সদর ও কাছাকাছি এলাকায় বুকিং নিন। দূরের এলাকায় যাতায়াত চার্জ প্রযোজ্য হতে পারে।",
    contactKicker: "LET'S TALK", contactTitle: "আপনার কাজটি", contactAccent: "আমাদের জানান।", contactText: "কোন সার্ভিসটি লাগবে নিশ্চিত নন? ফোন করুন—আপনার প্রয়োজন অনুযায়ী সঠিক service বেছে নিতে সাহায্য করব।",
    formTitle: "সার্ভিস বুকিং", formText: "ফর্মটি পূরণ করুন, আমরা যোগাযোগ করব।"
  },
  ocean: {
    eyebrow: "FAST • VERIFIED • PROFESSIONAL HOME CARE",
    title: "Reliable experts for", accent: "every space you care for.",
    description: "Book trusted electrical, AC, plumbing, CCTV and IT professionals with clear estimates, convenient scheduling and dependable after-service support.",
    heroImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
    heroAlt: "Bright modern home interior", heroCaption: "Professional care, on demand", heroSub: "Home • Office • Facility",
    badgeOne: "Verified Professionals", badgeOneSub: "Identity and skills checked", badgeTwo: "Flexible Scheduling", badgeTwoSub: "Choose a convenient visit",
    proof: "Trusted people • Clear estimates • Quality service",
    location: "Maijdee • Sonapur • Noakhali", trust: "Clear estimate before work", support: "Residential & Business Care",
    servicesKicker: "EXPERT SOLUTIONS", servicesTitle: "Services built around", servicesAccent: "your needs", servicesText: "From urgent repairs to planned maintenance, find the right professional for your home or workplace.",
    teamKicker: "THE PEOPLE BEHIND THE SERVICE", teamTitle: "Skilled hands.", teamAccent: "Service you can trust.", teamText: "Our service team follows clear job instructions, verified identity checks and practical safety standards at every visit.",
    teamPoints: ["Verified technician profiles", "Job-specific safety practices", "Clear visit and work updates", "Service completion records"],
    teamImage: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1000&q=85", teamAlt: "Professional technician at work",
    businessKicker: "WORKPLACE SOLUTIONS", businessTitle: "Keep your workplace", businessAccent: "running without interruption.", businessText: "Planned IT, network, security and facility maintenance for offices, shops and growing teams—with scheduled visits and service history.",
    businessImage: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1100&q=85", businessAlt: "Contemporary business office",
    businessFeatures: [["IT & Network Support","Workstations, Wi-Fi and printers"],["Security Systems","CCTV, DVR and access control"],["Facility Care","Electrical, cooling and plumbing"]],
    packagesKicker: "MAINTENANCE MEMBERSHIPS", packagesTitle: "Stay ahead of repairs with", packagesAccent: "planned care", packagesText: "Choose a maintenance plan with scheduled preventive visits for your home or business.",
    processKicker: "SIMPLE SERVICE JOURNEY", processTitle: "A better service experience in", processAccent: "four steps", processTail: "", processText: "Know what happens next—from your first request to the completed job.",
    process: [["Send a request","Tell us what you need and where the service is required."],["Confirm your visit","Our team confirms availability and visit details."],["Review the estimate","A technician checks the issue and shares the work estimate."],["Get it done","Approve the work and receive completion updates." ]],
    coverageTitle: "Need a professional near you?", coverageText: "Book service in Maijdee, Sonapur, Noakhali Sadar and nearby areas. Travel charges may apply for locations farther away.",
    contactKicker: "TALK TO OUR TEAM", contactTitle: "Let's find the", contactAccent: "right solution.", contactText: "Not sure which service you need? Contact our team and we will help you choose the right solution.",
    formTitle: "Request a service visit", formText: "Share a few details and our team will get back to you."
  },
  emerald: {
    eyebrow: "আপনার পরিবারের নির্ভরতার সঙ্গী",
    title: "ঘরের যত্নে", accent: "বিশ্বস্ত মানুষ, নিশ্চিন্ত সমাধান।",
    description: "AC, electrical, plumbing, appliance ও home maintenance—যাচাইকৃত দক্ষ কর্মীর মাধ্যমে ঘরের প্রতিটি প্রয়োজনের যত্ন নিন।",
    heroImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85",
    heroAlt: "Warm and welcoming family living room", heroCaption: "আপনার ঘর, আমাদের যত্ন", heroSub: "Thoughtful Home Maintenance",
    badgeOne: "যাচাইকৃত কর্মী", badgeOneSub: "নিরাপদ ও দায়িত্বশীল সার্ভিস", badgeTwo: "সহজ সময় নির্বাচন", badgeTwoSub: "আপনার সুবিধামতো ভিজিট",
    proof: "পরিবারের আস্থা • যত্নশীল কাজ • পরিষ্কার হিসাব",
    location: "মাইজদী • সোনাপুর • নোয়াখালী", trust: "কাজের আগে খরচ জানুন", support: "Home Care & Maintenance",
    servicesKicker: "HOME CARE SERVICES", servicesTitle: "আপনার ঘরের জন্য", servicesAccent: "প্রয়োজনীয় যত্ন", servicesText: "নিয়মিত রক্ষণাবেক্ষণ কিংবা হঠাৎ কোনো সমস্যা—ঘরের জন্য দরকারি সেবা বেছে নিন।",
    teamKicker: "OUR CARE TEAM", teamTitle: "দক্ষ কর্মীর", teamAccent: "যত্নশীল সেবা", teamText: "প্রতিটি ভিজিটে পরিচ্ছন্নতা, সময়নিষ্ঠা ও নিরাপত্তাকে গুরুত্ব দিয়ে কাজ সম্পন্ন করা হয়।", 
    teamPoints: ["পরিচয় যাচাই করা কর্মী", "ঘরের জিনিসপত্রে যত্নশীল আচরণ", "কাজের আগে খরচ নিশ্চিতকরণ", "কাজ শেষে মান যাচাই"],
    teamImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=85", teamAlt: "Home maintenance professional",
    businessKicker: "OFFICE CARE", businessTitle: "আপনার কর্মস্থল থাকুক", businessAccent: "সচল ও সুরক্ষিত।", businessText: "অফিসের বিদ্যুৎ, শীতাতপ, নেটওয়ার্ক ও নিরাপত্তা ব্যবস্থার নিয়মিত যত্নে নিন পরিকল্পিত maintenance support।",
    businessImage: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1100&q=85", businessAlt: "Calm and organized office",
    businessFeatures: [["কম্পিউটার ও নেটওয়ার্ক","PC, printer ও Wi-Fi"],["নিরাপত্তা ব্যবস্থা","CCTV ও access control"],["অফিস রক্ষণাবেক্ষণ","AC, electrical ও plumbing"]],
    packagesKicker: "YEAR-ROUND HOME CARE", packagesTitle: "সারা বছর ঘরের", packagesAccent: "নিয়মিত যত্ন", packagesText: "পরিকল্পিত ভিজিটের মাধ্যমে ছোট সমস্যা বড় হওয়ার আগেই সমাধান করুন।",
    processKicker: "সহজ সার্ভিস প্রক্রিয়া", processTitle: "চারটি সহজ ধাপে", processAccent: "নিশ্চিন্ত সেবা", processTail: "", processText: "আপনার প্রয়োজন জানানো থেকে কাজ শেষ হওয়া পর্যন্ত প্রতিটি ধাপ সহজ ও স্বচ্ছ।",
    process: [["প্রয়োজন জানান","কোন কাজটি প্রয়োজন তা বুকিং ফর্মে লিখুন।"],["সময় ঠিক করুন","আমাদের টিম আপনার সঙ্গে কথা বলে সময় নিশ্চিত করবে।"],["খরচ বুঝে নিন","কাজ শুরুর আগে সমস্যা দেখে quotation দেওয়া হবে।"],["নিশ্চিন্তে সেবা নিন","অনুমোদনের পর কাজ শেষ করে আপডেট জানানো হবে।"]],
    coverageTitle: "আপনার এলাকাতেও কি সেবা পৌঁছাবে?", coverageText: "মাইজদী, সোনাপুর, নোয়াখালী সদর ও আশপাশের এলাকায় হোম সার্ভিস বুক করতে পারবেন।",
    contactKicker: "আমরা পাশে আছি", contactTitle: "ঘরের সমস্যার", contactAccent: "সমাধান খুঁজুন।", contactText: "কোন সার্ভিসটি প্রয়োজন বুঝতে সমস্যা হলে আমাদের সঙ্গে কথা বলুন। সঠিক সেবা বেছে নিতে সাহায্য করব।",
    formTitle: "হোম সার্ভিস বুকিং", formText: "আপনার তথ্য দিন, আমরা দ্রুত যোগাযোগ করব।"
  },
  sunset: {
    eyebrow: "PREMIUM HOME & OFFICE SERVICE",
    title: "Make your space", accent: "work beautifully again.",
    description: "Thoughtful repairs and premium maintenance for modern homes and workplaces. One booking connects you with skilled local service professionals.",
    heroImage: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85",
    heroAlt: "Premium contemporary home interior", heroCaption: "A more comfortable space starts here", heroSub: "Premium Home & Office Care",
    badgeOne: "Carefully Selected Team", badgeOneSub: "Professional service standards", badgeTwo: "Convenient Appointments", badgeTwoSub: "Service on your schedule",
    proof: "Thoughtful service • Upfront estimates • Lasting care",
    location: "Maijdee • Sonapur • Noakhali", trust: "Upfront estimate, no surprises", support: "Premium Residential & Office Care",
    servicesKicker: "CURATED SERVICES", servicesTitle: "The right expertise for", servicesAccent: "every detail", servicesText: "Explore dependable technical and maintenance services designed to keep your home and workplace at their best.",
    teamKicker: "SERVICE WITH CARE", teamTitle: "Professional people.", teamAccent: "Considered workmanship.", teamText: "Every visit is planned around clear communication, respectful service and careful attention to your property.",
    teamPoints: ["Verified service professionals", "Respectful in-home service", "Clear scope before work begins", "Completion and follow-up updates"],
    teamImage: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1000&q=85", teamAlt: "Professional home repair specialist",
    businessKicker: "BUSINESS MAINTENANCE", businessTitle: "A better standard of", businessAccent: "workplace maintenance.", businessText: "Keep your business comfortable, connected and secure with planned technical maintenance and responsive support.",
    businessImage: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1100&q=85", businessAlt: "Premium office interior",
    businessFeatures: [["Technology Care","Computer, network and printer"],["Security & Monitoring","CCTV and access systems"],["Property Maintenance","Cooling, electrical and plumbing"]],
    packagesKicker: "SIGNATURE CARE PLANS", packagesTitle: "Make maintenance", packagesAccent: "part of the plan", packagesText: "Thoughtful annual service packages with planned preventive visits for lasting peace of mind.",
    processKicker: "THE MU EXPERIENCE", processTitle: "Considered service,", processAccent: "made simple", processTail: "", processText: "A clear and comfortable process, with communication at every step.",
    process: [["Tell us what you need","Share your service request and preferred location."],["Arrange your visit","We will confirm the appointment and visit details."],["Approve the proposal","Review the inspection and transparent estimate."],["Enjoy the result","Our professional completes the approved work." ]],
    coverageTitle: "Exceptional care, closer to home.", coverageText: "Our service coverage includes Maijdee, Sonapur, Noakhali Sadar and nearby locations. Additional travel charges may apply.",
    contactKicker: "PERSONAL SERVICE, REAL PEOPLE", contactTitle: "Your space deserves", contactAccent: "the right care.", contactText: "Tell us what you would like to improve. Our team will guide you to the right service and next step.",
    formTitle: "Arrange a service visit", formText: "Leave your details and our team will contact you."
  }
};

export function HomePage({ services, packages }) {
  const navigate = useNavigate();
  const [themeId, setThemeId] = useState(() => document.documentElement.dataset.publicTheme || "classic");
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setThemeId(root.dataset.publicTheme || "classic"));
    observer.observe(root, { attributes: true, attributeFilter: ["data-public-theme"] });
    return () => observer.disconnect();
  }, []);
  const t = completePublicThemes[themeId] || completePublicThemes.classic;
  const book = (id) => navigate(`/book?service=${encodeURIComponent(id)}`);
  return (
    <main className={`public-home public-home-${themeId}`}>
      <section className="hero">
        <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> {t.eyebrow}</div>
            <h1>{t.title}<br/><span>{t.accent}</span></h1>
            <p className="hero-description">{t.description}</p>
            <div className="hero-actions"><Link to="/book" className="btn btn-lime">{themeId === "classic" || themeId === "emerald" ? "সার্ভিস বুক করুন" : "Book a Service"} <ArrowUpRight size={18}/></Link><a className="btn btn-ghost" href="#services">{themeId === "classic" || themeId === "emerald" ? "সার্ভিস দেখুন" : "Explore Services"} <ArrowDownRight size={17}/></a></div>
            <div className="hero-proof"><div className="proof-avatars"><span>MU</span><span>IT</span><span>+</span></div><div><div className="proof-stars"><Star/><Star/><Star/><Star/><Star/></div><p>{t.proof}</p></div></div>
          </div>
          <div className="hero-visual theme-hero-visual">
            <div className="hero-image-frame"><img src={t.heroImage} alt={t.heroAlt}/><div className="image-tint"/><div className="hero-image-caption"><span className="caption-icon"><Wrench size={21}/></span><div><b>{t.heroCaption}</b><small>{t.heroSub}</small></div><ArrowUpRight size={20}/></div></div>
            <div className="floating-card float-card-top"><span className="float-icon lime"><BadgeCheck/></span><div><b>{t.badgeOne}</b><small>{t.badgeOneSub}</small></div></div>
            <div className="floating-card float-card-bottom"><span className="float-icon blue"><Clock3/></span><div><b>{t.badgeTwo}</b><small>{t.badgeTwoSub}</small></div></div><div className="hero-ring"/>
          </div>
        </div>
        <div className="container hero-bottom"><span><MapPin size={16}/> {t.location}</span><span><ShieldCheck size={16}/> {t.trust}</span><span><Headphones size={16}/> {t.support}</span></div>
      </section>
      <section className="trust-strip"><div className="container trust-grid">
        {[[ShieldCheck,themeId === "ocean" ? "Upfront estimates" : "স্বচ্ছ মূল্য",themeId === "ocean" ? "Know the cost before work" : "কাজের আগে quotation"],[CalendarDays,themeId === "ocean" ? "Easy scheduling" : "সহজ বুকিং",themeId === "ocean" ? "Choose your preferred time" : "আপনার সুবিধামতো সময়"],[Wrench,themeId === "ocean" ? "Skilled professionals" : "বিভিন্ন সার্ভিস",themeId === "ocean" ? "Multiple services, one place" : "এক জায়গায় সমাধান"],[Building2,themeId === "ocean" ? "Home & workplace" : "বাসা ও অফিস",themeId === "ocean" ? "Residential and corporate" : "Residential & Corporate"]].map(([Icon,title,sub])=><div key={title}><span className="trust-icon"><Icon/></span><span><b>{title}</b><small>{sub}</small></span></div>)}
      </div></section>
      <section id="services" className="section section-services"><div className="container"><div className="section-heading"><div><span className="section-kicker">{t.servicesKicker}</span><h2>{t.servicesTitle} <span>{t.servicesAccent}</span></h2><p>{t.servicesText}</p></div><Link to="/book" className="btn btn-outline">{themeId === "classic" || themeId === "emerald" ? "সব সার্ভিস বুক করুন" : "Browse all services"} <ArrowRight size={16}/></Link></div><div className="services-grid">{services.map((s)=><ServiceCard key={s.id} service={s} onBook={book}/>)}</div><div className="section-footnote"><ShieldCheck size={16}/> {themeId === "ocean" || themeId === "sunset" ? "Displayed prices are starting estimates. Final quotations depend on parts, travel and the approved scope of work." : "প্রদর্শিত দাম প্রাথমিক starting price। যন্ত্রাংশ, যাতায়াত ও কাজের পরিধি অনুযায়ী চূড়ান্ত quotation দেওয়া হবে।"}</div></div></section>
      <section className="team-uniform-section theme-team-section"><div className="container uniform-grid"><div><span className="section-kicker">{t.teamKicker}</span><h2>{t.teamTitle} <span>{t.teamAccent}</span></h2><p>{t.teamText}</p><ul className="uniform-checks">{t.teamPoints.map((point)=><li key={point}>✓ {point}</li>)}</ul></div><div className="theme-team-photo"><img src={t.teamImage} alt={t.teamAlt}/><span className="uniform-tag">{themeId === "classic" || themeId === "emerald" ? "VERIFIED TECHNICIAN" : "VERIFIED SERVICE PROFESSIONAL"}</span></div></div></section>
      <section className="dark-promo theme-business-section"><div className="container promo-grid"><div><span className="section-kicker light-kicker">{t.businessKicker}</span><h2>{t.businessTitle}<br/><span>{t.businessAccent}</span></h2><p>{t.businessText}</p><Link to="/book?service=office-standard" className="btn btn-lime">{themeId === "classic" || themeId === "emerald" ? "Corporate quotation নিন" : "Request a business quote"} <ArrowUpRight size={17}/></Link></div><div className="promo-feature-list"><img className="theme-business-image" src={t.businessImage} alt={t.businessAlt}/>{t.businessFeatures.map(([title,sub],i)=><div key={title}>{i===0?<MonitorCog/>:i===1?<ShieldCheck/>:<Zap/>}<span><b>{title}</b><small>{sub}</small></span></div>)}</div></div></section>
      <section id="packages" className="section package-section"><div className="container"><div className="section-heading centered"><span className="section-kicker">{t.packagesKicker}</span><h2>{t.packagesTitle} <span>{t.packagesAccent}</span></h2><p>{t.packagesText}</p></div><div className="packages-grid">{packages.map((p)=><PackageCard key={p.id} item={p} onBook={book}/>)}</div><p className="package-terms"><ShieldCheck size={15}/> {themeId === "ocean" || themeId === "sunset" ? "Package visit limits and included services are subject to the stated terms. Parts and major repairs are charged separately." : "Package-এর visit limit, discount ও included service প্রযোজ্য শর্ত অনুযায়ী। Parts, consumables ও major repair আলাদা।"}</p></div></section>
      <section id="process" className="section process-section"><div className="container"><div className="section-heading centered"><span className="section-kicker">{t.processKicker}</span><h2>{t.processTitle} <span>{t.processAccent}</span> {t.processTail}</h2><p>{t.processText}</p></div><div className="process-grid">{t.process.map(([title,desc],i)=>{const Icon=[ClipboardList,Phone,Wrench,CheckCircle2][i];return <div className="process-step" key={title}><span className="step-number">0{i+1}</span><span className="step-icon"><Icon/></span><h3>{title}</h3><p>{desc}</p></div>;})}</div></div></section>
      <section className="coverage-section"><div className="container coverage-box"><div className="coverage-icon"><MapPin size={27}/></div><div><span className="section-kicker">SERVICE AREAS</span><h2>{t.coverageTitle}</h2><p>{t.coverageText}</p></div><Link to="/book" className="btn btn-primary">{themeId === "classic" || themeId === "emerald" ? "এখনই বুক করুন" : "Book your visit"} <ArrowRight size={16}/></Link></div></section>
      <section id="contact" className="section contact-section"><div className="container contact-grid"><div className="contact-copy"><span className="section-kicker">{t.contactKicker}</span><h2>{t.contactTitle}<br/><span>{t.contactAccent}</span></h2><p>{t.contactText}</p><a className="contact-method" href="tel:+8801683988686"><span><Phone/></span><div><small>কল করুন</small><b>01683-988686</b></div><ArrowUpRight/></a><a className="contact-method" href="https://wa.me/8801683988686" target="_blank" rel="noreferrer"><span className="whatsapp-icon"><MessageCircle/></span><div><small>WhatsApp</small><b>সরাসরি মেসেজ দিন</b></div><ArrowUpRight/></a><div className="contact-address"><MapPin size={17}/> মাইজদী, নোয়াখালী, বাংলাদেশ</div></div><div className="contact-form-card"><div className="form-card-heading"><div><h3>{t.formTitle}</h3><p>{t.formText}</p></div><span><CalendarDays/></span></div><BookingForm services={services} packages={packages} compact/></div></div></section>
    </main>
  );
}
