import { Worker } from "bullmq";
import { connectToDatabase } from "@/lib/mongodb";
import { MessageDelivery, Channel, Message } from "@/lib/models";
import { getAdapter } from "./registry";
import { initializeAdapters } from "./providers";
import { createRedisConnection } from "@/lib/redis-connection";
import { recordFailedJob } from "@/lib/job-monitoring";
import { logger } from "@/lib/logger";
import { publishRealtimeEvent } from "@/lib/realtime";
import {
  latencyTraceMongoSet,
  latencyTraceSummary,
  markLatencyTrace,
  mergeLatencyTrace,
} from "@/lib/latency-trace";

const connection = createRedisConnection("outbound-worker");

// Initialize providers so registry is populated
initializeAdapters();

export const outboundWorker = new Worker(
  "outbound-messages",
  async (job) => {
    await connectToDatabase();
    
    const { deliveryId, channelId, provider, externalUserId, externalThreadId, text, attachments } = job.data;
    
    logger.info("job.started", { queueName: "outbound-messages", jobId: job.id, deliveryId });

    const delivery = await MessageDelivery.findById(deliveryId);
    if (!delivery) throw new Error("Delivery record not found");

    const channel = await Channel.findOne({ _id: channelId, tenantId: delivery.tenantId });
    if (!channel) {
      delivery.status = "canceled";
      delivery.errorMessage = "Channel deleted";
      await delivery.save();
      return;
    }

    delivery.status = "sending";
    delivery.attempts += 1;
    delivery.lastAttemptAt = new Date();
    await delivery.save();

    const existingMessage = await Message.findOne({
      _id: delivery.messageId,
      tenantId: delivery.tenantId,
    }).select("metadata").lean();
    let trace = markLatencyTrace(
      mergeLatencyTrace((job.data as any).trace, (existingMessage?.metadata as any)?.trace),
      "outboundStartedAt"
    );
    await Message.findOneAndUpdate(
      { _id: delivery.messageId, tenantId: delivery.tenantId },
      { $set: { deliveryStatus: "sending", ...latencyTraceMongoSet(trace) } }
    );

    const adapter = getAdapter(provider);
    
    const result = await adapter.sendMessage({
      channel,
      externalUserId,
      externalThreadId,
      text,
      attachments
    });

    if (result.success) {
      delivery.status = "sent";
      delivery.externalMessageId = result.externalMessageId;
      await delivery.save();

      trace = markLatencyTrace(trace, "outboundSentAt");
      const sentAt = new Date(String(trace.outboundSentAt || new Date().toISOString()));
      await Message.findOneAndUpdate(
        { _id: delivery.messageId, tenantId: delivery.tenantId },
        {
          $set: {
            deliveryStatus: "sent",
            externalMessageId: result.externalMessageId,
            ...latencyTraceMongoSet({
              ...trace,
              outboundLatencyMs: delivery.createdAt
              ? sentAt.getTime() - new Date(delivery.createdAt).getTime()
              : undefined,
            }),
          },
        }
      );

      await publishRealtimeEvent(delivery.tenantId.toString(), "delivery.updated", {
        messageId: delivery.messageId.toString(),
        deliveryId: delivery._id.toString(),
        status: "sent",
        provider,
        externalMessageId: result.externalMessageId,
        sentAt: sentAt.toISOString(),
      });
      logger.info("outbound.sent", {
        deliveryId: delivery._id.toString(),
        tenantId: delivery.tenantId?.toString(),
        provider,
        externalMessageId: result.externalMessageId,
        latency: latencyTraceSummary(trace),
      });
    } else {
      delivery.status = "failed";
      delivery.errorMessage = result.error?.message || (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)) || "Unknown error";
      await delivery.save();

      trace = markLatencyTrace(trace, "outboundFailedAt");
      await Message.findOneAndUpdate(
        { _id: delivery.messageId, tenantId: delivery.tenantId },
        { $set: { deliveryStatus: "failed", ...latencyTraceMongoSet(trace) } }
      );

      throw new Error(delivery.errorMessage || "Unknown error"); // Trigger BullMQ retry
    }
  },
  { connection: connection as any, concurrency: Number(process.env.OUTBOUND_WORKER_CONCURRENCY || 8) }
);

outboundWorker.on("failed", (job, err) => {
  void recordFailedJob("outbound-messages", job, err);
});
