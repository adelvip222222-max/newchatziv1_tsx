import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { Types } from "mongoose";
import {
  aiReplyInputSchema,
  aiReplyOutputSchema,
} from "@/mastra/schemas/ai-reply.schema";
import { AiSetting, Bot, Conversation, Message, AiPersona } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/strings";

const activePersonaSchema = z
  .object({
    roleName: z.string(),
    description: z.string().optional(),
    systemPrompt: z.string(),
    personaType: z.string().optional(),
  })
  .nullable()
  .optional();
import { assertCanSendAiMessage, recordAiMessageUsage } from "@/lib/billing";
import { buildKnowledgePrompt, searchKnowledge } from "@/lib/knowledge";
import { checkContentModeration } from "@/lib/moderation";
import { getMastraMaxToolCalls } from "@/lib/ai/orchestrator-flags";
import { resolveMastraModelForBot } from "@/lib/ai/mastra-model-resolver";
import { validateCustomerReply } from "@/lib/ai/reply-validators";
import { logger } from "@/lib/logger";
import {
  latencyTraceMongoSet,
  markLatencyTrace,
  mergeLatencyTrace,
} from "@/lib/latency-trace";
import { publishRealtimeEvent } from "@/lib/realtime";
import {
  describeAttachmentsForAi,
  type MessageAttachment,
} from "@/lib/attachments";
import {
  classifyTicketIntent,
  ensureTicketForConversation,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/tickets";
import { isExplicitHumanHandoffRequest } from "@/lib/ai/handoff";
import { detectAndReplyFast } from "@/lib/ai/fast-intent-responder";
import { createCustomerSupportAgent } from "@/mastra/agents/customer-support.agent";

const settingSchema = z
  .object({
    systemPrompt: z.string().optional(),
    fallbackMessage: z.string().optional(),
    temperature: z.number().optional(),
    language: z.string().optional(),
    role: z.string().optional(),
    tone: z.string().optional(),
    responseLength: z.string().optional(),
    useEmojis: z.boolean().optional(),
    isEnabled: z.boolean().optional(),
  })
  .nullable()
  .optional();

const botRuntimeSchema = z.object({
  name: z.string().optional(),
  knowledgeEnabled: z.boolean(),
  showKnowledgeSources: z.boolean(),
  confidenceDirectThreshold: z.number(),
  confidenceReviewThreshold: z.number(),
});

const knowledgeSchema = z
  .object({
    confidence: z.number(),
    intent: z.string(),
    keywords: z.array(z.string()),
    results: z.array(
      z.object({
        text: z.string(),
        score: z.number(),
        rankScore: z.number().optional(),
        semanticScore: z.number().optional(),
        keywordScore: z.number().optional(),
        sourceTitle: z.string(),
        sourceUrl: z.string(),
        tags: z.array(z.string()).optional(),
        documentId: z.string(),
      })
    ),
    retrievalEngine: z.string().optional(),
    qdrantResultCount: z.number().optional(),
    mongoResultCount: z.number().optional(),
    documentFallbackCount: z.number().optional(),
  })
  .nullable()
  .optional();

const aiReplyRunContextSchema = aiReplyInputSchema.extend({
  conversationId: z.string().optional(),
  userMessageId: z.string().optional(),
  messageId: z.string().optional(),
  action: z.enum(["reply", "handoff", "skip", "fallback"]).optional(),
  generated: z.boolean().optional(),
  reply: z.string().optional(),
  confidence: z.number().nullable().optional(),
  reason: z.string().optional(),
  responseId: z.string().optional(),
  providerUsed: z.string().optional(),
  modelUsed: z.string().optional(),
  bot: botRuntimeSchema.optional(),
  setting: settingSchema,
  moderation: z
    .object({
      isSafe: z.boolean(),
      reason: z.string().optional(),
    })
    .optional(),
  knowledge: knowledgeSchema,
  knowledgePrompt: z.string().optional(),
  validation: z
    .object({
      valid: z.boolean(),
      reason: z.string().optional(),
    })
    .optional(),
  ticket: z
    .object({
      shouldCreate: z.boolean(),
      category: z.enum([
        "technical_support",
        "complaint",
        "human_request",
        "booking_request",
        "sales_request",
        "ai_failed",
        "general",
      ]),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      reason: z.string(),
    })
    .optional(),
  ticketId: z.string().optional(),
  modelCalled: z.boolean().optional(),
  activePersona: activePersonaSchema,
});

type AiReplyRunContext = z.infer<typeof aiReplyRunContextSchema>;
type AiReplyTicketContext = NonNullable<AiReplyRunContext["ticket"]>;

function getInputAttachments(metadata: Record<string, unknown> | undefined) {
  const attachments = metadata?.attachments;
  if (!Array.isArray(attachments)) return [];

  return attachments.filter((attachment): attachment is MessageAttachment => {
    if (!attachment || typeof attachment !== "object") return false;
    const item = attachment as Partial<MessageAttachment>;
    return Boolean(
      item.id &&
        item.key &&
        item.name &&
        item.mimeType &&
        typeof item.size === "number" &&
        (item.type === "image" || item.type === "audio" || item.type === "file")
    );
  });
}

function getTimeoutMs() {
  const value = Number(process.env.MASTRA_TIMEOUT_MS || 30000);
  return Number.isFinite(value) && value > 0 ? value : 30000;
}

function withTimeoutSignal() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

function buildPersonaDirectives(setting: AiReplyRunContext["setting"]) {
  const directives: string[] = [];

  if (setting?.role && setting.role !== "assistant") {
    directives.push(`Your role is: ${setting.role}. Always stay in character.`);
  }
  if (setting?.language && setting.language !== "auto") {
    directives.push(`You must reply exclusively in this language: ${setting.language}.`);
  }
  if (setting?.tone && setting.tone !== "neutral") {
    directives.push(`Maintain a ${setting.tone} tone throughout the conversation.`);
  }
  if (setting?.responseLength && setting.responseLength !== "medium") {
    directives.push(`Keep your answers ${setting.responseLength}.`);
  }
  if (setting?.useEmojis === false) {
    directives.push("Do NOT use any emojis in your responses.");
  } else if (setting?.useEmojis === true) {
    directives.push("Feel free to use relevant emojis in your responses.");
  }

  return directives;
}

function hasExplicitHumanRequest(message: string) {
  return isExplicitHumanHandoffRequest(message);
}

function sanitizeCustomerReply(value: string) {
  return String(value || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .replace(/\[SENTIMENT:[^\]]*\]/gi, "")
    .replace(/\bRAG\b/gi, "المعرفة المتاحة")
    .replace(/\bconfidence score\b/gi, "درجة التأكد")
    .trim();
}


// ── AI-driven persona routing ─────────────────────────────────────────────────
// Instead of hardcoded keyword dictionaries, we let the model read the actual
// persona descriptions configured by the admin and pick the best match.
// Falls back to null (no switch) if the AI call fails or is not confident.

function buildPersonaRoutingPrompt(personas: Array<{ id: string; roleName: string; description: string; personaType: string }>) {
  const list = personas
    .map((p, i) => `${i + 1}. id="${p.id}" | role="${p.roleName}" | type="${p.personaType || "general"}" | description="${p.description || "general assistant"}"`)
    .join("\n");
  return [
    "You are a smart AI employee router for a business chat platform.",
    "Given a customer message, decide which employee persona should handle it.",
    "Read each persona's role, type, and description carefully — they are defined by the business admin.",
    "Respond in strict JSON only. No markdown. No explanation.",
    "If NO persona clearly fits the message, return: { \"personaId\": null, \"confidence\": 0 }",
    "Only route if you are ≥70% confident a specific persona is the right match.",
    "Required JSON shape: { \"personaId\": string | null, \"confidence\": number (0-100) }",
    "",
    "Available personas:",
    list,
  ].join("\n");
}

async function inferAutoPersona(input: {
  tenantId: string;
  message: string;
  currentPersonaId?: string;
}) {
  const personas = await AiPersona.find({ tenantId: input.tenantId, isActive: true })
    .select("roleName description personaType systemPrompt greetingMessage")
    .lean();

  // Nothing to route to
  if (!personas.length) return null;
  // Only one persona — use it directly without wasting an AI call
  if (personas.length === 1) return personas[0];

  const personaList = personas.map((p: any) => ({
    id: p._id.toString(),
    roleName: p.roleName || "",
    description: p.description || "",
    personaType: p.personaType || "general",
  }));

  try {
    const { routeAiRequest } = await import("@/lib/ai-router");
    const result = await routeAiRequest({
      systemPrompt: buildPersonaRoutingPrompt(personaList),
      userInput: JSON.stringify({ customerMessage: input.message }),
      temperature: 0.0, // deterministic — we want a clear decision
    });

    // Extract JSON from response
    const text = result.reply.trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) return null;

    const parsed = JSON.parse(text.slice(start, end + 1)) as { personaId?: string | null; confidence?: number };
    const confidence = Number(parsed.confidence || 0);
    const personaId = parsed.personaId;

    if (!personaId || confidence < 70) return null;
    // Don't switch if already on the same persona
    if (personaId === input.currentPersonaId) return null;

    const matched = personas.find((p: any) => p._id.toString() === personaId) || null;
    return matched;
  } catch {
    // AI routing failed — don't crash the conversation, just don't switch
    return null;
  }
}


