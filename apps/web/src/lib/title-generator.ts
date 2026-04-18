import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import {
  arbitreOutputSchema,
  llmTitleOutputSchema,
} from "@jobfindeer/validators";
import type {
  ArbitreOutput,
  NiveauCible,
  SearchTitle,
} from "@jobfindeer/validators";
import type { ModelId } from "./model-config";
import { MODEL_CONFIG, isAvailableModel } from "./model-config";
import {
  TITLE_ARBITRE_SYSTEM_PROMPT,
  TITLE_GEN_SYSTEM_PROMPT,
  buildArbitrePrompt,
  buildTitleGenUserPrompt,
} from "./prompts";
import type {
  BranchParams,
  CvProfileForArbitre,
  UserExpectations,
} from "./prompts";

export type { BranchParams, CvProfileForArbitre };

const DEFAULT_MODEL: ModelId = "gemini-3.1-flash-lite-preview";
const ARBITRE_TIMEOUT_MS = 12_000;
const GENERATOR_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateTitlesInput {
  branch_params: BranchParams;
  cv_profile: CvProfileForArbitre;
}

export interface StageMetrics {
  model: string;
  modelLabel: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  costUsd: number;
  rawOutput: unknown;
  fallback: boolean;
}

export interface TitleGenResult {
  arbitre: ArbitreOutput;
  titles: SearchTitle[];
  metrics: {
    arbitre: StageMetrics;
    generator: StageMetrics;
    total_cost_usd: number;
    total_duration_ms: number;
  };
}

// ---------------------------------------------------------------------------
// Input sanitization (prompt injection mitigation)
// ---------------------------------------------------------------------------

function sanitize(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/<\s*\/?\s*user_input\s*>/gi, "")
    .replace(/[<>]/g, "")
    .slice(0, 200)
    .trim();
}

function sanitizeArray(inputs: unknown): string[] {
  if (!Array.isArray(inputs)) return [];
  return inputs
    .filter((v): v is string => typeof v === "string")
    .map(sanitize)
    .filter((v) => v.length > 0)
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const maybeMsg = (err as { message?: unknown }).message;
    if (typeof maybeMsg === "string") return maybeMsg;
  }
  return "Unknown error";
}

