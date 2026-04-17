import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod/v4";
import { type ExtractedProfile } from "@jobfindeer/validators";
import { MODEL_CONFIG, AVAILABLE_MODELS, isAvailableModel } from "./model-config";
import { buildCvExtractionPrompt } from "./prompts";

export { AVAILABLE_MODELS };

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

// Zod schema matching the LLM JSON output (snake_case French fields)
const llmOutputSchema = z.object({
  current_title: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  experience_years: z.number().int().nullable().optional(),
  hard_skills: z.array(z.string()).optional().default([]),
  soft_skills: z.array(z.string()).optional().default([]),
  languages: z.array(z.object({
    name: z.string(),
    level: z.string().nullable(),
  })).optional().default([]),
  education_level: z.string().nullable().optional(),
  work_history: z.array(z.object({
    title: z.string(),
    company: z.string().nullable().optional(),
    start: z.string().nullable().optional(),
    end: z.string().nullable().optional(),
  })).optional().default([]),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string().nullable().optional(),
    year: z.number().int().nullable().optional(),
  })).optional().default([]),
  certifications: z.array(z.string()).optional().default([]),
});

export async function extractProfileFromCV(cvText: string, modelId = "gemini-2.5-flash"): Promise<ExtractionResult> {
  const resolvedModel = isAvailableModel(modelId) ? modelId : "gemini-2.5-flash";
  const config = MODEL_CONFIG[resolvedModel];
  const startTime = Date.now();

  const result = await generateText({
    model: google(resolvedModel),
    providerOptions: {
      google: {
        structuredOutputs: false,
        responseMimeType: "application/json",
      },
    },
    prompt: buildCvExtractionPrompt(cvText),
  });

  const durationMs = Date.now() - startTime;

  console.log("[EXTRACT] result.text length:", result.text.length);
  console.log("[EXTRACT] result.finishReason:", result.finishReason);

  // Strip markdown fences if present, then parse JSON
  const text = result.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  if (!text) {
    throw new Error(`Empty response from model (finishReason: ${result.finishReason})`);
  }
  const rawJson: unknown = JSON.parse(text);

  // Transform LLM output → ExtractedProfile
  const llmParsed = llmOutputSchema.safeParse(rawJson);
  let profile: ExtractedProfile | null;

  if (llmParsed.success) {
    const d = llmParsed.data;
    profile = {
      currentTitle: d.current_title ?? null,
      currentLocation: d.location ?? null,
      experienceYears: d.experience_years ?? null,
      hardSkills: d.hard_skills,
      softSkills: d.soft_skills,
      languages: d.languages.map((l) => ({ name: l.name, level: l.level ?? null })),
      educationLevel: d.education_level ?? null,
      workHistory: d.work_history.map((w) => ({
        title: w.title,
        company: w.company ?? null,
        start: w.start ?? null,
        end: w.end ?? null,
      })),
      education: d.education.map((e) => ({
        degree: e.degree,
        school: e.school ?? null,
        year: e.year ?? null,
      })),
      certifications: d.certifications,
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
      model: resolvedModel,
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