const loadConversationStep = createStep({
  id: "load-conversation",
  inputSchema: aiReplyInputSchema,
  outputSchema: aiReplyRunContextSchema,
  execute: async ({ inputData }) => {
    await connectToDatabase();

    if (!Types.ObjectId.isValid(inputData.tenantId) || !Types.ObjectId.isValid(inputData.botId)) {
      throw new Error("معرف المستأجر أو البوت غير صالح.");
    }

    const bot = await Bot.findOne({
      _id: inputData.botId,
      tenantId: inputData.tenantId,
      isActive: true,
    }).lean();
    if (!bot) throw new Error("البوت غير موجود أو غير مفعل.");

    const setting = await AiSetting.findOne({
      tenantId: inputData.tenantId,
      botId: inputData.botId,
    }).lean();

    const conversation =
      inputData.conversationId && Types.ObjectId.isValid(inputData.conversationId)
        ? await Conversation.findOne({
            _id: inputData.conversationId,
            tenantId: inputData.tenantId,
            botId: inputData.botId,
          }).lean()
        : await Conversation.findOneAndUpdate(
            {
              tenantId: inputData.tenantId,
              botId: inputData.botId,
              channel: inputData.channel,
              externalUserId: inputData.externalUserId,
            },
            {
              $setOnInsert: {
                tenantId: inputData.tenantId,
                botId: inputData.botId,
                channel: inputData.channel,
                externalUserId: inputData.externalUserId,
                status: "open",
                mode: "ai",
                aiStatus: "active",
              },
            },
            { new: true, upsert: true }
          ).lean();

    if (!conversation) throw new Error("تعذر العثور على المحادثة.");

    const attachments = getInputAttachments(inputData.metadata);
    const attachmentDescription = describeAttachmentsForAi(attachments);
    const contentForStorage = attachmentDescription
      ? `${inputData.message}\n\nمرفقات العميل: ${attachmentDescription}`
      : inputData.message;

    const sourceMessageId = (inputData.metadata as any)?.sourceMessageId;
    const userMessage = sourceMessageId && Types.ObjectId.isValid(String(sourceMessageId))
      ? await Message.findOne({ _id: sourceMessageId, tenantId: inputData.tenantId, conversationId: conversation._id }).lean()
      : await Message.create({
          tenantId: inputData.tenantId,
          botId: inputData.botId,
          conversationId: conversation._id,
          contactId: conversation.contactId,
          channelIdentityId: conversation.channelIdentityId,
          provider: inputData.channel,
          direction: "incoming",
          sender: "user",
          senderType: "customer",
          content: contentForStorage,
          deliveryStatus: "delivered",
          attachments,
          metadata: inputData.metadata || {},
        });

    if (!userMessage) throw new Error("تعذر العثور على رسالة العميل.");

    const shouldSkip =
      conversation.status === "closed" ||
      conversation.status === "resolved" ||
      conversation.mode === "human" ||
      conversation.aiPaused === true;

    const routedPersona = await inferAutoPersona({
      tenantId: inputData.tenantId,
      message: inputData.message,
      currentPersonaId: conversation.activePersonaId?.toString?.() || ""
    });

    let currentPersonaId = conversation.activePersonaId;
    if (routedPersona && String(conversation.activePersonaId || "") !== routedPersona._id.toString()) {
      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            activePersonaId: routedPersona._id as any,
            aiIntent: routedPersona.personaType as any,
            "metadata.aiRouting": {
              autoRoutedPersonaId: routedPersona._id.toString(),
              autoRoutedPersonaName: routedPersona.roleName,
              autoRoutedAt: new Date().toISOString(),
              reason: "ai_routed"
            }
          }
        }
      );
      currentPersonaId = routedPersona._id as any;
    }

    const activePersona = routedPersona || (currentPersonaId
      ? await AiPersona.findOne({ _id: currentPersonaId, tenantId: inputData.tenantId, isActive: true }).lean()
      : null);

    return {
      ...inputData,
      conversationId: conversation._id.toString(),
      userMessageId: userMessage._id.toString(),
      action: shouldSkip ? ("skip" as const) : undefined,
      reason: shouldSkip
        ? conversation.mode === "human" || conversation.aiPaused
          ? "conversation_human_mode"
          : `conversation_${conversation.status}`
        : undefined,
      bot: {
        name: bot.name,
        knowledgeEnabled: bot.knowledgeEnabled ?? true,
        showKnowledgeSources: bot.showKnowledgeSources ?? false,
        confidenceDirectThreshold: bot.confidenceDirectThreshold ?? 70,
        confidenceReviewThreshold: bot.confidenceReviewThreshold ?? 40,
      },
      setting: setting
        ? {
            systemPrompt: setting.systemPrompt || undefined,
            fallbackMessage: setting.fallbackMessage || undefined,
            temperature: setting.temperature ?? undefined,
            language: setting.language || undefined,
            role: setting.role || undefined,
            tone: setting.tone || undefined,
            responseLength: setting.responseLength || undefined,
            useEmojis: setting.useEmojis ?? undefined,
            isEnabled: setting.isEnabled ?? undefined,
          }
        : null,
      activePersona: activePersona
        ? {
            roleName: activePersona.roleName,
            description: activePersona.description || "",
            systemPrompt: activePersona.systemPrompt,
            personaType: activePersona.personaType || "general",
          }
        : null,
      generated: false,
    };
  },
});

