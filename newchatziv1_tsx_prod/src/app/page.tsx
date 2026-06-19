export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Bot } from "@/lib/models/bot";
import { LandingPage } from "@/components/landing/landing-page";

export default async function HomePage() {
  await connectToDatabase();
  let query: any = { isActive: true };
  if (process.env.DEFAULT_TENANT_ID) query.tenantId = process.env.DEFAULT_TENANT_ID;
  const bot = await Bot.findOne(query).sort({ createdAt: 1 }).lean();
  const botId = bot ? bot._id.toString() : undefined;

  const session = await getServerSession(authOptions as any);
  const isLoggedIn = !!(session as any)?.user;

  return <LandingPage locale="en" botId={botId} isLoggedIn={isLoggedIn} />;
}
