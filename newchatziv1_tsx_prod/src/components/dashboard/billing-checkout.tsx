"use client";

import { useState } from "react";
import { CreditCard, ArrowUpCircle, ArrowDownCircle, CheckCircle2, Zap, ShieldCheck } from "lucide-react";
import useSWR from "swr";
import { useI18n } from "@/components/i18n-provider";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type BillingItem = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  interval?: string;
  aiMessageLimit?: number;
  messageCredits?: number;
  isPopular?: boolean;
};

const copy = {
  ar: {
    checkoutError: "تعذر بدء الدفع.",
    portalError: "تعذر فتح بوابة الدفع",
    credits: "الاستهلاك الحالي",
    manageLoading: "جاري التحويل...",
    manage: "إدارة اشتراكي",
    status: "الحالة",
    used: "المستخدم",
    available: "المتاح",
    plans: "باقات الاشتراك الذكية",
    packs: "باقات الرسائل الإضافية",
    emptyTitle: "لا توجد عناصر دفع متاحة حاليًا.",
    emptyDesc: "لن تظهر أي خطة أو باقة هنا إلا بعد إضافتها من الإدارة.",
    popular: "الأكثر طلباً",
    currentPlan: "باقتك الحالية",
    subscribe: "اشترك الآن",
    buyPack: "شراء الباقة",
    redirecting: "جاري التحويل...",
    month: "شهر",
    year: "سنة",
    aiReply: "رد ذكاء اصطناعي",
    extraMessage: "رسالة إضافية",
    upgrade: "ترقية الباقة",
    downgrade: "تخفيض الباقة",
    billingSetupError: "بوابة الدفع قيد التجهيز من قبل الإدارة.",
    features: {
      unlimitedAgents: "وكلاء دعم لا محدود",
      smartInbox: "صندوق وارد ذكي",
      dashboard: "لوحة تحكم وتحليلات",
      fastSupport: "دعم فني مخصص",
    }
  },
  en: {
    checkoutError: "Unable to start checkout.",
    portalError: "Unable to open billing portal",
    credits: "Current Usage",
    manageLoading: "Redirecting...",
    manage: "Manage Subscription",
    status: "Status",
    used: "Used",
    available: "Available",
    plans: "Smart Subscription Plans",
    packs: "Extra Message Packs",
    emptyTitle: "No billing items are available right now.",
    emptyDesc: "Plans and packs will appear here after an admin adds them.",
    popular: "Most Popular",
    currentPlan: "Current Plan",
    subscribe: "Subscribe Now",
    buyPack: "Buy Pack",
    redirecting: "Redirecting...",
    month: "month",
    year: "year",
    aiReply: "AI replies",
    extraMessage: "extra messages",
    upgrade: "Upgrade Plan",
    downgrade: "Downgrade Plan",
    billingSetupError: "Payment gateway is currently being set up.",
    features: {
      unlimitedAgents: "Unlimited support agents",
      smartInbox: "Smart unified inbox",
      dashboard: "Analytics dashboard",
      fastSupport: "Priority support",
    }
  }
} as const;

export function BillingCheckout({
  plans,
  packs,
  subscription
}: {
  plans: BillingItem[];
  packs: BillingItem[];
  subscription: null | {
    status: string;
    monthlyMessageLimit: number;
    usedMessages: number;
    extraMessageCredits: number;
    planName?: string;
    planPriceCents?: number;
  };
}) {
  const { locale } = useI18n();
  const labels = copy[locale];
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");

  const { data: realTimeStatus } = useSWR('/api/billing/status', fetcher, { refreshInterval: 5000 });
  const activeStatus = realTimeStatus || subscription;

  const displayError = error.includes("STRIPE_SECRET_KEY") ? labels.billingSetupError : error;

  async function checkout(kind: "plan" | "pack", itemId: string) {
    setError("");
    setLoading(`${kind}-${itemId}`);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, itemId })
    });
    const body = await response.json();
    setLoading("");
    if (!response.ok || !body.url) {
      setError(body.error || labels.checkoutError);
      return;
    }
    window.location.href = body.url;
  }

  async function manageSubscription() {
    setError("");
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.url) throw new Error(body.error || labels.portalError);
      window.location.href = body.url;
    } catch (e: any) {
      setError(e.message);
      setLoading("");
    }
  }

  return (
    <div className="space-y-8">
      {displayError ? <p className="callout-error shadow-sm">{displayError}</p> : null}
      
      {/* Usage Overview */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ink">{labels.credits}</h2>
              {subscription?.planName ? (
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  {locale === "ar" ? "مشترك في باقة:" : "Subscribed to:"} <span className="text-primary-600 dark:text-primary-400">{subscription.planName}</span>
                </p>
              ) : null}
            </div>
          </div>
          {subscription?.planName && subscription.planName.toLowerCase() !== "free" && subscription.planName.toLowerCase() !== "الخطة المجانية" ? (
            <button onClick={manageSubscription} disabled={loading === "portal"} className="btn-secondary rounded-xl font-medium shadow-sm">
              {loading === "portal" ? labels.manageLoading : labels.manage}
            </button>
          ) : null}
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-3">
          <Stat label={labels.status} value={activeStatus?.status || "inactive"} highlight={activeStatus?.status === "active"} />
          <Stat label={labels.used} value={String(activeStatus?.usedMessages || 0)} />
          <Stat label={labels.available} value={String((activeStatus?.monthlyMessageLimit || 0) + (activeStatus?.extraMessageCredits || 0))} />
        </div>
      </section>

      {/* Plans & Packs */}
      <Catalog title={labels.plans} labels={labels} items={plans.filter((item) => item.isActive)} kind="plan" loading={loading} checkout={checkout} currentPlanName={subscription?.planName} currentPlanPriceCents={subscription?.planPriceCents} />
      
      {packs.filter((item) => item.isActive).length > 0 && (
        <Catalog title={labels.packs} labels={labels} items={packs.filter((item) => item.isActive)} kind="pack" loading={loading} checkout={checkout} />
      )}
    </div>
  );
}