const fastReplyStep = createStep({
  id: "fast-ai-intent-responder",
  inputSchema: aiReplyRunContextSchema,
  outputSchema: aiReplyRunContextSchema,
  execute: async ({ inputData }) => {
    if (inputData.action) return inputData;

    let trace = markLatencyTrace(
      mergeLatencyTrace((inputData.metadata as any)?.trace, {
        traceId: (inputData.metadata as any)?.traceId || inputData.traceId,
      }),
      "fastResponderStartedAt"
    );
    const fast = await detectAndReplyFast({
      tenantId: inputData.tenantId,
      botId: inputData.botId,
      message: inputData.message,
      botName: inputData.bot?.name,
      businessName: inputData.bot?.name,
      language: inputData.setting?.language || "auto",
      role: inputData.setting?.role || "assistant",
      tone: inputData.setting?.tone || "friendly",
      responseLength: inputData.setting?.responseLength || "short",
      fallbackMessage: inputData.setting?.fallbackMessage,
    });
    trace = markLatencyTrace(trace, "fastResponderCompletedAt");

    if (!fast.handled || !fast.reply) {
      return {
        ...inputData,
        metadata: {
          ...(inputData.metadata || {}),
          trace,
        },
      };
    }

    return {
      ...inputData,
      metadata: {
        ...(inputData.metadata || {}),
        trace,
      },
      action: "reply" as const,
      reply: fast.reply,
      confidence: fast.confidence,
      reason: fast.reason || `ai_fast_${fast.intent}`,
      modelCalled: fast.modelCalled,
      providerUsed: fast.providerUsed,
      modelUsed: fast.modelUsed,
    };
  },
});

