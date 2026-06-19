"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useState, Suspense, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { LoginForm } from "@/components/auth/login-form";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Languages,
  LockKeyhole,
  PlugZap,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Settings,
  MessageSquare,
  Database,
  Key,
  Cpu,
  History,
  User,
  Terminal,
  Activity,
  Globe,
  Play,
  X,
  Inbox,
  BarChart3,
  Search,
  Menu,
  Phone,
  Zap,
  Mail,
  CheckCircle2,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  LayoutDashboard,
  LogIn,
} from "lucide-react";
import { landingContent, type LandingLocale } from "@/lib/landing-content";

const iconMap = [Database, Cpu, MessageSquare, Terminal];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.09 } },
};

/* ─── Orbit animation keyframes ─────────────────────────────────────────── */
const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap');

  :root {
    --font-sans: 'Inter', 'Tajawal', system-ui, sans-serif;
  }
  .font-landing { font-family: var(--font-sans); }

  @keyframes blob-float {
    0%,100% { transform: translate(0, 0) scale(1); }
    33%      { transform: translate(45px, -55px) scale(1.07); }
    66%      { transform: translate(-30px, 28px) scale(0.94); }
  }
  @keyframes glow-pulse {
    0%,100% { opacity: 0.6; }
    50%      { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .blob { animation: blob-float 18s ease-in-out infinite; }
  .blob-d1 { animation-delay: 0s; }
  .blob-d2 { animation-delay: 4s; }
  .blob-d3 { animation-delay: 8s; }

  .shimmer-text {
    background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 30%, #a78bfa 50%, #8b5cf6 70%, #6366f1 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }
  .glass {
    background: rgba(255,255,255,0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.55);
  }
  .glass-dark {
    background: rgba(15,15,20,0.75);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .card-hover {
    transition: transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s ease;
  }
  .card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px -10px rgba(99,102,241,0.18);
  }
  .btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    box-shadow: 0 8px 24px -4px rgba(99,102,241,0.5), 0 1px 0 rgba(255,255,255,0.15) inset;
    transition: all 0.25s cubic-bezier(.22,1,.36,1);
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 32px -4px rgba(99,102,241,0.6), 0 1px 0 rgba(255,255,255,0.15) inset;
  }
  .btn-primary:active { transform: translateY(0); }

  .nav-link {
    position: relative;
    padding-bottom: 2px;
  }
  .nav-link::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0;
    width: 0; height: 2px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .nav-link:hover::after { width: 100%; }

  .section-badge {
    background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
    border: 1px solid rgba(99,102,241,0.2);
    color: #6366f1;
  }

  .hero-grid {
    background-image:
      linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, black 60%, transparent 100%);
  }

  .feature-card {
    background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(249,250,251,0.9));
    backdrop-filter: blur(12px);
    border: 1px solid rgba(226,232,240,0.8);
    transition: all 0.3s cubic-bezier(.22,1,.36,1);
  }
  .feature-card:hover {
    border-color: rgba(99,102,241,0.3);
    background: linear-gradient(135deg, #ffffff, rgba(238,242,255,0.9));
    box-shadow: 0 8px 30px -8px rgba(99,102,241,0.2);
  }

  .dark-hero {
    background: radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 70%),
                linear-gradient(180deg, #09090b 0%, #09090b 100%);
  }
`;

export function LandingPage({ locale, botId, isLoggedIn = false }: { locale: LandingLocale; botId?: string; isLoggedIn?: boolean }) {
  const copy = landingContent[locale];
  const isEnglish = locale === "en";
  const ArrowIcon = isEnglish ? ArrowRight : ArrowLeft;
  const ChevronIcon = isEnglish ? ChevronRight : ChevronLeft;

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [widgetOpen, setWidgetOpen] = useState(true);
  const [widgetMessages, setWidgetMessages] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    { sender: "bot", text: isEnglish ? "Hello! How can I help you today?" : "مرحباً! كيف يمكنني مساعدتك اليوم؟" },
    { sender: "user", text: isEnglish ? "What are your services?" : "ما هي الخدمات التي تقدمونها؟" },
    { sender: "bot", text: isEnglish ? "We provide automated AI support, multichannel integration, and custom AI agents!" : "نحن نقدم الدعم الآلي بالذكاء الاصطناعي، والربط متعدد القنوات، والوكلاء المخصصين!" },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const userMsg = newMessage;
    setWidgetMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setNewMessage("");
    setTimeout(() => {
      setWidgetMessages((prev) => [
        ...prev,
        { sender: "bot", text: isEnglish ? "This is a live demo widget simulating real AI replies!" : "هذا عنصر تجريبي حي يحاكي ردود الذكاء الاصطناعي!" },
      ]);
    }, 900);
  };

  return (
    <main
      dir={copy.dir}
      lang={copy.lang}
      className="font-landing relative min-h-screen bg-[#09090b] text-white selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden"
    >
      <style>{KEYFRAMES}</style>

      {/* ── AMBIENT BACKGROUND BLOBS ──────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="blob blob-d1 absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="blob blob-d2 absolute top-1/2 -left-60 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="blob blob-d3 absolute bottom-0 right-1/3 w-[500px] h-[500px] rounded-full bg-fuchsia-700/8 blur-[120px]" />
      </div>

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "glass-dark shadow-lg shadow-black/30"
            : "bg-transparent border-b border-white/5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href={isEnglish ? "/" : "/ar"} className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow overflow-hidden">
                <img src="/images/logo.png" alt="ChatZi" className="w-full h-full object-contain" />
              </div>
              <span className="font-extrabold text-[17px] tracking-tight text-white">Chat<span className="text-indigo-400">Zi</span></span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-8">
              {copy.nav.map((item, idx) => (
                <a
                  key={item}
                  href={`#section-${idx}`}
                  className="nav-link text-sm font-medium text-white/60 hover:text-white transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <Link
                href={isEnglish ? "/ar" : "/"}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white/80 px-3 py-1.5 rounded-lg hover:bg-white/8 transition-all"
              >
                <Languages size={13} />
                {isEnglish ? "العربية" : "English"}
              </Link>

              {isLoggedIn ? (
                /* ── مستخدم مسجل: زر لوحة التحكم ── */
                <Link
                  href="/dashboard"
                  className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
                >
                  <LayoutDashboard size={15} />
                  {isEnglish ? "Dashboard" : "لوحة التحكم"}
                </Link>
              ) : (
                /* ── زوار: تسجيل دخول + إنشاء حساب ── */
                <>
                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/8 transition-all"
                  >
                    <LogIn size={14} />
                    {copy.login}
                  </button>
                  <Link
                    href="/register"
                    className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  >
                    {isEnglish ? "Start free" : "ابدأ مجاناً"}
                    <Sparkles size={13} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 min-h-[92vh] flex items-center pt-20 pb-24 px-4 overflow-hidden">
        {/* Grid pattern */}
        <div className="hero-grid absolute inset-0 pointer-events-none" />

        {/* Radial glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full section-badge text-sm font-semibold">
              <Sparkles size={13} className="text-indigo-400" />
              <span>{copy.heroLabel}</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp}
              className="text-5xl sm:text-6xl lg:text-[76px] font-black text-white tracking-tight leading-[1.05] mb-6"
            >
              {copy.title.split(" ").slice(0, -2).join(" ")}{" "}
              <span className="shimmer-text">{copy.title.split(" ").slice(-2).join(" ")}</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              variants={fadeUp}
              className="mt-5 text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed font-medium"
            >
              {copy.subtitle}
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4"
            >
              {isLoggedIn ? (
                /* مستخدم مسجل */
                <Link
                  href="/dashboard"
                  className="btn-primary group w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2.5"
                >
                  <LayoutDashboard size={18} />
                  {isEnglish ? "Go to Dashboard" : "الذهاب للوحة التحكم"}
                  <ArrowIcon size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="btn-primary group w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2.5"
                  >
                    {copy.primary}
                    <ArrowIcon size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/book"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold text-white/70 hover:text-white border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={14} className="fill-current" />
                    {isEnglish ? "Book a demo" : "احجز عرضاً"}
                  </Link>
                </>
              )}
            </motion.div>

            {/* Trust badges */}
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-white/35 font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-indigo-400" />{isEnglish ? "No credit card required" : "لا حاجة لبطاقة ائتمان"}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-indigo-400" />{isEnglish ? "14-day free trial" : "تجربة مجانية 14 يوم"}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-indigo-400" />{isEnglish ? "Enterprise security" : "أمان مؤسسي"}</span>
            </motion.div>
          </motion.div>

          {/* ── DASHBOARD MOCKUP ── */}
          <motion.div
            initial={{ opacity: 0, y: 90 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 mx-auto w-full max-w-5xl relative"
            dir="ltr"
          >
            {/* Glow ring */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-indigo-500/40 via-violet-500/20 to-transparent blur-sm pointer-events-none" />
            <div className="absolute -inset-4 rounded-3xl bg-indigo-600/5 blur-2xl pointer-events-none" />

            <div className="relative bg-[#0f0f17] rounded-2xl border border-white/10 overflow-hidden flex h-[640px] shadow-2xl shadow-black/60">
              {/* Sidebar */}
              <aside className="w-[240px] bg-[#0c0c14] border-r border-white/[0.06] flex-col hidden md:flex">
                <div className="p-4 border-b border-white/[0.06] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                    <MessageSquare className="text-white w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-sm text-white/90">Workspace</span>
                </div>
                <div className="flex-1 overflow-y-auto py-3">
                  <div className="px-3 mb-1.5 text-[10px] font-bold text-white/25 uppercase tracking-widest">Main</div>
                  <nav className="px-2 space-y-0.5 mb-5">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                      <Inbox className="w-3.5 h-3.5" />Unified Inbox
                      <span className="ml-auto bg-indigo-500/20 text-indigo-300 py-0.5 px-2 rounded-full text-[10px] font-bold">12</span>
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5">
                      <BarChart3 className="w-3.5 h-3.5" />Analytics
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5">
                      <Settings className="w-3.5 h-3.5" />Settings
                    </button>
                  </nav>
                  <div className="px-3 mb-1.5 text-[10px] font-bold text-white/25 uppercase tracking-widest">Channels</div>
                  <nav className="px-2 space-y-0.5">
                    {[
                      { label: "WhatsApp API", color: "bg-green-400" },
                      { label: "Website Widget", color: "bg-blue-400" },
                      { label: "Instagram DM", color: "bg-pink-400" },
                    ].map(({ label, color }) => (
                      <div key={label} className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-white/40">
                        <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_8px_currentColor]`} />
                        {label}
                      </div>
                    ))}
                  </nav>
                </div>
                <div className="p-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow">AG</div>
                    <div>
                      <div className="text-xs font-bold text-white/80">Active Agent</div>
                      <div className="text-[10px] text-white/30 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400" />Online</div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* Main */}
              <main className="flex-1 flex flex-col bg-[#0f0f17] overflow-hidden">
                <header className="h-13 border-b border-white/[0.06] flex items-center justify-between px-4 py-3">
                  <h2 className="text-sm font-bold text-white/80">Unified Inbox</h2>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-white/20 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" placeholder="Search..." disabled className="pl-8 pr-4 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs w-52 outline-none placeholder-white/20 text-white/50" />
                  </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                  {/* Conversation list */}
                  <div className="w-[280px] border-r border-white/[0.06] flex flex-col">
                    <div className="p-2 flex gap-1 border-b border-white/[0.06]">
                      {["Open", "Snoozed", "Closed"].map((tab, i) => (
                        <button key={tab} className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${i === 0 ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20" : "text-white/30 hover:bg-white/5"}`}>{tab}</button>
                      ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      <div className="p-3 bg-white/5 border border-indigo-500/25 rounded-xl cursor-pointer relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-400 to-violet-400" />
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-xs font-bold text-white/90">Billing Inquiry</span>
                          <span className="text-[10px] text-white/30">Just now</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 bg-green-500/15 text-green-400 rounded-full font-bold">WhatsApp</span>
                          <span className="text-[10px] text-white/25">#4092</span>
                        </div>
                        <p className="text-[11px] text-white/40 truncate">Could you help me update my credit card info?</p>
                      </div>
                      {[
                        { title: "Sales Consultation", tag: "Widget", color: "blue", time: "2m ago", msg: "I'd like to request a demo." },
                        { title: "Technical Support", tag: "Instagram", color: "pink", time: "1h ago", msg: "The integration is working now, thanks!" },
                      ].map((c) => (
                        <div key={c.title} className="p-3 border border-transparent hover:bg-white/4 hover:border-white/8 rounded-xl cursor-pointer transition-all">
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-xs font-semibold text-white/60">{c.title}</span>
                            <span className="text-[10px] text-white/25">{c.time}</span>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 bg-white/8 text-white/40 rounded-full font-bold">{c.tag}</span>
                          <p className="text-[11px] text-white/30 truncate mt-1.5">{c.msg}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat detail */}
                  <div className="flex-1 flex flex-col">
                    <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400/20 to-violet-400/20 border border-white/10 flex items-center justify-center text-white/60 font-bold text-xs">C</div>
                        <div>
                          <div className="text-xs font-bold text-white/80">Customer #8829</div>
                          <div className="text-[10px] text-green-400 flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-green-400" />Online via WhatsApp</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-white/25 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors"><Phone className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 text-white/25 hover:text-white/60 hover:bg-white/5 rounded-lg transition-colors"><MoreVertical className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                      <div className="text-center"><span className="text-[10px] text-white/25 bg-white/5 px-3 py-1 rounded-full border border-white/8">Today, 10:42 AM</span></div>
                      <div className="flex gap-2.5 max-w-[80%]">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 mt-auto flex items-center justify-center text-[10px] font-bold text-white/40 border border-white/10">C</div>
                        <div className="bg-white/8 border border-white/8 text-white/70 rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs leading-relaxed">
                          Hi there! I'm trying to update my billing information but getting an error.
                        </div>
                      </div>
                      <div className="flex gap-2.5 max-w-[80%] self-end flex-row-reverse">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0 mt-auto flex items-center justify-center text-[10px] font-bold text-white shadow">AG</div>
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl rounded-br-none px-3.5 py-2.5 text-xs leading-relaxed shadow-lg shadow-indigo-500/20">
                          Hello! I'd be happy to help. Could you share the last 4 digits of the card?
                        </div>
                      </div>
                    </div>

                    <div className="p-3 border-t border-white/[0.06]">
                      <div className="bg-white/5 border border-white/8 rounded-xl flex flex-col focus-within:border-indigo-500/40 transition-all">
                        <textarea className="w-full bg-transparent p-3 text-xs outline-none resize-none placeholder-white/20 text-white/60" rows={2} placeholder="Type your message..." disabled />
                        <div className="flex items-center justify-between px-3 pb-2.5">
                          <div className="flex gap-1">
                            <button className="p-1.5 text-white/20 hover:text-white/50 hover:bg-white/5 rounded-lg transition-colors"><Paperclip className="w-3.5 h-3.5" /></button>
                            <button className="p-1.5 text-white/20 hover:text-white/50 hover:bg-white/5 rounded-lg transition-colors"><Smile className="w-3.5 h-3.5" /></button>
                          </div>
                          <button className="flex items-center gap-1.5 btn-primary text-white px-3.5 py-1.5 rounded-lg text-xs font-bold">
                            Send <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PROMO VIDEO ───────────────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16" dir="ltr">
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full lg:w-1/2"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/8">
                <div className="aspect-video w-full bg-[#0c0c14]">
                  <video src="/promo.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
              className="w-full lg:w-1/2"
              dir={isEnglish ? "ltr" : "rtl"}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full section-badge text-xs font-semibold mb-6">
                <Sparkles size={11} />{isEnglish ? "Platform Overview" : "نظرة عامة على المنصة"}
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.1] mb-5">
                {isEnglish ? (<>More than a chatbot.<br /><span className="shimmer-text">A smart employee.</span></>) : (<>أكثر من شات بوت،<br /><span className="shimmer-text">موظف ذكي يعمل 24/7.</span></>)}
              </h2>
              <p className="text-white/50 text-base leading-relaxed font-medium">
                {isEnglish
                  ? "Connect your website, Messenger, WhatsApp, and Telegram in one unified inbox. Train a customized AI for each client with isolated tenant data."
                  : "اربط موقعك وقنوات التواصل مثل ماسنجر وواتساب وتليجرام في منصة واحدة. وقم بتدريب ذكاء اصطناعي مخصص لكل عميل."}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="section-0" className="py-24 border-t border-white/[0.05]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-7xl mx-auto px-6 lg:px-8"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full section-badge text-xs font-semibold mb-5">
              <Cpu size={11} />{isEnglish ? "Features" : "المزايا"}
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">{copy.featuresTitle}</h2>
            <p className="mt-4 text-white/40 max-w-xl mx-auto font-medium">
              {isEnglish ? "Explore our advanced modular capabilities." : "اكتشف قدراتنا المتقدمة عبر هذه العروض التجريبية."}
            </p>
          </div>

          {/* Tab pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {copy.features.map(([title]: any, index) => {
              const Icon = iconMap[index] || Bot;
              return (
                <button
                  key={title}
                  onClick={() => setActiveTab(index)}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    activeTab === index
                      ? "btn-primary text-white"
                      : "text-white/40 bg-white/5 border border-white/8 hover:text-white/70 hover:bg-white/8"
                  }`}
                >
                  <Icon size={14} />{title}
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/3 p-6 lg:p-10 backdrop-blur-sm">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] items-center">
              <div className="space-y-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {(() => { const Icon = iconMap[activeTab] || Bot; return <Icon size={22} />; })()}
                </span>
                <div>
                  <h3 className="text-2xl font-bold text-white">{copy.features[activeTab][0]}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">{copy.features[activeTab][1]}</p>
                </div>
                <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition">
                  {isEnglish ? "Explore features" : "استكشف المزايا"} <ChevronIcon size={15} />
                </Link>
              </div>

              {/* Feature panels */}
              <div className="relative rounded-2xl border border-white/8 bg-[#0c0c14] p-4 min-h-[300px] flex items-center justify-center">
                {activeTab === 0 && (
                  <div className="w-full grid gap-3 sm:grid-cols-2">
                    {[
                      { name: "Acme Corp", id: "101", color: "indigo", chats: 12 },
                      { name: "Beta Health", id: "102", color: "emerald", chats: 4 },
                    ].map((t) => (
                      <div key={t.name} className="rounded-xl border border-white/8 bg-white/4 p-4">
                        <div className="flex items-center justify-between border-b border-white/8 pb-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full bg-${t.color}-400`} />
                            <span className="text-xs font-bold text-white/80">{t.name}</span>
                          </div>
                          <span className="text-[10px] text-white/30 font-mono">ID:{t.id}</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between bg-white/5 p-2 rounded-lg">
                            <span className="text-white/30">Open Chats:</span>
                            <span className={`font-bold text-${t.color}-400`}>{t.chats}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 1 && (
                  <div className="w-full space-y-2">
                    {[
                      { letter: "O", name: "GPT-4o (OpenAI)", key: "sk-proj-••••5x9a", active: true, color: "emerald" },
                      { letter: "A", name: "Claude 3.5 Sonnet", key: "sk-ant-••••2q9r", active: true, color: "orange" },
                      { letter: "G", name: "Gemini 1.5 Pro", key: "AIzaSy••••4w2c", active: false, color: "blue" },
                    ].map((m) => (
                      <div key={m.name} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/4 p-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-${m.color}-500/15 text-${m.color}-400 text-xs font-bold`}>{m.letter}</span>
                          <div>
                            <p className="text-xs font-bold text-white/80">{m.name}</p>
                            <p className="text-[10px] text-white/25 font-mono">{m.key}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/8 text-white/25"}`}>
                          {m.active ? (isEnglish ? "Active" : "نشط") : (isEnglish ? "Inactive" : "غير نشط")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 2 && (
                  <div className="w-full max-w-xs rounded-xl border border-white/8 bg-[#0f0f17] overflow-hidden flex flex-col h-[260px]">
                    <div className="bg-white/5 px-3 py-1.5 flex items-center justify-between border-b border-white/8">
                      <div className="flex gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500/70" /><span className="w-2 h-2 rounded-full bg-yellow-500/70" /><span className="w-2 h-2 rounded-full bg-green-500/70" /></div>
                      <span className="text-[10px] font-mono text-white/25">my-ecommerce.com</span>
                    </div>
                    <div className="flex-1 bg-[#0c0c14] p-3 flex flex-col justify-end gap-1.5 overflow-hidden">
                      {widgetMessages.slice(-3).map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[10px] ${msg.sender === "user" ? "bg-indigo-500 text-white" : "bg-white/10 text-white/60"}`}>{msg.text}</div>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSendMessage} className="border-t border-white/8 p-2 flex gap-1.5 bg-[#0f0f17]">
                      <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={isEnglish ? "Type a reply..." : "اكتب ردًا..."} className="flex-1 text-[10px] bg-white/5 border border-white/8 rounded-lg px-2 py-1 outline-none text-white/60 placeholder-white/20" />
                      <button type="submit" className="bg-indigo-500 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold">{isEnglish ? "Send" : "إرسال"}</button>
                    </form>
                  </div>
                )}
                {activeTab === 3 && (
                  <div className="w-full rounded-xl bg-[#050509] border border-white/8 p-4 font-mono text-[10px] space-y-1.5 overflow-hidden">
                    <div className="text-white/25 mb-3"># Webhook Logs — Live Feed</div>
                    {[
                      { status: "[POST]", color: "text-blue-400", msg: "Incoming WhatsApp message • 12:04:10" },
                      { status: "[200 OK]", color: "text-emerald-400", msg: "AI Reply Generated • 12:04:12" },
                      { status: "[200 OK]", color: "text-emerald-400", msg: "WhatsApp Template Sent • 12:04:13" },
                      { status: "[500 ERR]", color: "text-red-400", msg: "Messenger Send Failed • 12:03:52" },
                    ].map((log, i) => (
                      <div key={i} className="flex gap-2 hover:bg-white/3 px-1 py-0.5 rounded cursor-default">
                        <span className={`font-bold ${log.color} flex-shrink-0`}>{log.status}</span>
                        <span className="text-white/35">{log.msg}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CHANNELS ──────────────────────────────────────────────────────── */}
      <section id="section-1" className="py-24 border-t border-white/[0.05]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-7xl mx-auto px-6 lg:px-8 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full section-badge text-xs font-semibold mb-5">
              <PlugZap size={11} />{isEnglish ? "Integrations" : "التكاملات"}
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">{copy.channelsTitle}</h2>
            <p className="mt-4 text-white/45 leading-relaxed font-medium">
              {isEnglish
                ? "ChatZi features production-ready endpoints for all major messaging platforms."
                : "تتميز منصة ChatZi بوجود نقاط ربط برمجية جاهزة للإنتاج لجميع منصات المراسلة الكبرى."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {copy.channels.map((channel) => (
              <div key={channel} className="feature-card group flex items-center gap-4 rounded-2xl p-4 card-hover cursor-default">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 group-hover:bg-indigo-500/15 transition-colors">
                  <PlugZap size={18} />
                </span>
                <div>
                  <span className="block font-bold text-white/80 text-sm">{channel}</span>
                  <span className="block text-[10px] text-white/30 mt-0.5 font-medium">Natively Supported</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── SECURITY ──────────────────────────────────────────────────────── */}
      <section id="section-2" className="py-24 border-t border-white/[0.05] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center"
        >
          <div>
            <span className="inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-5">
              <LockKeyhole size={26} />
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">{copy.securityTitle}</h2>
          </div>
          <div className="space-y-5 text-white/50 leading-relaxed font-medium">
            <p>{copy.security}</p>
            <div className="grid gap-3 sm:grid-cols-2 mt-4">
              {[
                "Tenant-Scoped Database Filters",
                "AES Key Cryptography",
                "End-to-End Encryption",
                "Role-Based Access Control",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 bg-white/4 border border-white/8 rounded-xl p-3.5">
                  <ShieldCheck className="text-emerald-400 shrink-0" size={16} />
                  <span className="text-xs font-semibold text-white/60">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FAQ & PRICING ─────────────────────────────────────────────────── */}
      <section id="section-3" className="py-24 border-t border-white/[0.05]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-7xl mx-auto px-6 lg:px-8"
        >
          {/* Pricing banner */}
          <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/8 to-violet-500/8 p-8 md:p-12 text-center mb-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none" />
            <h2 className="text-4xl font-black text-white relative z-10">{copy.pricingTitle}</h2>
            <p className="mt-4 text-white/50 leading-relaxed text-base relative z-10 max-w-2xl mx-auto font-medium">{copy.pricing}</p>
          </div>

          {/* FAQ */}
          <div className="max-w-3xl mx-auto space-y-3">
            <h3 className="text-3xl font-black text-white text-center mb-8">{isEnglish ? "Frequently Asked Questions" : "الأسئلة الشائعة"}</h3>
            {copy.faq.map(([question, answer]: any, index) => {
              const open = openFaq === index;
              return (
                <div key={question} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden transition-all hover:border-white/14">
                  <button
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-right font-semibold text-white/75 hover:text-white transition-colors text-sm"
                  >
                    <span className="flex-1 pr-4">{question}</span>
                    {open ? <ChevronUp size={18} className="text-indigo-400 shrink-0" /> : <ChevronDown size={18} className="text-white/25 shrink-0" />}
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-64 border-t border-white/8" : "max-h-0"}`}>
                    <p className="p-5 text-sm leading-relaxed text-white/40 font-medium">{answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── CTA SECTION ───────────────────────────────────────────────────── */}
      <section className="relative py-28 overflow-hidden border-t border-white/[0.05]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-violet-600/15 to-fuchsia-600/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(99,102,241,0.12),transparent)] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 max-w-3xl mx-auto px-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full section-badge text-xs font-semibold mb-7">
            <Zap size={11} className="fill-indigo-400" />{isEnglish ? "Ready to start?" : "جاهز للبدء؟"}
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-5">
            {isEnglish ? "Automate support on every channel" : "أتمت الدعم على كل القنوات"}
          </h2>
          <p className="text-white/45 text-lg font-medium mb-10 max-w-xl mx-auto leading-relaxed">
            {isEnglish
              ? "Join thousands of businesses using ChatZi to manage customer relationships and drive sales."
              : "انضم لآلاف الشركات التي تستخدم شاتزي لإدارة علاقات العملاء وزيادة المبيعات."}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {isLoggedIn ? (
              <Link href="/dashboard" className="btn-primary group inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold text-white">
                <LayoutDashboard size={18} />
                {isEnglish ? "Go to Dashboard" : "الذهاب للوحة التحكم"}
                <ArrowIcon size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary group inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-bold text-white">
                  {copy.start}
                  <ArrowIcon size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-white/60 hover:text-white border border-white/10 hover:border-white/25 hover:bg-white/5 transition-all"
                >
                  <LogIn size={16} />{copy.login}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow overflow-hidden">
              <img src="/images/logo.png" alt="ChatZi" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-white/70">Chat<span className="text-indigo-400">Zi</span></span>
          </div>
          <p className="text-xs text-white/25 font-semibold">{copy.footer}</p>
          <div className="flex gap-5 text-xs text-white/25 font-semibold">
            <Link href="/privacy" className="hover:text-indigo-400 transition-colors">{isEnglish ? "Privacy" : "الخصوصية"}</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-indigo-400 transition-colors">{isEnglish ? "Terms" : "الشروط"}</Link>
            <span>·</span>
            <Link href="/data-deletion" className="hover:text-indigo-400 transition-colors">{isEnglish ? "Data Deletion" : "حذف البيانات"}</Link>
          </div>
        </div>
      </footer>

      {/* ── LOGIN MODAL ───────────────────────────────────────────────────── */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute top-4 right-4 z-50 text-white/40 hover:text-white transition p-2 bg-white/8 hover:bg-white/15 rounded-xl"
            >
              <X size={18} />
            </button>
            <Suspense fallback={<div className="text-center py-8 text-sm text-white/40">Loading...</div>}>
              <LoginForm />
            </Suspense>
          </motion.div>
        </div>
      )}

      {botId && <Script src="/widget.js" data-bot-id={botId} strategy="lazyOnload" />}
    </main>
  );
}
