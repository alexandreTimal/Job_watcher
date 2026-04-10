import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod/v4";
import { type ExtractedProfile } from "@jobfindeer/validators";

// Pricing per 1M tokens (USD)
const MODEL_CONFIG: Record<string, { label: string; pricing: { input: number; output: number } }> = {
  // Gemini 3.x
  "gemini-3.1-pro-preview": {
    label: "Gemini 3.1 Pro (preview)",
    pricing: { input: 1.25, output: 10.00 },
  },
  "gemini-3.1-flash-lite-preview": {
    label: "Gemini 3.1 Flash Lite (preview)",
    pricing: { input: 0.075, output: 0.30 },
  },
  "gemini-3-pro-preview": {
    label: "Gemini 3 Pro (preview)",
    pricing: { input: 1.25, output: 10.00 },
  },
  "gemini-3-flash-preview": {
    label: "Gemini 3 Flash (preview)",
    pricing: { input: 0.15, output: 0.60 },
  },
  // Gemini 2.5
  "gemini-2.5-pro": {
    label: "Gemini 2.5 Pro",
    pricing: { input: 1.25, output: 10.00 },
  },
  "gemini-2.5-flash": {
    label: "Gemini 2.5 Flash",
    pricing: { input: 0.15, output: 0.60 },
  },
  "gemini-2.5-flash-lite": {
    label: "Gemini 2.5 Flash Lite",
    pricing: { input: 0.075, output: 0.30 },
  },
  // Gemini 2.0
  "gemini-2.0-flash": {
    label: "Gemini 2.0 Flash",
    pricing: { input: 0.10, output: 0.40 },
  },
  "gemini-2.0-flash-lite": {
    label: "Gemini 2.0 Flash Lite",
    pricing: { input: 0.075, output: 0.30 },
  },
};

export const AVAILABLE_MODELS = Object.entries(MODEL_CONFIG).map(([id, cfg]) => ({
  id,
  label: cfg.label,
}));

export interface ExtractionMetrics {
  model: string;
  modelLabel: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  costUsd: number;
  costPer100: number;
  rawExtraction: unknown;
  rawUsage: unknown;
}

export interface ExtractionResult {
  profile: ExtractedProfile | null;
  metrics: ExtractionMetrics;
}

export async function extractProfileFromCV(cvText: string, modelId = "gemini-2.5-flash"): Promise<ExtractionResult> {
  const config = MODEL_CONFIG[modelId] ?? MODEL_CONFIG["gemini-2.5-flash"]!;
  const startTime = Date.now();

  const result = await generateText({
    model: google(modelId),
    providerOptions: {
      google: {
        structuredOutputs: false,
        responseMimeType: "application/json",
      },
    },
    prompt: `Ton objectif est d'extraire des informations structurées à partir d'un CV brut pour alimenter un algorithme de matching de recrutement.

RÈGLES D'EXTRACTION OBLIGATOIRES :
1. Précision : N'invente aucune information. Si une donnée (comme la localisation) est introuvable, utilise explicitement la valeur null.
2. Expérience : Calcule les années d'expérience totales de manière réaliste en te basant sur les dates des postes occupés. Renvoie uniquement un nombre entier (ex: 5).
3. Compétences : Sépare rigoureusement les technologies/outils (hard_skills) des qualités humaines (soft_skills).

FORMAT DE SORTIE ATTENDU :
Renvoie un objet JSON valide respectant strictement cette structure :
{
  "titre_actuel": "string ou null",
  "localisation": "string ou null",
  "annees_experience_totales": integer,
  "hard_skills": ["skill1", "skill2"],
  "soft_skills": ["skill1", "skill2"]
}

DOCUMENT À ANALYSER :
<cv>
${cvText}
</cv>`,
  });

  const durationMs = Date.now() - startTime;

  // Log raw response for debugging
  console.log("[EXTRACT] result.text length:", result.text.length);
  console.log("[EXTRACT] result.text (first 500):", result.text.slice(0, 500));
  console.log("[EXTRACT] result.finishReason:", result.finishReason);

  // Strip markdown fences if present, then parse JSON
  const text = result.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  if (!text) {
    throw new Error(`Empty response from model (finishReason: ${result.finishReason})`);
  }
  const rawJson: unknown = JSON.parse(text);

  // Transform LLM output (French field names) → ExtractedProfile (English schema)
  const llmOutputSchema = z.object({
    titre_actuel: z.string().nullable().optional(),
    localisation: z.string().nullable().optional(),
    annees_experience_totales: z.number().int().nullable().optional(),
    hard_skills: z.array(z.string()).optional().default([]),
    soft_skills: z.array(z.string()).optional().default([]),
  });

  const llmParsed = llmOutputSchema.safeParse(rawJson);
  let profile: ExtractedProfile | null;

  if (llmParsed.success) {
    const d = llmParsed.data;
    profile = {
      skills: [...d.hard_skills, ...d.soft_skills],
      experienceYears: d.annees_experience_totales ?? null,
      currentLocation: d.localisation ?? null,
      currentTitle: d.titre_actuel ?? null,
    };
  } else {
    console.warn("[EXTRACT] LLM output did not match expected schema:", llmParsed.error.message);
    profile = null;
  }

  const usage = result.usage as Record<string, unknown> | undefined;
  console.log("[EXTRACT] raw usage:", JSON.stringify(usage));

  const tokensIn = (usage?.promptTokens ?? usage?.input_tokens ?? usage?.inputTokens ?? 0) as number;
  const tokensOut = (usage?.completionTokens ?? usage?.output_tokens ?? usage?.outputTokens ?? 0) as number;

  const costUsd = (tokensIn / 1_000_000) * config.pricing.input + (tokensOut / 1_000_000) * config.pricing.output;

  return {
    profile,
    metrics: {
      model: modelId,
      modelLabel: config.label,
      durationMs,
      tokensIn,
      tokensOut,
      tokensTotal: tokensIn + tokensOut,
      costUsd,
      costPer100: costUsd * 100,
      rawExtraction: rawJson,
      rawUsage: usage,
    },
  };
}