const moderationStep = createStep({
  id: "moderation-check",
  inputSchema: aiReplyRunContextSchema,
  outputSchema: aiReplyRunContextSchema,
  execute: async ({ inputData }) => {
    if (inputData.action === "skip") return inputData;

    const moderation = await checkContentModeration(inputData.message);
    if (!moderation.isSafe) {
      return {
        ...inputData,
        moderation,
        action: "fallback" as const,
        reply:
          inputData.setting?.fallbackMessage ||
          "عذراً، لا يمكنني معالجة هذا الطلب. يرجى التوضيح أو التواصل مع الدعم.",
        confidence: 100,
        reason: moderation.reason || "moderation_blocked",
      };
    }

    return { ...inputData, moderation };
  },
});

const routeHandoffStep = createStep({
  id: "route-handoff",
  inputSchema: aiReplyRunContextSchema,
  outputSchema: aiReplyRunContextSchema,
  execute: async ({ inputData }) => {
    if (inputData.action) return inputData;

    // If customer explicitly asks for a human, flag it but let the agent respond naturally.
    // The agent instructions tell it how to handle this warmly — not a hardcoded reply.
    if (hasExplicitHumanRequest(inputData.message)) {
      const ticket: AiReplyTicketContext = {
        shouldCreate: true,
        category: "human_request",
        priority: "medium",
        reason: "explicit_human_request",
      };
      // Pass to agent with handoff flag — agent will generate a natural, warm handoff message
      return { ...inputData, ticket, reason: "explicit_human_request" };
    }

    const ticketIntent = classifyTicketIntent(inputData.message);
    if (ticketIntent.shouldCreate) {
      const ticket: AiReplyTicketContext = {
        shouldCreate: ticketIntent.shouldCreate,
        category: ticketIntent.category as AiReplyTicketContext["category"],
        priority: ticketIntent.priority as AiReplyTicketContext["priority"],
        reason: ticketIntent.reason,
      };
      // Pass to agent with ticket metadata — agent generates the reply naturally
      return { ...inputData, ticket, reason: ticketIntent.reason };
    }

    return inputData;
  },
});

