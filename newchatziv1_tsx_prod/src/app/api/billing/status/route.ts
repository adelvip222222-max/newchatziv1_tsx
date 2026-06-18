import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { TenantSubscription } from "@/lib/models";
import { requireSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireSession();
    await connectToDatabase();

    const subscription = await TenantSubscription.findOne({ tenantId: session.user.tenantId }).lean();

    if (!subscription) {
      return NextResponse.json({
        status: "inactive",
        monthlyMessageLimit: 0,
        usedMessages: 0,
        extraMessageCredits: 0
      });
    }

    return NextResponse.json({
      status: subscription.status,
      monthlyMessageLimit: subscription.monthlyMessageLimit,
      usedMessages: subscription.usedMessages,
      extraMessageCredits: subscription.extraMessageCredits,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null
    });
  } catch (error: any) {
    console.error("Failed to fetch billing status:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
