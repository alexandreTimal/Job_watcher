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
1. Langue des clés : Utilise STRICTEMENT les clés JSON en anglais définies dans le format attendu.
2. current_title : Isole uniquement l'intitulé du poste actuel le plus récent (ex: "Fondateur & CEO"). Supprime impérativement le nom de l'entreprise de ce champ.
3. experience_years : Calcule le total cumulé des années d'expérience professionnelle. Analyse les dates de début et de fin. Ne compte pas en double les expériences qui se chevauchent. Renvoie uniquement un entier.
4. education_level : Déduis le niveau d'études global standardisé (ex: "Bac+2", "Bac+3", "Bac+5") en te basant sur le diplôme le plus élevé trouvé.
5. Gestion du vide : Si une donnée textuelle est introuvable, renvoie 'null'. Si une liste (langues, expériences, diplômes, certifications) est vide, renvoie un tableau vide '[]'. N'invente aucune information.

FORMAT DE SORTIE ATTENDU :
Renvoie un objet JSON valide respectant strictement cette structure :
{
  "current_title": "string | null",
  "location": "string | null",
  "experience_years": integer,
  "hard_skills": ["string", "string"],
  "soft_skills": ["string", "string"],
  "languages": [
    {
      "name": "string",
      "level": "string"
    }
  ],
  "education_level": "string | null",
  "work_history": [
    {
      "title": "string",
      "company": "string",
      "start": "string (YYYY ou MM/YYYY)",
      "end": "string (YYYY, MM/YYYY ou 'Present')"
    }
  ],
  "education": [
    {
      "degree": "string",
      "school": "string",
      "year": integer
    }
  ],
  "certifications": ["string", "string"]
}

DOCUMENT À ANALYSER :
<cv>
${cvText}
</cv>`,
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
