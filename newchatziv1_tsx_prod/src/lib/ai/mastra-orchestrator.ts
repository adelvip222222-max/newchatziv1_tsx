import { mastra } from "@/mastra";
import type { GenerateReplyInput } from "@/lib/ai";

export async function generateAiReplyWithMastra(input: GenerateReplyInput) {
  const workflow = mastra.getWorkflow("aiReplyWorkflow");
  const run = await workflow.createRun({
    resourceId: `${input.tenantId}:${input.externalUserId}`,
  });

  const result = await run.start({ inputData: input });

  if (result.status !== "success") {
    throw new Error(
      result.status === "failed"
        ? result.error?.message || "Mastra workflow failed."
        : `Mastra workflow ended with status: ${result.status}`
    );
  }

  const payload = result.result as any;

  return {
    reply: payload.reply || "",
    conversationId: payload.conversationId || input.conversationId || "",
    confidence: payload.confidence ?? null,
    messageId: payload.messageId,
    action: payload.action,
  };
}