const quotaStep = createStep({
  id: "quota-check",
  inputSchema: aiReplyRunContextSchema,
  outputSchema: aiReplyRunContextSchema,
  execute: async ({ inputData }) => {
    if (inputData.action) return inputData;

    if (inputData.setting && inputData.setting.isEnabled === false) {
      throw new Error("الذكاء الاصطناعي غير مفعل لهذا البوت.");
    }

    await assertCanSendAiMessage(inputData.tenantId);
    return inputData;
  },
});

const knowledgeStep = createStep({
  id: "search-knowledge",
  inputSchema: aiReplyRunContextSchema,
  outputSchema: aiReplyRunContextSchema,
  execute: async ({ inputData }) => {
    if (inputData.action) return inputData;

    const knowledgeEnabled = inputData.bot?.knowledgeEnabled ?? true;
    let trace = markLatencyTrace((inputData.metadata as any)?.trace, "knowledgeStartedAt");
    const knowledge = knowledgeEnabled
      ? await searchKnowledge({
          tenantId: inputData.tenantId,
          botId: inputData.botId,
          question: inputData.message,
          limit: Number(process.env.AI_KB_SEARCH_LIMIT || 5),
        })
      : null;
    trace = markLatencyTrace(trace, "knowledgeCompletedAt");

    const knowledgePrompt = knowledge
      ? buildKnowledgePrompt({
          question: inputData.message,
          intent: knowledge.intent,
          keywords: knowledge.keywords,
          confidence: knowledge.confidence,
          results: knowledge.results,
          showSources: false,
        })
      : "";

    logger.info("ai.knowledge_retrieval", {
      mode: "mastra_orchestrator",
      tenantId: inputData.tenantId,
      botId: inputData.botId,
      conversationId: inputData.conversationId,
      enabled: knowledgeEnabled,
      ragResults: knowledge?.results.length ?? 0,
      topScore: knowledge?.results[0]?.score ?? null,
      confidence: knowledge?.confidence ?? null,
      retrievalEngine: knowledge?.retrievalEngine,
      rejected: false,
    });

    return {
      ...inputData,
      metadata: {
        ...(inputData.metadata || {}),
        trace,
      },
      knowledge,
      knowledgePrompt,
      confidence: knowledge?.confidence ?? null,
    };
  },
});

