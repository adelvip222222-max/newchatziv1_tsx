import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/server/auth/guards";
import { AiProvider, AiModel } from "@/lib/models";
import { connectToDatabase } from "@/lib/mongodb";
import { encryptSecret } from "@/lib/crypto";

const schema = z.object({
  providerId: z.enum(["openai", "anthropic", "gemini", "openrouter", "deepseek", "xai", "groq", "ollama"]),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  selectedModel: z.string().optional(), // The model to use as default for this provider
  isActive: z.boolean(),
  isDefault: z.boolean().optional(),
  priority: z.number().optional()
});

// Maps provider IDs to the AiModel provider field (which uses different naming)
const PROVIDER_TO_MODEL_PROVIDER: Record<string, string> = {
  openai: "openai",
  anthropic: "openai-compatible", // Anthropic uses OpenAI-compatible interface in Mastra
  gemini: "google-gemini",
  openrouter: "openai-compatible",
  deepseek: "openai-compatible",
  xai: "openai-compatible",
  groq: "openai-compatible",
  ollama: "openai-compatible",
};

// Default model fallbacks per provider
const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20240620",
  gemini: "gemini-2.0-flash",
  openrouter: "openai/gpt-4o-mini",
  deepseek: "deepseek-chat",
  xai: "grok-beta",
  groq: "llama-3.1-8b-instant",
  ollama: "llama3",
};

// Default base URLs for providers that need them
const PROVIDER_BASE_URLS: Record<string, string | undefined> = {
  openrouter: "https://openrouter.ai/api/v1",
  deepseek: "https://api.deepseek.com/v1",
  xai: "https://api.x.ai/v1",
  groq: "https://api.groq.com/openai/v1",
};

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = schema.parse(await request.json());
    await connectToDatabase();

    const providerNames: Record<string, string> = {
      "openai": "OpenAI",
      "anthropic": "Anthropic",
      "gemini": "Google Gemini",
      "openrouter": "OpenRouter",
      "deepseek": "DeepSeek",
      "xai": "xAI (Grok)",
      "groq": "Groq",
      "ollama": "Ollama"
    };

    const existing = await AiProvider.findOne({ providerId: body.providerId });
    
    // If setting as default, unset others
    if (body.isDefault) {
      await AiProvider.updateMany({}, { $set: { isDefault: false } });
    }

    const updateData: any = {
      name: providerNames[body.providerId] || body.providerId,
      isActive: body.isActive,
      ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.baseUrl !== undefined && { baseUrl: body.baseUrl })
    };

    let encryptedKey: string | undefined;
    if (body.apiKey && body.apiKey.trim().length > 0) {
      encryptedKey = encryptSecret(body.apiKey.trim());
      updateData.apiKeyEncrypted = encryptedKey;
    }

    if (existing) {
      await AiProvider.updateOne({ _id: existing._id }, { $set: updateData });
    } else {
      await AiProvider.create({
        providerId: body.providerId,
        ...updateData
      });
    }

    // ── Create or update a global AiModel entry for this provider ──────────────
    // This allows users to select this provider+model in the AI Settings page.
    const modelId = body.selectedModel || DEFAULT_MODELS[body.providerId] || "gpt-4o-mini";
    const modelProviderType = PROVIDER_TO_MODEL_PROVIDER[body.providerId] || "openai-compatible";
    const providerName = providerNames[body.providerId] || body.providerId;
    const modelName = `${providerName} — ${modelId}`;
    const baseUrl = body.baseUrl || PROVIDER_BASE_URLS[body.providerId];

    const modelUpdateData: Record<string, unknown> = {
      provider: modelProviderType,
      model: modelId,
      isActive: body.isActive,
      ...(baseUrl ? { baseUrl } : {}),
    };

    // Use the API key provided, or the existing encrypted one from the provider
    const existingProvider = await AiProvider.findOne({ providerId: body.providerId }).lean();
    const resolvedKeyEncrypted = encryptedKey || (existingProvider as any)?.apiKeyEncrypted || "";
    if (resolvedKeyEncrypted) {
      modelUpdateData.apiKeyEncrypted = resolvedKeyEncrypted;
    }

    if (body.isDefault) {
      // If this provider is set as default, make this model the default too
      await AiModel.updateMany({ isDefault: true }, { $set: { isDefault: false } });
      modelUpdateData.isDefault = true;
    }

    // Upsert: one AiModel per provider (identified by provider type + name pattern)
    await AiModel.findOneAndUpdate(
      { name: modelName },
      { $set: { ...modelUpdateData, name: modelName } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("AI Provider Setup Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حفظ إعدادات المزود." },
      { status: 400 }
    );
  }
}
