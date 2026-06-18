"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight, ShieldCheck, Mail, Phone, CheckCircle2, MessageSquare, Database, Users, Download, Lock } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const { locale, setLocale } = useI18n();

  // Basic Account Data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");

  // Verification State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");

  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  
  const [emailCodeSending, setEmailCodeSending] = useState(false);
  const [phoneCodeSending, setPhoneCodeSending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((response) => response.json())
      .then((providers) => setGoogleEnabled(Boolean(providers?.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  function formatRegisterError(message: string) {
    if (/password/i.test(message) && /12/.test(message)) {
      return locale === "ar"
        ? "كلمة المرور يجب أن تكون 12 حرفا على الأقل وتحتوي على حرف كبير وحرف صغير ورقم."
        : "Password must be at least 12 characters and include uppercase, lowercase, and a number.";
    }
    return message;
  }

  async function onRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    
    const payload = { name, email, password, tenantName };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        setError(formatRegisterError(data.error || (locale === "ar" ? "حدث خطأ غير متوقع بالخادم." : "Unexpected server error.")));
        setLoading(false);
        return;
      }

      await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false
      });

      setStep(2);
    } catch (err) {
      setError(locale === "ar" ? "حدث خطأ غير متوقع." : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmailCode() {
    setEmailCodeSending(true);
    // Simulate API call for sending OTP
    await new Promise(resolve => setTimeout(resolve, 1500));
    setEmailCodeSent(true);
    setEmailCodeSending(false);
  }

  async function handleSendPhoneCode() {
    if (!phoneNumber) {
      setError(locale === "ar" ? "يرجى إدخال رقم الهاتف أولاً." : "Please enter your phone number first.");
      return;
    }
    setError("");
    setPhoneCodeSending(true);
    // Simulate API call for sending OTP
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPhoneCodeSent(true);
    setPhoneCodeSending(false);
  }

  function handleVerificationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailCodeSent || !phoneCodeSent) {
      setError(locale === "ar" ? "يجب إرسال الرموز إلى بريدك ورقم هاتفك أولاً." : "You must send the codes to your email and phone first.");
      return;
    }
    if (!emailCode || !phoneCode) {
      setError(locale === "ar" ? "يرجى إدخال جميع رموز التحقق المطلوبة." : "Please enter all required verification codes.");
      return;
    }
    setError("");
    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1000);
  }

  function finishOnboarding() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-white dark:bg-slate-950 font-sans">
      
      {/* Left Panel - Branding */}
      <div className="relative hidden w-full md:flex md:w-5/12 lg:w-1/2 flex-col justify-between bg-[#1f2136] p-12 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-300 via-purple-300 to-transparent"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="ChatZi Logo" className="h-10" />
          </div>
        </div>
        
        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl lg:text-5xl font-black mb-6 leading-[1.2] text-white">
            {locale === "en" ? "Start our journey" : "نقطة انطلاق لرحلة نجاحك"}
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed font-medium">
            {locale === "en" 
              ? "Join ChatZi today and revolutionize the way you communicate with your customers. Experience the power of omnichannel AI to build better relationships."
              : "انضم إلى منصة ChatZi اليوم وطوّر طريقة تواصلك مع عملائك لتجربة استثنائية وبناء علاقات أفضل من خلال الذكاء الاصطناعي متعدد القنوات."}
          </p>
          
          <div className="mt-12 space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/10">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-bold text-lg">{locale === "ar" ? "بيئة آمنة" : "Secure Environment"}</h4>
                <p className="text-sm text-slate-400">{locale === "ar" ? "حماية متقدمة لبياناتك وبيانات عملائك." : "Advanced protection for your data."}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm text-white border border-white/10">
                <Database size={24} />
              </div>
              <div>
                <h4 className="font-bold text-lg">{locale === "ar" ? "قاعدة معرفة ذكية" : "Smart Knowledge Base"}</h4>
                <p className="text-sm text-slate-400">{locale === "ar" ? "تغذية فورية وفهم عميق لنشاطك التجاري." : "Instant feeding and deep understanding of your business."}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-slate-400 font-medium">
          © {new Date().getFullYear()} ChatZi. {locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </div>
      </div>
      
      {/* Right Panel - Content */}
      <div className="flex w-full flex-col justify-center px-6 py-12 md:w-7/12 lg:w-1/2 md:px-16 lg:px-24">
        
        {/* Language Switcher */}
        <div className="absolute top-6 right-6 md:right-10 flex gap-4 rtl:left-6 rtl:right-auto md:rtl:left-10">
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="text-xs font-semibold text-slate-600 border border-slate-200 dark:text-slate-300 dark:border-slate-800 rounded-full px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            {locale === "en" ? "العربية" : "English"}
          </button>
        </div>

        <div className="mx-auto w-full max-w-md xl:max-w-lg">
          
          {/* Progress Indicators */}
          <div className="mb-10 flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${step >= s ? "bg-[#b87cff] text-white shadow-md shadow-purple-500/20" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"}`}>
                  {s}
                </div>
                {s !== 3 && <div className={`h-1 w-12 sm:w-16 rounded-full transition-colors ${step > s ? "bg-[#b87cff]" : "bg-slate-100 dark:bg-slate-800"}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              <span className="mt-0.5 text-red-500">⚠</span>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* ----------------- STEP 1: REGISTRATION ----------------- */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {locale === "ar" ? "أهلاً بك في ChatZi" : "Welcome to ChatZi"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                {locale === "ar" ? "أدخل بيانات نشاطك للبدء معنا." : "Enter your business details to get started."}
              </p>

              {googleEnabled && (
                <>
                  <button
                    type="button"
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
                    {locale === "ar" ? "المتابعة باستخدام Google" : "Continue with Google"}
                  </button>
                  <div className="my-6 flex items-center gap-4">
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{locale === "ar" ? "أو" : "or"}</span>
                    <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  </div>
                </>
              )}

              <form onSubmit={onRegisterSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{locale === "ar" ? "الاسم الشخصي" : "Full Name"}</label>
                    <input 
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#b87cff] focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-white" 
                      name="name" value={name} onChange={e=>setName(e.target.value)} placeholder={locale === "ar" ? "محمد أحمد" : "John Doe"} required 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{locale === "ar" ? "اسم النشاط التجاري" : "Company Name"}</label>
                    <input 
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#b87cff] focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-white" 
                      name="tenantName" value={tenantName} onChange={e=>setTenantName(e.target.value)} placeholder={locale === "ar" ? "متجر السعادة" : "Acme Corp"} required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{locale === "ar" ? "البريد الإلكتروني" : "Email Address"}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" size={18} />
                    <input 
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 ltr:pl-11 rtl:pr-11 text-sm text-slate-900 focus:border-[#b87cff] focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-white" 
                      name="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="me@example.com" required 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{locale === "ar" ? "كلمة المرور" : "Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" size={18} />
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 ltr:pl-11 rtl:pr-11 text-sm text-slate-900 focus:border-[#b87cff] focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      name="password"
                      type="password"
                      value={password}
                      onChange={e=>setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      minLength={12}
                      pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,128}"
                      title={locale === "ar" ? "12 حرفا على الأقل مع حرف كبير وحرف صغير ورقم" : "At least 12 characters with uppercase, lowercase, and a number"}
                      required
                    />
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {locale === "ar" ? "يجب أن تكون 12 حرفا على الأقل (حرف كبير، صغير، رقم)." : "Must be at least 12 chars (uppercase, lowercase, number)."}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-start">
                      <input type="checkbox" required checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} className="peer sr-only" />
                      <div className="h-5 w-5 rounded border-2 border-slate-300 bg-white transition peer-checked:border-[#b87cff] peer-checked:bg-[#b87cff] peer-focus:ring-2 peer-focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-800"></div>
                      <CheckCircle2 size={16} className="absolute left-0.5 top-0.5 text-white opacity-0 transition peer-checked:opacity-100" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-300 select-none">
                      {locale === "ar" ? "أوافق على " : "I agree to the "}
                      <a href="/terms" className="text-[#b87cff] hover:underline" target="_blank" onClick={(e) => e.stopPropagation()}>{locale === "ar" ? "شروط الخدمة" : "Terms and Conditions"}</a>
                    </span>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-start">
                      <input type="checkbox" required checked={agreedPrivacy} onChange={(e) => setAgreedPrivacy(e.target.checked)} className="peer sr-only" />
                      <div className="h-5 w-5 rounded border-2 border-slate-300 bg-white transition peer-checked:border-[#b87cff] peer-checked:bg-[#b87cff] peer-focus:ring-2 peer-focus:ring-purple-500/20 dark:border-slate-600 dark:bg-slate-800"></div>
                      <CheckCircle2 size={16} className="absolute left-0.5 top-0.5 text-white opacity-0 transition peer-checked:opacity-100" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-300 select-none">
                      {locale === "ar" ? "أقر بموافقتي على " : "I agree to the "}
                      <a href="/privacy" className="text-[#b87cff] hover:underline" target="_blank" onClick={(e) => e.stopPropagation()}>{locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</a>
                    </span>
                  </label>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:hover:scale-100" 
                    disabled={!agreedTerms || !agreedPrivacy || loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : null}
                    {loading ? (locale === "ar" ? "جاري الإنشاء..." : "Creating...") : (locale === "ar" ? "إنشاء حساب ومتابعة" : "Create Account")}
                    {!loading && <ArrowRight size={18} className="rtl:rotate-180" />}
                  </button>
                </div>
              </form>
              
              <div className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                {locale === "ar" ? "لديك حساب بالفعل؟ " : "Already have an account? "}
                <a href="/login" className="font-bold text-[#b87cff] hover:underline transition">
                  {locale === "ar" ? "تسجيل الدخول" : "Log in"}
                </a>
              </div>
            </div>
          )}

          {/* ----------------- STEP 2: VERIFICATION ----------------- */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {locale === "ar" ? "تأكيد الحساب" : "Verify Account"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                {locale === "ar" ? "لحماية حسابك وتفعيله، يرجى تأكيد البريد الإلكتروني ورقم الهاتف الخاص بك." : "To protect and activate your account, please verify your email and phone number."}
              </p>

              <form onSubmit={handleVerificationSubmit} className="space-y-6">
                
                {/* Email Verification */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mb-4 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                      <Mail size={16} className="text-[#b87cff]" />
                      {locale === "ar" ? "تأكيد البريد الإلكتروني" : "Email Verification"}
                    </label>
                    <span className="text-xs font-semibold text-slate-500">{email}</span>
                  </div>
                  
                  <div className="flex gap-3">
                    <input 
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-[#b87cff] focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-100 disabled:text-slate-400 transition-all dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
                      placeholder="123456" 
                      value={emailCode}
                      onChange={e => setEmailCode(e.target.value)}
                      disabled={!emailCodeSent}
                      maxLength={6}
                    />
                    <button 
                      type="button"
                      onClick={handleSendEmailCode}
                      disabled={emailCodeSent || emailCodeSending}
                      className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {emailCodeSending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 
                       emailCodeSent ? (locale === "ar" ? "تم الإرسال" : "Sent") : 
                       (locale === "ar" ? "إرسال الرمز" : "Send Code")}
                    </button>
                  </div>
                </div>

                {/* Phone Verification */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                      <Phone size={16} className="text-[#b87cff]" />
                      {locale === "ar" ? "تأكيد رقم الهاتف" : "Phone Verification"}
                    </label>
                    <input 
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-[#b87cff] focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
                      placeholder="+201234567890" 
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      disabled={phoneCodeSent}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <input 
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-[#b87cff] focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:bg-slate-100 disabled:text-slate-400 transition-all dark:border-slate-700 dark:bg-slate-950 dark:text-white" 
                      placeholder="123456" 
                      value={phoneCode}
                      onChange={e => setPhoneCode(e.target.value)}
                      disabled={!phoneCodeSent}
                      maxLength={6}
                    />
                    <button 
                      type="button"
                      onClick={handleSendPhoneCode}
                      disabled={phoneCodeSent || phoneCodeSending || !phoneNumber}
                      className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {phoneCodeSending ? <Loader2 size={16} className="animate-spin mx-auto" /> : 
                       phoneCodeSent ? (locale === "ar" ? "تم الإرسال" : "Sent") : 
                       (locale === "ar" ? "إرسال الرمز" : "Send Code")}
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:hover:scale-100" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                    {loading ? (locale === "ar" ? "جاري التوثيق..." : "Verifying...") : (locale === "ar" ? "توثيق والمتابعة" : "Verify and Continue")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ----------------- STEP 3: NEXT STEPS & TEMPLATE ----------------- */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 size={32} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {locale === "ar" ? "اكتمل التسجيل بنجاح!" : "Registration Complete!"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                {locale === "ar" 
                  ? "حسابك جاهز الآن للاستخدام. لكي يبدأ الموظف الآلي (AI) في خدمة عملائك بأفضل شكل، اتبع الخطوات الثلاث التالية داخل لوحة التحكم:"
                  : "Your account is ready. For your AI agent to best serve your customers, follow these 3 steps in the dashboard:"}
              </p>

              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="flex mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{locale === "ar" ? "1. ربط القنوات" : "1. Connect Channels"}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{locale === "ar" ? "اربط صفحات التواصل مثل واتساب وفيسبوك." : "Link your WhatsApp, Facebook, or Instagram."}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                    <Database size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{locale === "ar" ? "2. إملاء قاعدة المعرفة" : "2. Fill Knowledge Base"}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{locale === "ar" ? "زوّد النظام بمعلومات شركتك ليتعلم منها ويرد بناءً عليها." : "Provide your company info so the AI can learn."}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex mt-0.5 h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{locale === "ar" ? "3. إنشاء الموظف الآلي" : "3. Create AI Agent"}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{locale === "ar" ? "خصص شخصية الموظف وأطلق العنان له ليقوم بالمبيعات والدعم." : "Customize the persona and unleash it for sales and support."}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-primary-300 bg-primary-50 p-6 text-center dark:border-primary-900/50 dark:bg-primary-900/10 mb-8">
                <p className="text-sm font-bold text-primary-900 dark:text-primary-300 mb-2">
                  {locale === "ar" ? "قالب المعرفة لسيناريو مثالي (ينصح به)" : "Ideal Knowledge Scenario Template"}
                </p>
                <p className="text-xs text-primary-700 dark:text-primary-400 mb-4 px-4">
                  {locale === "ar" ? "قم بتحميل هذا القالب (Excel)، واملأ بياناتك لاحقاً وارفعها إلى قاعدة المعرفة للحصول على أفضل دقة من الذكاء الاصطناعي." : "Download this template, fill it out later, and upload it to the knowledge base for maximum AI accuracy."}
                </p>
                <a 
                  href="/templates/ecommerce-template.xlsx" 
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-primary-500"
                >
                  <Download size={18} />
                  {locale === "ar" ? "تحميل التمبلت (Excel)" : "Download Template (Excel)"}
                </a>
              </div>

              <button 
                onClick={finishOnboarding}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-4 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100" 
              >
                {locale === "ar" ? "الدخول إلى لوحة التحكم" : "Go to Dashboard"}
                <ArrowRight size={18} className="rtl:rotate-180" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