function Catalog({
  title,
  labels,
  items,
  kind,
  loading,
  checkout,
  currentPlanName,
  currentPlanPriceCents
}: {
  title: string;
  labels: typeof copy.ar | typeof copy.en;
  items: BillingItem[];
  kind: "plan" | "pack";
  loading: string;
  checkout: (kind: "plan" | "pack", itemId: string) => void;
  currentPlanName?: string;
  currentPlanPriceCents?: number;
}) {
  return (
    <section>
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-2xl font-black tracking-tight text-ink">{title}</h2>
      </div>
      
      <div className={`grid gap-6 md:grid-cols-2 ${kind === "pack" ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        {!items.length ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <p className="text-lg font-semibold text-ink">{labels.emptyTitle}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{labels.emptyDesc}</p>
          </div>
        ) : null}
        
        {items.map((item) => {
          const isCurrentPlan = kind === "plan" && currentPlanName === item.name;
          const isUpgrade = kind === "plan" && currentPlanPriceCents !== undefined && item.priceCents > currentPlanPriceCents;
          const isDowngrade = kind === "plan" && currentPlanPriceCents !== undefined && item.priceCents < currentPlanPriceCents;

          return (
            <article 
              key={item.id} 
              className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:bg-slate-900 ${
                isCurrentPlan 
                  ? "border-primary-500 shadow-lg shadow-primary-500/20 ring-1 ring-primary-500" 
                  : item.isPopular 
                    ? "border-violet-500 shadow-md shadow-violet-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-800"
              }`}
            >
              {/* Popular Badge */}
              {item.isPopular && !isCurrentPlan && (
                <div className="absolute top-0 right-0 rounded-bl-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm">
                  {labels.popular}
                </div>
              )}
              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute top-0 right-0 rounded-bl-xl bg-primary-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm">
                  {labels.currentPlan}
                </div>
              )}

              <h3 className="text-xl font-bold text-ink">{item.name}</h3>
              
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter text-ink">
                  {(item.priceCents / 100).toFixed(2)}
                </span>
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {item.currency}
                </span>
              </div>
              
              {kind === "plan" && (
                <p className="mt-1 text-sm text-slate-500">
                  / {item.interval === "year" ? labels.year : labels.month}
                </p>
              )}

              {/* Features List */}
              <ul className="mt-8 mb-8 flex-1 space-y-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <span>
                    <strong className="font-bold text-ink">{item.aiMessageLimit || item.messageCredits || 0}</strong> {kind === "plan" ? labels.aiReply : labels.extraMessage}
                  </span>
                </li>
                {kind === "plan" && (
                  <>
                    <li className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 size={16} />
                      </div>
                      <span>{labels.features.unlimitedAgents}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 size={16} />
                      </div>
                      <span>{labels.features.smartInbox}</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle2 size={16} />
                      </div>
                      <span>{labels.features.dashboard}</span>
                    </li>
                  </>
                )}
              </ul>

              {/* Action Button */}
              {isCurrentPlan ? (
                <button className="mt-auto w-full cursor-default rounded-xl bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-400 dark:bg-slate-800 dark:text-slate-500" disabled>
                  {labels.currentPlan}
                </button>
              ) : (
                <button 
                  className={`mt-auto w-full rounded-xl px-4 py-3.5 text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                    isUpgrade 
                      ? "bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:from-primary-700 hover:to-indigo-700 hover:shadow-md" 
                      : item.isPopular && kind === "plan"
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-md"
                        : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  }`} 
                  onClick={() => checkout(kind, item.id)} 
                  disabled={loading === `${kind}-${item.id}`}
                >
                  {kind === "plan" ? (
                    isUpgrade ? <ArrowUpCircle size={18} /> : isDowngrade ? <ArrowDownCircle size={18} /> : <Zap size={18} />
                  ) : (
                    <CreditCard size={18} />
                  )}
                  
                  {loading === `${kind}-${item.id}` 
                    ? labels.redirecting 
                    : kind === "plan" 
                      ? (isUpgrade ? labels.upgrade : isDowngrade ? labels.downgrade : labels.subscribe) 
                      : labels.buyPack}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60 transition hover:border-slate-200 dark:hover:border-slate-700">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${highlight ? "text-emerald-600 dark:text-emerald-400" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
