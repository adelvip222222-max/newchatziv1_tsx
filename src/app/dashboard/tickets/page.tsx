import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, PlusCircle, TicketCheck } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getTicketsPage } from "@/lib/dashboard-data";
import { PageHeader } from "@/components/dashboard/page-header";

const statusLabels: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد التنفيذ",
  pending: "قيد المتابعة",
  resolved: "تم الحل",
  closed: "مغلقة",
};

const priorityLabels: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};

const categoryLabels: Record<string, string> = {
  technical_support: "دعم فني",
  complaint: "شكوى",
  human_request: "طلب موظف",
  booking_request: "طلب حجز",
  sales_request: "طلب مبيعات",
  ai_failed: "فشل AI",
  general: "عام",
};

function statusClass(status: string) {
  if (status === "open") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (status === "in_progress") return "bg-indigo-50 text-indigo-700 ring-indigo-100";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "resolved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function priorityClass(priority: string) {
  if (priority === "urgent") return "bg-red-50 text-red-700";
  if (priority === "high") return "bg-orange-50 text-orange-700";
  if (priority === "medium") return "bg-violet-50 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

function pageHref(page: number, searchParams: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.category) params.set("category", searchParams.category);
  if (searchParams.q) params.set("q", searchParams.q);
  return `/dashboard/tickets?${params.toString()}`;
}

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; category?: string; q?: string }> }) {
  const session = await requireSession();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1"));
  const data = await getTicketsPage(session.user.tenantId, {
    page,
    limit: 15,
    status: params.status,
    category: params.category,
    q: params.q,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="التذاكر"
        description="لوحة متابعة طلبات العملاء حسب نية المحادثة: حجز، مبيعات، دعم، شكاوى أو طلب موظف."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <article className="panel bg-gradient-to-br from-blue-50 to-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <TicketCheck size={20} />
          </div>
          <p className="text-sm text-slate-500">تذاكر مفتوحة</p>
          <p className="mt-1 text-3xl font-bold text-ink">{data.stats.openCount}</p>
        </article>
        <article className="panel bg-gradient-to-br from-rose-50 to-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
            <PlusCircle size={20} />
          </div>
          <p className="text-sm text-slate-500">جديدة اليوم</p>
          <p className="mt-1 text-3xl font-bold text-ink">{data.stats.newCount}</p>
        </article>
        <article className="panel bg-gradient-to-br from-amber-50 to-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Clock3 size={20} />
          </div>
          <p className="text-sm text-slate-500">قيد المتابعة</p>
          <p className="mt-1 text-3xl font-bold text-ink">{data.stats.pendingCount}</p>
        </article>
        <article className="panel bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-sm text-slate-500">تم حلها</p>
          <p className="mt-1 text-3xl font-bold text-ink">{data.stats.resolvedCount}</p>
        </article>
      </section>

      <section className="panel overflow-hidden">
        {data.tickets.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3 text-right">رقم</th>
                  <th className="p-3 text-right">الموضوع</th>
                  <th className="p-3 text-right">العميل</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الأولوية</th>
                  <th className="p-3 text-right">النوع</th>
                  <th className="p-3 text-right">آخر تحديث</th>
                  <th className="p-3 text-right">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-t border-slate-100 align-top">
                    <td className="p-3 font-semibold text-ink">#{ticket.number}</td>
                    <td className="max-w-sm p-3">
                      <Link href={`/dashboard/tickets/${ticket.id}`} className="font-semibold text-ink hover:text-accent">
                        {ticket.subject}
                      </Link>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <AlertTriangle size={12} />
                        {ticket.triggerReason || "-"}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-slate-700">{ticket.requesterExternalId}</p>
                      <p className="text-xs text-slate-500">{ticket.channel} · {ticket.botName}</p>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(ticket.status)}`}>
                        {statusLabels[ticket.status] || ticket.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass(ticket.priority)}`}>
                        {priorityLabels[ticket.priority] || ticket.priority}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{categoryLabels[ticket.category] || ticket.category}</td>
                    <td className="p-3 text-xs text-slate-500">
                      {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString("ar-EG") : "-"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Link className="btn-secondary px-3 py-1.5" href={`/dashboard/tickets/${ticket.id}`}>
                          <Eye size={16} />
                          عرض
                        </Link>
                        <Link className="btn-secondary px-3 py-1.5" href={`/dashboard/conversations/${ticket.conversationId}`}>
                          المحادثة
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm text-slate-500">لا توجد تذاكر بعد.</p>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
          <p className="text-slate-500">الصفحة {data.page} من {data.totalPages} · إجمالي {data.total}</p>
          <div className="flex gap-2">
            <Link className={`btn-secondary px-3 py-2 ${data.page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={pageHref(Math.max(1, data.page - 1), params)}>
              <ChevronRight size={16} /> السابق
            </Link>
            <Link className={`btn-secondary px-3 py-2 ${data.page >= data.totalPages ? "pointer-events-none opacity-50" : ""}`} href={pageHref(Math.min(data.totalPages, data.page + 1), params)}>
              التالي <ChevronLeft size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
