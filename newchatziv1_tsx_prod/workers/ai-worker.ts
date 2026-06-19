import { Worker } from "bullmq";
import { connectToDatabase } from "../src/lib/mongodb";
import { Conversation, Message } from "../src/lib/models";
import { egressQueue, defaultJobOptions, makeQueueJobId } from "../src/lib/queues";
import { createRedisConnection } from "../src/lib/redis-connection";
import { recordFailedJob } from "../src/lib/job-monitoring";
import { startWorkerHeartbeat } from "../src/lib/worker-heartbeat";
import { logger } from "../src/lib/logger";
import { generateAiReply } from "../src/lib/ai";
import { publishRealtimeEvent } from "../src/lib/realtime";

const workerName = "worker-ai";
const connection = createRedisConnection(workerName);

startWorkerHeartbeat(workerName);

export const aiWorker = new Worker(
  "ai-processing-queue",
  async (job) => {
    await connectToDatabase();
    const { tenantId, conversationId, messageId, botId, provider, traceId } = job.data;
    logger.info("job.started", { queueName: "ai-processing-queue", jobId: job.id, tenantId, conversationId, messageId, traceId });

    const [conversation, message] = await Promise.all([
      Conversation.findOne({ _id: conversationId, tenantId, botId }),
      Message.findOne({ _id: messageId, tenantId, conversationId })
    ]);

    if (!conversation || !message) throw new Error("Conversation or message not found");

    // إعادة تنشيط AI تلقائياً إذا كانت المحادثة محوَّلة بسبب low_knowledge_confidence
    // (الحالات التي يجب أن يستمر فيها الـ AI بالرد)
    const autoReactivateReasons = ["low_knowledge_confidence", "repeated_question_loop", "max_ai_turns_reached"];
    if (
      (conversation.mode === "human" || conversation.aiPaused) &&
      conversation.status !== "closed" &&
      autoReactivateReasons.includes(conversation.handoffReason || "")
    ) {
      conversation.mode = "ai";
      conversation.aiPaused = false;
      conversation.aiPausedReason = null;
      conversation.aiStatus = "active";
      conversation.aiTurnCount = 0;
      conversation.metadata = {
        ...(conversation.metadata || {}),
        aiPolicy: {
          ...((conversation.metadata as any)?.aiPolicy || {}),
          clarificationCount: 0,
          repeatedUserCount: 0,
          handoffRequested: false,
          reactivatedAt: new Date().toISOString(),
        }
      };
      await conversation.save();
      logger.info("ai.auto_reactivated", { tenantId, conversationId, previousReason: conversation.handoffReason, traceId });
    }

    if (conversation.mode === "human" || conversation.aiPaused || conversation.status === "closed") {
      return { generated: false, reason: "ai_paused" };
    }

    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    const attachmentPrompt = describeMessageAttachments(attachments);

    const result = await generateAiReply({
      tenantId,
      botId,
      conversationId,
      externalUserId: conversation.externalUserId,
      channel: provider || conversation.provider || conversation.channel,
      message: message.content || attachmentPrompt || "أرسل العميل مرفقًا.",
      metadata: { traceId, sourceMessageId: messageId, attachments }
    });

    if (!result.reply || !result.messageId) {
      return { generated: false, reason: "empty_reply" };
    }

    // ── Realtime push (safety net) ─────────────────────────────────────────────
    // The Mastra persistResultStep already publishes. This is a second guarantee
    // that works for legacy mode and as a fallback if the Mastra publish fails.
    // Fire-and-forget: never block the egress queue for a realtime event.
    void (async () => {
      try {
        const [savedMessage, freshConversation] = await Promise.all([
          Message.findById(result.messageId).select("content deliveryStatus createdAt attachments provider").lean(),
          Conversation.findById(conversationId).select("channel provider lastMessageAt aiStatus").lean(),
        ]);
        if (savedMessage) {
          await publishRealtimeEvent(tenantId, "message.created", {
            message: {
              id: result.messageId,
              conversationId,
              content: (savedMessage as any).content || result.reply,
              direction: "outgoing",
              sender: "assistant",
              senderType: "assistant",
              provider: (savedMessage as any).provider || provider || (freshConversation as any)?.channel || "",
              deliveryStatus: (savedMessage as any).deliveryStatus || "sent",
              createdAt: (savedMessage as any).createdAt?.toISOString?.() || new Date().toISOString(),
              attachments: [],
            },
            conversation: {
              id: conversationId,
              aiStatus: (freshConversation as any)?.aiStatus || "active",
              lastMessage: result.reply.slice(0, 220),
              lastMessageAt: (freshConversation as any)?.lastMessageAt?.toISOString?.() || new Date().toISOString(),
              channel: (freshConversation as any)?.channel || "",
              provider: (freshConversation as any)?.provider || provider || "",
            },
          });
        }
      } catch (realtimeError) {
        logger.warn("ai.realtime_publish_failed", {
          tenantId,
          conversationId,
          messageId: result.messageId,
          error: realtimeError instanceof Error ? realtimeError.message : "unknown",
        });
      }
    })();

    await egressQueue.add(
      "prepare-outbound",
      {
        tenantId,
        conversationId,
        messageId: result.messageId,
        provider: provider || conversation.provider || conversation.channel,
        traceId
      },
      {
        ...defaultJobOptions,
        jobId: makeQueueJobId("egress", result.messageId)
      }
    );

    logger.info("ai.reply_generated", { tenantId, conversationId, messageId: result.messageId, traceId });
    return { generated: true, messageId: result.messageId };
  },
  { connection: connection as any, concurrency: Number(process.env.AI_WORKER_CONCURRENCY || 3) }
);

aiWorker.on("failed", (job, error) => {
  void recordFailedJob("ai-processing-queue", job, error);
});


function describeMessageAttachments(attachments: any[]) {
  if (!attachments.length) return "";
  const summary = attachments
    .map((attachment) => {
      const type = attachment?.type || attachment?.mimeType || "ملف";
      const name = attachment?.name ? ` (${attachment.name})` : "";
      if (type === "image" || String(type).startsWith("image/")) return `أرسل العميل صورة${name}`;
      if (type === "audio" || String(type).startsWith("audio/")) return `أرسل العميل رسالة صوتية${name}`;
      if (type === "video" || String(type).startsWith("video/")) return `أرسل العميل فيديو${name}`;
      return `أرسل العميل مرفقًا${name}`;
    })
    .join("، ");
  return summary;
}
