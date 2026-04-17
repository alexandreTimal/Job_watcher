import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { SearchTitle } from "@jobfindeer/validators";
import { llmTitleOutputSchema } from "@jobfindeer/validators";
import type { ModelId } from "./model-config";
import { MODEL_CONFIG, isAvailableModel } from "./model-config";
import {
  TITLE_GEN_SYSTEM_PROMPT,
  buildTitleGenUserPrompt,
  type BranchParams,
} from "./prompts";

export type { BranchParams };

const DEFAULT_MODEL: ModelId = "gemini-2.5-flash-lite";
const LLM_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TitleGenMetrics {
  model: string;
  modelLabel: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  costUsd: number;
  rawOutput: unknown;
}

export interface TitleGenResult {
  titles: SearchTitle[];
  metrics: TitleGenMetrics;
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
// Fallback generation
// ---------------------------------------------------------------------------

function buildFallbackTitles(params: BranchParams): SearchTitle[] {
  const titles: SearchTitle[] = [];
  const seen = new Set<string>();
  const push = (fr: string | null, en: string | null) => {
    const frNorm = fr ? fr.trim() : null;
    const enNorm = en ? en.trim() : null;
    if (!frNorm && !enNorm) return;
    const key = `${(frNorm ?? "").toLowerCase()}|${(enNorm ?? "").toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    titles.push({ fr: frNorm, en: enNorm });
  };

  const addWithVariants = (base: string) => {
    const b = sanitize(base);
    if (!b) return;
    push(b, null);
    const lower = b.toLowerCase();
    const already = ["senior", "junior", "confirme", "débutant", "debutant"].some((k) =>
      lower.includes(k),
    );
    if (already) {
      push(`${b} confirmé`, null);
      push(b, b);
    } else {
      push(`${b} senior`, null);
      push(`${b} confirmé`, null);
      push(`${b} junior`, null);
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

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function generateTitles(
  params: BranchParams,
  modelId?: string,
): Promise<TitleGenResult> {
  const resolvedModel: ModelId = isAvailableModel(modelId) ? modelId : DEFAULT_MODEL;
  const config = MODEL_CONFIG[resolvedModel];

  const userPrompt = buildTitleGenUserPrompt(params, { s: sanitize, sArr: sanitizeArray });

  async function callLLM() {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    try {
      const result = await generateText({
        model: google(resolvedModel),
        system: TITLE_GEN_SYSTEM_PROMPT,
        prompt: userPrompt,
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
        throw new Error(`Empty response from model (finishReason: ${String(result.finishReason)})`);
      }
      if (cleaned.length > 200_000) {
        throw new Error("Response too large");
      }
      const rawJson: unknown = JSON.parse(cleaned);
      const parsed = llmTitleOutputSchema.parse(rawJson);

      const usage = result.usage as Record<string, unknown> | undefined;
      const tokensIn = toNumber(usage?.promptTokens ?? usage?.input_tokens ?? usage?.inputTokens);
      const tokensOut = toNumber(usage?.completionTokens ?? usage?.output_tokens ?? usage?.outputTokens);

      return { titles: parsed.titles, rawJson, durationMs, tokensIn, tokensOut };
    } finally {
      clearTimeout(timeout);
    }
  }

  let lastError: unknown;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { titles, rawJson, durationMs, tokensIn, tokensOut } = await callLLM();
      const costUsd =
        (tokensIn / 1_000_000) * config.pricing.input +
        (tokensOut / 1_000_000) * config.pricing.output;

      return {
        titles,
        metrics: {
          model: resolvedModel,
          modelLabel: config.label,
          durationMs,
          tokensIn,
          tokensOut,
          tokensTotal: tokensIn + tokensOut,
          costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
          rawOutput: rawJson,
        },
      };
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts - 1) break;
      if (!isRetryableError(err)) break;
      const backoff = 300 + Math.floor(Math.random() * 400);
      await sleep(backoff);
    }
  }

  const fallbackTitles = buildFallbackTitles(params);
  return {
    titles: fallbackTitles,
    metrics: {
      model: resolvedModel,
      modelLabel: config.label + " (fallback)",
      durationMs: 0,
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: 0,
      costUsd: 0,
      rawOutput: { error: errorMessage(lastError), fallback: true },
    },
  };
}