function isRetryableError(err: unknown): boolean {
  if (err === null || err === undefined) return false;
  const msg = errorMessage(err);
  const statusMatch = /\b([45]\d\d)\b/.exec(msg);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  if (status !== null) {
    if (status === 429) return true;
    if (status >= 500) return true;
    return false;
  }
  if (err instanceof SyntaxError) return true;
  const name = err instanceof Error ? err.name : undefined;
  if (name === "AbortError") return true;
  return true;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function buildUserExpectationsFromBranch(
  p: BranchParams,
): UserExpectations {
  switch (p.branch) {
    case "1":
    case "2":
      return {
        declared_target_titles: [],
        declared_seniority: p.current_seniority_level,
      };
    case "3":
      return {
        declared_target_titles: p.target_jobs,
        declared_seniority: null,
      };
    case "4":
      return {
        declared_target_titles: p.target_jobs,
        declared_seniority: p.seniority_acceptance,
      };
    case "5":
      return { declared_target_titles: [], declared_seniority: null };
  }
}

// ---------------------------------------------------------------------------
// Stage 1 : Arbitre
// ---------------------------------------------------------------------------

interface ArbitreRunResult {
  arbitre: ArbitreOutput;
  metrics: StageMetrics;
}

async function runArbitre(
  input: GenerateTitlesInput,
  model: ModelId,
): Promise<ArbitreRunResult | null> {
  const config = MODEL_CONFIG[model];
  const userExpectations = buildUserExpectationsFromBranch(input.branch_params);
  const prompt = buildArbitrePrompt(
    {
      cv_profile: input.cv_profile,
      branch_params: input.branch_params,
      user_expectations: userExpectations,
    },
    { s: sanitize, sArr: sanitizeArray },
  );

  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ARBITRE_TIMEOUT_MS);
    try {
      const result = await generateText({
        model: google(model),
        system: TITLE_ARBITRE_SYSTEM_PROMPT,
        prompt,
        temperature: 0.2,
        maxOutputTokens: 800,
        abortSignal: controller.signal,
        providerOptions: {
          google: {
            structuredOutputs: false,
            responseMimeType: "application/json",
          },
        },
      });
      const durationMs = Date.now() - start;
      const cleaned = result.text
        .replace(/^\s*```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      if (!cleaned) {
        throw new Error(
          `Empty Arbitre response (finishReason: ${String(result.finishReason)})`,
        );
      }
      const rawJson: unknown = JSON.parse(cleaned);
      const arbitre = arbitreOutputSchema.parse(rawJson);

      const usage = result.usage as Record<string, unknown> | undefined;
      const tokensIn = toNumber(
        usage?.promptTokens ?? usage?.input_tokens ?? usage?.inputTokens,
      );
      const tokensOut = toNumber(
        usage?.completionTokens ?? usage?.output_tokens ?? usage?.outputTokens,
      );
      const costUsd =
        (tokensIn / 1_000_000) * config.pricing.input +
        (tokensOut / 1_000_000) * config.pricing.output;

      return {
        arbitre,
        metrics: {
          model,
          modelLabel: config.label,
          durationMs,
          tokensIn,
          tokensOut,
          tokensTotal: tokensIn + tokensOut,
          costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
          rawOutput: rawJson,
          fallback: false,
        },
      };
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts - 1) break;
      if (!isRetryableError(err)) break;
      const backoff = 300 + Math.floor(Math.random() * 400);
      await sleep(backoff);
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error("[ARBITRE] Failed:", errorMessage(lastError));
  return null;
}

function buildArbitreFallback(cv: CvProfileForArbitre): ArbitreOutput {
  const y = cv.experience_years;
  const niveau: NiveauCible =
    y < 2 ? "junior" : y < 5 ? "confirmé" : y < 10 ? "senior" : "lead";
  return {
    analyse_realite:
      "Calibration automatique basée sur ton expérience (mode dégradé, LLM indisponible).",
    niveau_cible_effectif: niveau,
    gap_detected: "none",
    rationale_debug: `FALLBACK: Arbitre LLM indisponible, niveau estimé depuis experience_years=${y}`,
  };
}

// ---------------------------------------------------------------------------
// Stage 2 : Generator
// ---------------------------------------------------------------------------

interface GeneratorRunResult {
  titles: SearchTitle[];
  metrics: StageMetrics;
}

async function runGenerator(
  params: BranchParams,
  arbitre: ArbitreOutput,
  model: ModelId,
): Promise<GeneratorRunResult | null> {
  const config = MODEL_CONFIG[model];
  const prompt = buildTitleGenUserPrompt(params, arbitre, {
    s: sanitize,
    sArr: sanitizeArray,
  });

  const maxAttempts = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GENERATOR_TIMEOUT_MS);
    try {
      const result = await generateText({
        model: google(model),
        system: TITLE_GEN_SYSTEM_PROMPT,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 2000,
        abortSignal: controller.signal,
        providerOptions: {
          google: {
            structuredOutputs: false,
            responseMimeType: "application/json",
          },
        },
      });
      const durationMs = Date.now() - start;
      const cleaned = result.text
        .replace(/^\s*```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      if (!cleaned) {
        throw new Error(
          `Empty Generator response (finishReason: ${String(result.finishReason)})`,
        );
      }
      if (cleaned.length > 200_000) {
        throw new Error("Response too large");
      }
      const rawJson: unknown = JSON.parse(cleaned);
      const parsed = llmTitleOutputSchema.parse(rawJson);

      const usage = result.usage as Record<string, unknown> | undefined;
      const tokensIn = toNumber(
        usage?.promptTokens ?? usage?.input_tokens ?? usage?.inputTokens,
      );
      const tokensOut = toNumber(
        usage?.completionTokens ?? usage?.output_tokens ?? usage?.outputTokens,
      );
      const costUsd =
        (tokensIn / 1_000_000) * config.pricing.input +
        (tokensOut / 1_000_000) * config.pricing.output;

      return {
        titles: parsed.titles,
        metrics: {
          model,
          modelLabel: config.label,
          durationMs,
          tokensIn,
          tokensOut,
          tokensTotal: tokensIn + tokensOut,
          costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
          rawOutput: rawJson,
          fallback: false,
        },
      };
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts - 1) break;
      if (!isRetryableError(err)) break;
      const backoff = 300 + Math.floor(Math.random() * 400);
      await sleep(backoff);
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error("[GENERATOR] Failed:", errorMessage(lastError));
  return null;
}

function buildFallbackTitles(params: BranchParams): SearchTitle[] {
  const titles: SearchTitle[] = [];
  const seen = new Set<string>();
  const push = (
    fr: string | null,
    en: string | null,
    niveau_ordinal: SearchTitle["niveau_ordinal"] = "aligné",
  ) => {
    const frNorm = fr ? fr.trim() : null;
    const enNorm = en ? en.trim() : null;
    if (!frNorm && !enNorm) return;
    const key = `${(frNorm ?? "").toLowerCase()}|${(enNorm ?? "").toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    titles.push({
      fr: frNorm,
      en: enNorm,
      niveau_ordinal,
      category: "classic_fr",
    });
  };

  const addWithVariants = (base: string) => {
    const b = sanitize(base);
    if (!b) return;
    push(b, null);
    const lower = b.toLowerCase();
    const already = ["senior", "junior", "confirme", "débutant", "debutant"].some(
      (k) => lower.includes(k),
    );
    if (already) {
      push(`${b} confirmé`, null);
      push(b, b);
    } else {
      push(`${b} senior`, null, "évolution_modérée");
      push(`${b} confirmé`, null);
      push(`${b} junior`, null, "sous-qualifié");
    }
  };

  if ("current_job_title" in params && params.current_job_title) {
    addWithVariants(params.current_job_title);
  }

  if ("target_jobs" in params && Array.isArray(params.target_jobs)) {
    for (const job of params.target_jobs) {
      addWithVariants(job);
    }
  }

  if (params.branch === "5") {
    const field = sanitize(params.education_field);
    if (field) {
      for (const ct of params.contract_types) {
        const prefix =
          ct === "apprenticeship"
            ? "Alternant"
            : ct === "internship"
              ? "Stagiaire"
              : "Junior";
        push(`${prefix} ${field}`, null);
      }
    }
  }

  if (titles.length === 0) {
    push("Emploi", "Job");
  }
  return titles;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateTitles(
  input: GenerateTitlesInput,
  modelId?: string,
): Promise<TitleGenResult> {
  const resolvedModel: ModelId = isAvailableModel(modelId)
    ? modelId
    : DEFAULT_MODEL;
  const config = MODEL_CONFIG[resolvedModel];

  const fallbackStageMetrics = (): StageMetrics => ({
    model: resolvedModel,
    modelLabel: config.label + " (fallback)",
    durationMs: 0,
    tokensIn: 0,
    tokensOut: 0,
    tokensTotal: 0,
    costUsd: 0,
    rawOutput: { fallback: true },
    fallback: true,
  });

  // 1. Arbitre
  const arbitreResult = await runArbitre(input, resolvedModel);
  const arbitre = arbitreResult?.arbitre ?? buildArbitreFallback(input.cv_profile);
  const arbitreMetrics: StageMetrics = arbitreResult?.metrics ?? fallbackStageMetrics();

  // 2. Generator
  const generatorResult = await runGenerator(
    input.branch_params,
    arbitre,
    resolvedModel,
  );
  const titles = generatorResult?.titles ?? buildFallbackTitles(input.branch_params);
  const generatorMetrics: StageMetrics =
    generatorResult?.metrics ?? fallbackStageMetrics();

  return {
    arbitre,
    titles,
    metrics: {
      arbitre: arbitreMetrics,
      generator: generatorMetrics,
      total_cost_usd:
        Math.round(
          (arbitreMetrics.costUsd + generatorMetrics.costUsd) * 1_000_000,
        ) / 1_000_000,
      total_duration_ms: arbitreMetrics.durationMs + generatorMetrics.durationMs,
    },
  };
}
