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

  const output = result.result as {
    reply?: string;
    conversationId?: string;
    confidence?: number | null;
    messageId?: string;
    action?: string;
  };

  return {
    reply: output.reply || "",
    conversationId: output.conversationId || input.conversationId || "",
    confidence: output.confidence ?? null,
    messageId: output.messageId,
    action: output.action,
  };
}
