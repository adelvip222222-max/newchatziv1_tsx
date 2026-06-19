import type { OpenAICompatibleConfig } from "@mastra/core/llm";
import { AiModel, AiProvider, AiSetting } from "@/lib/models";
import { decryptSecret } from "@/lib/crypto";

type ProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "deepseek"
  | "xai"
  | "groq"
  | "ollama"
  | "openai-compatible"
  | "google-gemini";

export type ResolvedMastraModel = {
  model: OpenAICompatibleConfig;
  providerUsed: string;
  modelUsed: string;
  source: "ai-model" | "ai-provider";
};

const DEFAULT_PROVIDER_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20240620",
  gemini: "gemini-1.5-pro",
  "google-gemini": "gemini-1.5-pro",
  openrouter: "openai/gpt-4o-mini",
  deepseek: "deepseek-chat",
  xai: "grok-beta",
  groq: "llama-3.1-8b-instant",
  ollama: "llama3",
  "openai-compatible": "gpt-4o-mini",
};

function normalizeProviderId(provider: ProviderId | string) {
  if (provider === "google-gemini" || provider === "gemini") return "google";
  return provider;
}

function defaultBaseUrl(provider: string, configuredBaseUrl?: string | null) {
  if (configuredBaseUrl) return configuredBaseUrl;
  if (provider === "openrouter") return "https://openrouter.ai/api/v1";
  if (provider === "deepseek") return "https://api.deepseek.com/v1";
  if (provider === "xai") return "https://api.x.ai/v1";
  if (provider === "groq") return "https://api.groq.com/openai/v1";
  if (provider === "ollama") return "http://localhost:11434/v1";
  return undefined;
}

function buildModelConfig(input: {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
}): OpenAICompatibleConfig {
  const providerId = normalizeProviderId(input.provider);
  const url = defaultBaseUrl(input.provider, input.baseUrl);

  return {
    providerId,
    modelId: input.model,
    ...(url ? { url } : {}),
    ...(input.apiKey ? { apiKey: input.apiKey } : {}),
  };
}

// ─── Model Resolution Cache ───────────────────────────────────────────────────
// Caches the resolved model per (tenantId:botId) for up to 5 minutes.
// This avoids 3–4 MongoDB queries on every single AI message.
const MODEL_CACHE_TTL_MS = Number(process.env.MASTRA_MODEL_CACHE_TTL_MS || 5 * 60_000);

type ModelCacheEntry = { value: ResolvedMastraModel; expiresAt: number };
const modelResolutionCache = new Map<string, ModelCacheEntry>();

function getModelFromCache(key: string): ResolvedMastraModel | null {
  const entry = modelResolutionCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    modelResolutionCache.delete(key);
    return null;
  }
  return entry.value;
}

function setModelCache(key: string, value: ResolvedMastraModel): void {
  modelResolutionCache.set(key, { value, expiresAt: Date.now() + MODEL_CACHE_TTL_MS });
  // Prune stale entries if cache grows large
  if (modelResolutionCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of modelResolutionCache) {
      if (v.expiresAt <= now) modelResolutionCache.delete(k);
    }
  }
}

export async function resolveMastraModelForBot(input: {
  tenantId: string;
  botId: string;
}): Promise<ResolvedMastraModel> {
  const cacheKey = `${input.tenantId}:${input.botId}`;
  const cached = getModelFromCache(cacheKey);
  if (cached) return cached;
  const setting = await AiSetting.findOne({
    tenantId: input.tenantId,
    botId: input.botId,
  }).lean();

  let aiModel = setting?.aiModelId
    ? await AiModel.findOne({
        _id: setting.aiModelId,
        isActive: true,
      }).lean()
    : null;

  aiModel ??= await AiModel.findOne({
    tenantId: input.tenantId,
    isActive: true,
    isDefault: true,
  }).lean();

  aiModel ??= await AiModel.findOne({
    isActive: true,
    isDefault: true,
  }).lean();

  if (aiModel) {
    const provider = aiModel.provider || "openai";
    const apiKey = decryptSecret(aiModel.apiKeyEncrypted) || "";
    const matchingProviderId =
      provider === "google-gemini" ? "gemini" : provider === "openai-compatible" ? "" : provider;
    const providerDoc = matchingProviderId
      ? await AiProvider.findOne({ providerId: matchingProviderId, isActive: true }).lean()
      : null;
    const providerApiKey = providerDoc ? decryptSecret(providerDoc.apiKeyEncrypted) || "" : "";
    const modelName = aiModel.model || DEFAULT_PROVIDER_MODELS[provider] || DEFAULT_PROVIDER_MODELS.openai;
    const resolvedKey = apiKey || providerApiKey;

    if (resolvedKey) {
      const resolved: ResolvedMastraModel = {
        model: buildModelConfig({
          provider,
          model: modelName,
          apiKey: resolvedKey,
          baseUrl: aiModel.baseUrl || providerDoc?.baseUrl || undefined,
        }),
        providerUsed: provider,
        modelUsed: modelName,
        source: "ai-model",
      };
      setModelCache(cacheKey, resolved);
      return resolved;
    }
  }

  const providers = await AiProvider.find({ isActive: true }).sort({ priority: 1 }).lean();
  const sortedProviders = [...providers].sort((a, b) => {
    if ((a.priority || 0) !== (b.priority || 0)) return (a.priority || 0) - (b.priority || 0);
    return a.isDefault ? -1 : 1;
  });

  for (const providerDoc of sortedProviders) {
    const provider = providerDoc.providerId as ProviderId;
    const apiKey = decryptSecret(providerDoc.apiKeyEncrypted) || "";
    if (!apiKey && provider !== "ollama") continue;

    const modelName = DEFAULT_PROVIDER_MODELS[provider] || DEFAULT_PROVIDER_MODELS.openai;

    const resolved: ResolvedMastraModel = {
      model: buildModelConfig({
        provider,
        model: modelName,
        apiKey,
        baseUrl: providerDoc.baseUrl,
      }),
      providerUsed: provider,
      modelUsed: modelName,
      source: "ai-provider",
    };
    setModelCache(cacheKey, resolved);
    return resolved;
  }

  throw new Error(
    "لا يوجد مزود ذكاء اصطناعي مفعّل. أضف مفتاحاً من صفحة مفاتيح الذكاء الاصطناعي."
  );
}