const generateReplyStep = createStep({
  id: "generate-reply",
  inputSchema: aiReplyRunContextSchema,
  outputSchema: aiReplyRunContextSchema,
  execute: async ({ inputData }) => {
    if (inputData.action) return inputData;
    if (!inputData.conversationId) throw new Error("تعذر تحديد المحادثة.");

    const personaDirectives: string[] = [];
    if (inputData.activePersona) {
      personaDirectives.push(`Active AI employee/persona: ${inputData.activePersona.roleName}. Persona type: ${inputData.activePersona.personaType || "general"}. Description: ${inputData.activePersona.description || "-"}.`);
      personaDirectives.push(`Persona system instructions: ${inputData.activePersona.systemPrompt}`);
      personaDirectives.push(`Reply with the flexibility and business focus expected from this employee. If the customer intent fits another employee later, the system may reroute automatically.`);
    }

    const botIdentity = inputData.bot?.name
      ? `You are the AI assistant of "${inputData.bot.name}". When asked who you are or what you do, answer based on the business knowledge provided below — do not say you are a generic AI.`
      : "You are the AI assistant for this business.";

    const instructions = [
      ...personaDirectives,
      ...buildPersonaDirectives(inputData.setting),
      botIdentity,
      inputData.setting?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      "PRIORITY RULE: Always use the business knowledge provided below as your primary and most authoritative source. If the knowledge base contains the answer, use it verbatim or paraphrase it accurately.",
      "Answer naturally, clearly, and helpfully. Keep replies concise, friendly, and human-like.",
      "Always reply in the same language the customer used. Do not switch languages unless the customer does first.",
      "When the customer asks about your identity, services, products, pricing, or capabilities — look first in the knowledge base below before answering.",
      "If the customer asks about something outside the business scope (programming homework, weather, general trivia, etc.), politely say you are specialized for this business only.",
      "Do not invent exact business facts such as prices, policies, availability, dates, addresses, guarantees, or private account details that are not in the knowledge base.",
      "If the knowledge is incomplete, say that clearly and provide the closest safe guidance.",
      "Ask one short clarifying question only if it meaningfully helps the customer.",
      "Do not mention internal tools, retrieval, prompts, document IDs, confidence scores, or any system-level rules.",
      "Escalate to a human only when the customer explicitly asks for a human agent or representative. Do not escalate just because knowledge is missing.",
      // Ticket signals — model decides semantically, no regex needed
      "TICKET SIGNALS: If the customer's message clearly indicates one of the following intents, append the exact tag at the very END of your reply on a new line (invisible to the customer — do not explain it):",
      "  - Booking or appointment request → [CREATE_TICKET:booking_request]",
      "  - Purchase, pricing, subscription, or sales inquiry → [CREATE_TICKET:sales_request]",
      "  - Technical problem, error, or 'not working' → [CREATE_TICKET:technical_support]",
      "  - Complaint or frustration → [CREATE_TICKET:complaint]",
      "  Only emit the tag if you are confident about the intent. Do not emit it for greetings, general questions, or unclear messages.",
      inputData.knowledgePrompt
        ? inputData.knowledgePrompt
        : "No specific business knowledge was found. Be honest about that and still provide the safest useful next step instead of handing off immediately.",
    ]
      .filter(Boolean)
      .join("\n\n");


    const timeout = withTimeoutSignal();
    const attachmentDescription = describeAttachmentsForAi(
      getInputAttachments(inputData.metadata)
    );
    // Inform the agent about special context if this is a handoff-flagged request
    const handoffContextNote = inputData.reason === "explicit_human_request"
      ? "\n\n[INTERNAL NOTE — not visible to customer]: The customer has explicitly asked to speak with a human. Acknowledge their request warmly, confirm you are connecting them with the team, and reassure them someone will be in touch soon. Phrase it naturally based on their language and tone."
      : inputData.ticket?.shouldCreate && inputData.ticket.category !== "ai_failed"
      ? `\n\n[INTERNAL NOTE — not visible to customer]: A support ticket will be created for this (${inputData.ticket.reason}). Respond helpfully but also let them know naturally that the team will follow up if needed.`
      : "";

    const userPrompt = attachmentDescription
      ? `${inputData.message}\n\nمرفقات العميل: ${attachmentDescription}${handoffContextNote}`
      : `${inputData.message}${handoffContextNote}`;

    try {
      const resolvedModel = await resolveMastraModelForBot({
        tenantId: inputData.tenantId,
        botId: inputData.botId,
      });
      const temperature = inputData.setting?.temperature ?? 0.6;
      const agent = createCustomerSupportAgent(resolvedModel.model, { memory: false });
      let trace = markLatencyTrace((inputData.metadata as any)?.trace, "modelStartedAt");
      const result = await agent.generate(userPrompt, {
        instructions,
        maxSteps: getMastraMaxToolCalls(),
        abortSignal: timeout.signal,
        modelSettings: {
          temperature,
        },
        memory: {
          resource: `${inputData.tenantId}:${inputData.externalUserId}`,
          thread: {
            id: inputData.conversationId,
            title: inputData.bot?.name
              ? `${inputData.bot.name} support conversation`
              : "Support conversation",
            metadata: {
              tenantId: inputData.tenantId,
              botId: inputData.botId,
              channel: inputData.channel,
            },
          },
        },
      });
      trace = markLatencyTrace(trace, "modelCompletedAt");

      let replyText = result.text?.trim() || "";
      let ticketToCreate = inputData.ticket;

      const ticketMatch = replyText.match(/\[CREATE_TICKET:\s*(booking_request|sales_request|technical_support|complaint)\]/i);
      if (ticketMatch) {
        ticketToCreate = {
          shouldCreate: true,
          category: ticketMatch[1].toLowerCase() as "booking_request" | "sales_request" | "technical_support" | "complaint",
          priority: ticketMatch[1] === "complaint" || ticketMatch[1] === "technical_support" ? "high" : "medium",
          reason: "ai_detected_intent",
        };
        replyText = replyText.replace(ticketMatch[0], "").trim();
      }

      const shouldHandoff =
        inputData.reason === "explicit_human_request" && ticketToCreate?.shouldCreate;

      logger.info("ai.model_reply", {
        mode: "mastra_orchestrator",
        tenantId: inputData.tenantId,
        botId: inputData.botId,
        provider: resolvedModel.providerUsed,
        model: resolvedModel.modelUsed,
        temperature,
        action: shouldHandoff ? "handoff" : "reply",
        ragResults: inputData.knowledge?.results.length ?? 0,
        topScore: inputData.knowledge?.results[0]?.score ?? null,
      });

      return {
        ...inputData,
        metadata: {
          ...(inputData.metadata || {}),
          trace,
        },
        action: shouldHandoff ? ("handoff" as const) : ("reply" as const),
        reply: replyText,
        ticket: ticketToCreate,
        responseId: (result as { runId?: string }).runId || "",
        providerUsed: resolvedModel.providerUsed,
        modelUsed: resolvedModel.modelUsed,
        modelCalled: true,
      };
    } finally {
      timeout.clear();
    }
  },
});

