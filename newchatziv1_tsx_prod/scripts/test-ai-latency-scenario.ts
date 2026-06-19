import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { Bot, Conversation, Message, Ticket, Lead } from "@/lib/models";
import { generateAiReply } from "@/lib/ai";
import { computeLatencyDurations, latencyTraceSummary, nowIso } from "@/lib/latency-trace";
import { connectToDatabase } from "@/lib/mongodb";

dotenv.config({ path: ".env.production" });
dotenv.config({ path: ".env" });

type ScenarioResult = {
  id: string;
  name: string;
  message: string;
  ok: boolean;
  expectation: string;
  reason?: string;
  reply?: string;
  conversationId?: string;
  assistantMessageId?: string;
  ticketId?: string;
  leadId?: string;
  trace?: ReturnType<typeof latencyTraceSummary>;
  flags?: Record<string, unknown>;
};

const scenarios = [
  {
    id: "A",
    name: "Greeting Fast Responder",
    message: "السلام عليكم",
    expectation: "Fast responder handles the greeting without knowledge search.",
  },
  {
    id: "B",
    name: "Business Knowledge",
    message: "ما هي خدماتكم؟",
    expectation: "Fast responder skips and the Knowledge/Mastra path is used.",
  },
  {
    id: "C",
    name: "Ticket + Lead",
    message: "أريد حجز موعد لتنظيف الأسنان، رقمي 01012345678",
    expectation: "A ticket and lead are created or updated for the booking request.",
  },
  {
    id: "D",
    name: "Out of Scope",
    message: "ما حالة الطقس اليوم؟",
    expectation: "Fast responder handles out-of-scope without creating a ticket.",
  },
];

async function resolveBot() {
  await connectToDatabase();
  const envTenantId = process.env.TEST_TENANT_ID || process.env.CODEX_TEST_TENANT_ID;
  const envBotId = process.env.TEST_BOT_ID || process.env.CODEX_TEST_BOT_ID;

  if (envTenantId && envBotId) {
    const bot = await Bot.findOne({ _id: envBotId, tenantId: envTenantId, isActive: true }).lean();
    if (!bot) throw new Error("Configured TEST_TENANT_ID/TEST_BOT_ID did not match an active bot.");
    return { tenantId: envTenantId, botId: envBotId, botName: bot.name || "Test bot" };
  }

  const bot = await Bot.findOne({ isActive: true }).sort({ createdAt: 1 }).lean();
  if (!bot?._id || !bot.tenantId) {
    throw new Error("No active bot found. Set TEST_TENANT_ID and TEST_BOT_ID to run the scenario.");
  }

  return {
    tenantId: bot.tenantId.toString(),
    botId: bot._id.toString(),
    botName: bot.name || "Test bot",
  };
}

async function runScenario(input: {
  tenantId: string;
  botId: string;
  scenario: (typeof scenarios)[number];
}): Promise<ScenarioResult> {
  const externalUserId = `codex-latency-${input.scenario.id.toLowerCase()}-${Date.now()}`;
  const traceId = `codex_${input.scenario.id.toLowerCase()}_${randomUUID()}`;
  const trace = computeLatencyDurations({
    traceId,
    receivedAt: nowIso(),
    ingressQueuedAt: nowIso(),
    ingressStartedAt: nowIso(),
    ingressCompletedAt: nowIso(),
    coreRoutingStartedAt: nowIso(),
    coreRoutingCompletedAt: nowIso(),
    aiStartedAt: nowIso(),
  });

  const conversation = await Conversation.create({
    tenantId: input.tenantId,
    botId: input.botId,
    channel: "website",
    provider: "website",
    externalUserId,
    status: "open",
    mode: "ai",
    metadata: { codexLatencyScenario: input.scenario.id },
  });

  const userMessage = await Message.create({
    tenantId: input.tenantId,
    botId: input.botId,
    conversationId: conversation._id,
    provider: "website",
    direction: "incoming",
    sender: "user",
    senderType: "customer",
    content: input.scenario.message,
    deliveryStatus: "delivered",
    metadata: { traceId, trace, codexLatencyScenario: input.scenario.id },
  });

  try {
    const result = await generateAiReply({
      tenantId: input.tenantId,
      botId: input.botId,
      conversationId: conversation._id.toString(),
      channel: "website",
      externalUserId,
      message: input.scenario.message,
      metadata: {
        traceId,
        trace,
        sourceMessageId: userMessage._id.toString(),
      },
    });

    const [assistantMessage, crm] = await Promise.all([
      result.messageId
        ? Message.findOne({ _id: result.messageId, tenantId: input.tenantId }).lean()
        : null,
      waitForTicketAndLead(input.tenantId, conversation._id),
    ]);
    const { ticket, lead } = crm;

    const metadata = (assistantMessage?.metadata || {}) as Record<string, any>;
    const savedTrace = (metadata.trace || {}) as Record<string, unknown>;
    const fastHandled = Boolean(metadata.fastPath || String(metadata.reason || "").startsWith("ai_fast"));
    const knowledgeUsed = Boolean(metadata.knowledge?.enabled && metadata.knowledge?.sourceCount !== undefined);
    const ticketCreated = Boolean(ticket?._id);
    const leadCreated = Boolean(lead?._id);

    const ok =
      input.scenario.id === "A"
        ? fastHandled && !knowledgeUsed
        : input.scenario.id === "B"
        ? !fastHandled && Boolean(savedTrace.knowledgeStartedAt || savedTrace.modelStartedAt)
        : input.scenario.id === "C"
        ? ticketCreated && leadCreated
        : input.scenario.id === "D"
        ? fastHandled && !ticketCreated
        : false;

    return {
      id: input.scenario.id,
      name: input.scenario.name,
      message: input.scenario.message,
      expectation: input.scenario.expectation,
      ok,
      reply: result.reply,
      conversationId: conversation._id.toString(),
      assistantMessageId: result.messageId || undefined,
      ticketId: ticket?._id?.toString(),
      leadId: lead?._id?.toString(),
      trace: latencyTraceSummary(savedTrace),
      flags: {
        fastHandled,
        knowledgeUsed,
        ticketCreated,
        leadCreated,
        deliveryStatus: assistantMessage?.deliveryStatus,
        action: metadata.action,
        reason: metadata.reason || metadata.fastPath,
      },
    };
  } catch (error) {
    return {
      id: input.scenario.id,
      name: input.scenario.name,
      message: input.scenario.message,
      expectation: input.scenario.expectation,
      ok: false,
      conversationId: conversation._id.toString(),
      reason: error instanceof Error ? error.message : String(error),
      trace: latencyTraceSummary(trace),
    };
  }
}

async function waitForTicketAndLead(tenantId: string, conversationId: unknown) {
  const deadline = Date.now() + 6_000;
  let ticket: any = null;
  let lead: any = null;

  while (Date.now() < deadline) {
    [ticket, lead] = await Promise.all([
      Ticket.findOne({ tenantId, conversationId }).sort({ updatedAt: -1 }).lean(),
      Lead.findOne({ tenantId, conversationId }).sort({ updatedAt: -1 }).lean(),
    ]);
    if (ticket && lead) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { ticket, lead };
}

async function main() {
  const bot = await resolveBot();
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    results.push(await runScenario({ tenantId: bot.tenantId, botId: bot.botId, scenario }));
  }

  console.log(
    JSON.stringify(
      {
        bot,
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    // Mongoose keeps sockets open in ts-node scripts unless the process exits.
    setTimeout(() => process.exit(process.exitCode || 0), 50);
  });
