import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth } from "@jobfindeer/auth";
import type { GenerateTitlesInput } from "~/lib/title-generator";
import { generateTitles } from "~/lib/title-generator";
import { AVAILABLE_MODEL_IDS } from "~/lib/model-config";
import { rateLimit } from "~/lib/rate-limit";

const branch1Input = z.object({
  branch: z.literal("1"),
  current_job_title: z.string().min(1).max(200),
  current_seniority_level: z.string().min(1).max(50),
});

const branch2Input = z.object({
  branch: z.literal("2"),
  current_job_title: z.string().min(1).max(200),
  current_seniority_level: z.string().min(1).max(50),
  responsibility_jump_type: z.array(z.string().min(1).max(50)).min(1).max(10),
});

const branch3Input = z.object({
  branch: z.literal("3"),
  current_job_title: z.string().min(1).max(200),
  target_jobs: z.array(z.string().min(1).max(200)).min(1).max(10),
  salary_drop_tolerance: z.string().min(1).max(50),
  training_willingness: z.string().min(1).max(50),
});

const branch4Input = z.object({
  branch: z.literal("4"),
  target_jobs: z.array(z.string().min(1).max(200)).min(1).max(10),
  seniority_acceptance: z.string().min(1).max(50),
});

const branch5Input = z.object({
  branch: z.literal("5"),
  education_level: z.string().min(1).max(100),
  education_field: z.string().min(1).max(200),
  contract_types: z.array(z.string().min(1).max(50)).min(1).max(3),
});

const cvProfileSchema = z.object({
  current_title: z.string().max(200).nullable(),
  experience_years: z.number().int().min(0).max(70),
  education_level: z.string().max(100).nullable(),
  work_history: z
    .array(
      z.object({
        title: z.string().max(200),
        start: z.string().max(20),
        end: z.string().max(20),
      }),
    )
    .max(20),
});

const requestSchema = z.object({
  params: z.discriminatedUnion("branch", [
    branch1Input,
    branch2Input,
    branch3Input,
    branch4Input,
    branch5Input,
  ]),
  cv_profile: cvProfileSchema,
  model: z.enum(AVAILABLE_MODEL_IDS).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const limit = rateLimit(`generate-titles:${session.user.id}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de requetes" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parametres invalides" },
      { status: 400 },
    );
  }

  try {
    const input: GenerateTitlesInput = {
      branch_params: parsed.data.params as GenerateTitlesInput["branch_params"],
      cv_profile: parsed.data.cv_profile,
    };
    const result = await generateTitles(input, parsed.data.model);
    // generateTitles always returns {arbitre, titles, metrics} even on LLM failure (internal fallback).
    return NextResponse.json(result);
  } catch (err) {
    // Unexpected sync throw (e.g. invalid branch from an unsafe cast). Surface 500.
    console.error("[GENERATE-TITLES] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 },
    );
  }
}