const persistResultStep = createStep({
  id: "persist-result",
  inputSchema: aiReplyRunContextSchema,
  outputSchema: aiReplyOutputSchema,
  execute: async ({ inputData }) => {
    if (!inputData.conversationId) {
      throw new Error("تعذر تحديد المحادثة.");
    }

    if (inputData.action === "skip") {
      return {
        generated: false,
        action: "skip" as const,
        conversationId: inputData.conversationId,
        confidence: null,
        reason: inputData.reason,
      };
    }

    let action: NonNullable<AiReplyRunContext["action"]> =
      inputData.action || "fallback";
    let reply =
      sanitizeCustomerReply(inputData.reply || "") ||
      inputData.setting?.fallbackMessage ||
      "أحتاج إلى معلومة إضافية حتى أجيب بدقة. ما المنتج أو الخدمة التي تقصدها؟";

    const validation = validateCustomerReply(reply);
    if (!validation.valid) {
      action = "fallback";
      reply =
        inputData.setting?.fallbackMessage ||
        "أحتاج إلى معلومة إضافية حتى أجيب بدقة. ما المنتج أو الخدمة التي تقصدها؟";
    }

    let ticketId: string | undefined;
    const shouldCreateTicket =
      inputData.ticket?.shouldCreate ||
      action === "handoff" ||
      (!validation.valid && inputData.modelCalled);

    if (shouldCreateTicket) {
      const ticket = await ensureTicketForConversation({
        tenantId: inputData.tenantId,
        botId: inputData.botId,
        conversationId: inputData.conversationId,
        triggerReason:
          inputData.ticket?.reason ||
          inputData.reason ||
          validation.reason ||
          "ai_followup_required",
        category: (inputData.ticket?.category ||
          (!validation.valid ? "ai_failed" : "human_request")) as TicketCategory,
        priority: (inputData.ticket?.priority || "medium") as TicketPriority,
        aiSummary: [
          `Reason: ${inputData.ticket?.reason || inputData.reason || validation.reason || "-"}`,
          `Channel: ${inputData.channel}`,
          `Knowledge confidence: ${inputData.confidence ?? "-"}`,
          `Last customer message: ${inputData.message}`,
        ].join("\n"),
        metadata: {
          workflow: "ai-reply-workflow",
          action,
          validation,
          knowledgeConfidence: inputData.confidence,
        },
      });
      ticketId = ticket?._id?.toString();
    }

    if (action === "handoff") {
      await Conversation.updateOne(
        { _id: inputData.conversationId, tenantId: inputData.tenantId, botId: inputData.botId },
        {
          $set: {
            status: "pending",
            mode: "human",
            aiPaused: true,
            aiPausedAt: new Date(),
            aiPausedReason: inputData.reason || "ticket_created",
            aiStatus: "escalated",
            handoffReason: inputData.reason || "ticket_created",
          },
        }
      );
    }

    let trace = markLatencyTrace(
      mergeLatencyTrace((inputData.metadata as any)?.trace, {
        traceId: (inputData.metadata as any)?.traceId || inputData.traceId,
      }),
      "assistantSavedAt"
    );

    const assistantMessage = await Message.create({
      tenantId: inputData.tenantId,
      botId: inputData.botId,
      conversationId: inputData.conversationId,
      provider: inputData.channel,
      direction: "outgoing",
      sender: "assistant",
      senderType: "assistant",
      content: reply,
      deliveryStatus: "queued",
      metadata: {
        trace: {
          ...trace,
          modelCalled: inputData.modelCalled === true,
        },
        responseId: inputData.responseId,
        provider: inputData.providerUsed || "mastra",
        model: inputData.modelUsed,
        orchestrator: "mastra",
        temperature: inputData.setting?.temperature ?? 0.6,
        action,
        reason: inputData.reason,
        ticketId,
        validation: validation.valid ? { valid: true } : validation,
        knowledge: inputData.knowledge
          ? {
              enabled: inputData.bot?.knowledgeEnabled ?? true,
              confidence: inputData.knowledge.confidence,
              intent: inputData.knowledge.intent,
              keywords: inputData.knowledge.keywords,
              sourceCount: inputData.knowledge.results.length,
              sources: (inputData.bot?.showKnowledgeSources
                ? inputData.knowledge.results.slice(0, 6)
                : []
              ).map((result) => ({
                title: result.sourceTitle,
                url: result.sourceUrl,
                score: result.score,
                documentId: result.documentId,
              })),
            }
          : { enabled: false },
      },
    });

    const createdAt = assistantMessage.createdAt?.toISOString?.() || new Date().toISOString();
    await Conversation.updateOne(
      { _id: inputData.conversationId, tenantId: inputData.tenantId, botId: inputData.botId },
      {
        $set: {
          lastMessageAt: new Date(),
          lastAiMessageAt: new Date(),
          lastAgentMessageAt: new Date(),
          lastMessagePreview: reply.slice(0, 220),
          aiStatus: action === "handoff" ? "escalated" : "active",
        },
        $inc: { aiTurnCount: 1 },
      }
    );

    await publishRealtimeEvent(inputData.tenantId, "message.created", {
      message: {
        id: assistantMessage._id.toString(),
        conversationId: inputData.conversationId,
        content: reply,
        direction: "outgoing",
        sender: "assistant",
        senderType: "assistant",
        provider: inputData.channel,
        deliveryStatus: assistantMessage.deliveryStatus,
        createdAt,
        attachments: [],
      },
      conversation: {
        id: inputData.conversationId,
        lastMessage: reply.slice(0, 220),
        lastMessageAt: createdAt,
        aiStatus: action === "handoff" ? "escalated" : "active",
      },
    });
    trace = markLatencyTrace(trace, "realtimePublishedAt");
    await Message.updateOne(
      { _id: assistantMessage._id, tenantId: inputData.tenantId },
      { $set: latencyTraceMongoSet({ ...trace, modelCalled: inputData.modelCalled === true }) }
    );

    if (inputData.modelCalled) {
      await recordAiMessageUsage(inputData.tenantId);
    }

    return {
      generated: action === "reply" || action === "fallback" || action === "handoff",
      action,
      reply,
      messageId: assistantMessage._id.toString(),
      conversationId: inputData.conversationId,
      confidence: inputData.confidence ?? null,
      reason: validation.valid ? inputData.reason : validation.reason,
      providerUsed: inputData.providerUsed || "mastra",
      modelUsed: inputData.modelUsed,
    };
  },
});

export const aiReplyWorkflow = createWorkflow({
  id: "ai-reply-workflow",
  inputSchema: aiReplyInputSchema,
  outputSchema: aiReplyOutputSchema,
})
  .then(loadConversationStep)
  .then(fastReplyStep)
  .then(moderationStep)
  .then(routeHandoffStep)
  .then(quotaStep)
  .then(knowledgeStep)
  .then(generateReplyStep)
  .then(persistResultStep)
  .commit();
