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


export function HomePage({ services, packages }) {
  const navigate = useNavigate();
  const book = (id) => navigate(`/book?service=${encodeURIComponent(id)}`);
  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" /> মাইজদী ও নোয়াখালীতে হোম সার্ভিস
              </div>
              <h1>
                আপনার বাসা ও অফিসের
                <br />
                <span>সব সার্ভিস, এক জায়গায়।</span>
              </h1>
              <p className="hero-description">
                Electrical, CCTV, Computer, AC, Plumbing থেকে শুরু করে দৈনন্দিন
                maintenance—বিশ্বস্ত টেকনিশিয়ান বুক করুন সহজেই।
              </p>
              <div className="hero-actions">
                <Link to="/book" className="btn btn-lime">
                  সার্ভিস বুক করুন <ArrowUpRight size={18} />
                </Link>
                <a className="btn btn-ghost" href="#services">
                  সার্ভিস দেখুন <ArrowDownRight size={17} />
                </a>
              </div>
              <div className="hero-proof">
                <div className="proof-avatars">
                  <span>MU</span>
                  <span>IT</span>
                  <span>+</span>
                </div>
                <div>
                  <div className="proof-stars">
                    <Star />
                    <Star />
                    <Star />
                    <Star />
                    <Star />
                  </div>
                  <p>দ্রুত বুকিং • স্বচ্ছ quotation • নির্ভরযোগ্য সাপোর্ট</p>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-image-frame">
                <img
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1100&q=85"
                  alt="Home service professional working"
                />
                <div className="image-tint" />
                <div className="hero-image-caption">
                  <span className="caption-icon">
                    <Wrench size={21} />
                  </span>
                  <div>
                    <b>এক কলেই সমাধান</b>
                    <small>Home & Office Technical Care</small>
                  </div>
                  <ArrowUpRight size={20} />
                </div>
              </div>
              <div className="floating-card float-card-top">
                <span className="float-icon lime">
                  <BadgeCheck />
                </span>
                <div>
                  <b>Verified Technicians</b>
                  <small>কাজের আগে details confirm</small>
                </div>
              </div>
              <div className="floating-card float-card-bottom">
                <span className="float-icon blue">
                  <Clock3 />
                </span>
                <div>
                  <b>Easy Booking</b>
                  <small>আপনার সুবিধামতো সময়</small>
                </div>
              </div>
              <div className="hero-ring" />
            </div>
          </div>
          <div className="container hero-bottom">
            <span>
              <MapPin size={16} /> মাইজদী • সোনাপুর • নোয়াখালী
            </span>
            <span>
              <ShieldCheck size={16} /> আগে quotation, পরে কাজ
            </span>
            <span>
              <Headphones size={16} /> Home & Corporate Support
            </span>
          </div>
        </section>
        <section className="trust-strip">
          <div className="container trust-grid">
            <div>
              <span className="trust-icon">
                <ShieldCheck />
              </span>
              <span>
                <b>স্বচ্ছ মূল্য</b>
                <small>কাজের আগে quotation</small>
              </span>
            </div>
            <div>
              <span className="trust-icon">
                <CalendarDays />
              </span>
              <span>
                <b>সহজ বুকিং</b>
                <small>আপনার সুবিধামতো সময়</small>
              </span>
            </div>
            <div>
              <span className="trust-icon">
                <Wrench />
              </span>
              <span>
                <b>বিভিন্ন সার্ভিস</b>
                <small>এক জায়গায় সমাধান</small>
              </span>
            </div>
            <div>
              <span className="trust-icon">
                <Building2 />
              </span>
              <span>
                <b>বাসা ও অফিস</b>
                <small>Residential & Corporate</small>
              </span>
            </div>
          </div>
        </section>
        <section id="services" className="section section-services">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="section-kicker">OUR SERVICES</span>
                <h2>
                  আপনার প্রয়োজনীয় <span>সার্ভিসসমূহ</span>
                </h2>
                <p>
                  ছোটখাটো মেরামত থেকে অফিসের নিয়মিত maintenance—আপনার কাজের জন্য
                  উপযুক্ত service বেছে নিন।
                </p>
              </div>
              <Link to="/book" className="btn btn-outline">
                সব সার্ভিস বুক করুন <ArrowRight size={16} />
              </Link>
            </div>
            <div className="services-grid">
              {services.map((s) => (
                <ServiceCard key={s.id} service={s} onBook={book} />
              ))}
            </div>
            <div className="section-footnote">
              <ShieldCheck size={16} /> প্রদর্শিত দাম প্রাথমিক starting price।
              যন্ত্রাংশ, যাতায়াত ও কাজের পরিধি অনুযায়ী চূড়ান্ত quotation দেওয়া
              হবে।
            </div>
          </div>
        </section>
        <section className="team-uniform-section">
          <div className="container uniform-grid">
            <div>
              <span className="section-kicker">OUR VERIFIED TEAM</span>
              <h2>
                পরিচ্ছন্ন ইউনিফর্মে <span>MU Home Service টিম</span>
              </h2>
              <p>
                প্রতিটি টেকনিশিয়ানের ইউনিফর্মে থাকবে কোম্পানির নাম ও লোগো,
                দৃশ্যমান আইডি কার্ড এবং কাজ অনুযায়ী প্রয়োজনীয় safety gear।
                বুকিংয়ের আগে টিমের পরিচয় নিশ্চিত করুন।
              </p>
              <ul className="uniform-checks">
                <li>✓ বুকে MU Home Service লোগো</li>
                <li>✓ পিঠে বড় করে কোম্পানির নাম</li>
                <li>✓ Technician ID ও job assignment</li>
                <li>✓ কাজ অনুযায়ী safety equipment</li>
              </ul>
            </div>
            <div className="uniform-visual">
              <div className="uniform-shirt">
                <div className="shirt-collar" />
                <div className="shirt-logo">
                  <span className="mini-brand-mark">⌂</span>
                  <b>MU</b>
                  <small>HOME SERVICE</small>
                </div>
                <div className="shirt-pocket" />
                <div className="shirt-name">MU HOME SERVICE</div>
              </div>
              <span className="uniform-tag">VERIFIED TECHNICIAN</span>
            </div>
          </div>
        </section>
        <section className="dark-promo">
          <div className="container promo-grid">
            <div>
              <span className="section-kicker light-kicker">FOR BUSINESS</span>
              <h2>
                আপনার অফিসের সব maintenance
                <br />
                <span>একটি নির্ভরযোগ্য টিমের হাতে।</span>
              </h2>
              <p>
                Computer, printer, CCTV, network, electrical ও AC maintenance-এর
                জন্য annual contract নিন। নিয়মিত check-up এবং service report
                রাখুন এক জায়গায়।
              </p>
              <Link to="/book?service=office-standard" className="btn btn-lime">
                Corporate quotation নিন <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="promo-feature-list">
              <div>
                <MonitorCog />
                <span>
                  <b>IT & Networking</b>
                  <small>Computer, printer, Wi-Fi, LAN</small>
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  <b>CCTV & Access Control</b>
                  <small>Security, DVR, attendance</small>
                </span>
              </div>
              <div>
                <Zap />
                <span>
                  <b>Facility Maintenance</b>
                  <small>Electrical, AC, plumbing</small>
                </span>
              </div>
            </div>
          </div>
        </section>
        <section id="packages" className="section package-section">
          <div className="container">
            <div className="section-heading centered">
              <span className="section-kicker">CARE PLANS</span>
              <h2>
                একবার নয়, <span>সারা বছরের যত্ন</span>
              </h2>
              <p>
                বাসা ও অফিসের জন্য নির্ধারিত preventive visit-সহ বার্ষিক service
                package।
              </p>
            </div>
            <div className="packages-grid">
              {packages.map((p) => (
                <PackageCard key={p.id} item={p} onBook={book} />
              ))}
            </div>
            <p className="package-terms">
              <ShieldCheck size={15} /> Package-এর visit limit, discount ও
              included service প্রযোজ্য শর্ত অনুযায়ী। Parts, consumables ও major
              repair আলাদা।
            </p>
          </div>
        </section>
        <section id="process" className="section process-section">
          <div className="container">
            <div className="section-heading centered">
              <span className="section-kicker">HOW IT WORKS</span>
              <h2>
                মাত্র <span>৪টি ধাপে</span> সার্ভিস নিন
              </h2>
              <p>বুকিং থেকে কাজ সম্পন্ন—পুরো প্রক্রিয়া সহজ ও পরিষ্কার।</p>
            </div>
            <div className="process-grid">
              <div className="process-step">
                <span className="step-number">01</span>
                <span className="step-icon">
                  <ClipboardList />
                </span>
                <h3>বুকিং দিন</h3>
                <p>ফর্মে নাম, ফোন, ঠিকানা ও সমস্যার বিবরণ দিন।</p>
              </div>
              <div className="process-step">
                <span className="step-number">02</span>
                <span className="step-icon">
                  <Phone />
                </span>
                <h3>ফোনে নিশ্চিতকরণ</h3>
                <p>আমরা যোগাযোগ করে সময় ও visit charge নিশ্চিত করব।</p>
              </div>
              <div className="process-step">
                <span className="step-number">03</span>
                <span className="step-icon">
                  <Wrench />
                </span>
                <h3>Inspection ও quotation</h3>
                <p>সমস্যা দেখে কাজ শুরুর আগে মূল্য জানানো হবে।</p>
              </div>
              <div className="process-step">
                <span className="step-number">04</span>
                <span className="step-icon">
                  <CheckCircle2 />
                </span>
                <h3>কাজ সম্পন্ন</h3>
                <p>অনুমোদনের পর কাজ, payment receipt ও follow-up।</p>
              </div>
            </div>
          </div>
        </section>
        <section className="coverage-section">
          <div className="container coverage-box">
            <div className="coverage-icon">
              <MapPin size={27} />
            </div>
            <div>
              <span className="section-kicker">SERVICE AREAS</span>
              <h2>আপনার এলাকায় সার্ভিস প্রয়োজন?</h2>
              <p>
                মাইজদী, সোনাপুর, নোয়াখালী সদর ও কাছাকাছি এলাকায় বুকিং নিন। দূরের
                এলাকায় যাতায়াত চার্জ প্রযোজ্য হতে পারে।
              </p>
            </div>
            <Link to="/book" className="btn btn-primary">
              এখনই বুক করুন <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section id="contact" className="section contact-section">
          <div className="container contact-grid">
            <div className="contact-copy">
              <span className="section-kicker">LET'S TALK</span>
              <h2>
                আপনার কাজটি
                <br />
                <span>আমাদের জানান।</span>
              </h2>
              <p>
                কোন সার্ভিসটি লাগবে নিশ্চিত নন? ফোন করুন—আপনার প্রয়োজন অনুযায়ী
                সঠিক service বেছে নিতে সাহায্য করব।
              </p>
              <a className="contact-method" href="tel:+8801683988686">
                <span>
                  <Phone />
                </span>
                <div>
                  <small>কল করুন</small>
                  <b>01683-988686</b>
                </div>
                <ArrowUpRight />
              </a>
              <a
                className="contact-method"
                href="https://wa.me/8801683988686"
                target="_blank"
                rel="noreferrer"
              >
                <span className="whatsapp-icon">
                  <MessageCircle />
                </span>
                <div>
                  <small>WhatsApp</small>
                  <b>সরাসরি মেসেজ দিন</b>
                </div>
                <ArrowUpRight />
              </a>
              <div className="contact-address">
                <MapPin size={17} /> মাইজদী, নোয়াখালী, বাংলাদেশ
              </div>
            </div>
            <div className="contact-form-card">
              <div className="form-card-heading">
                <div>
                  <h3>সার্ভিস বুকিং</h3>
                  <p>ফর্মটি পূরণ করুন, আমরা যোগাযোগ করব।</p>
                </div>
                <span>
                  <CalendarDays />
                </span>
              </div>
              <BookingForm services={services} packages={packages} compact />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
