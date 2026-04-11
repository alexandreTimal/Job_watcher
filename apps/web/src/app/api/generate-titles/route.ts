import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth } from "@jobfindeer/auth";
import { branchEnum } from "@jobfindeer/validators";
import { generateTitles, type BranchParams } from "~/lib/title-generator";

const branch1Input = z.object({
  branch: z.literal("1"),
  current_job_title: z.string().min(1),
  current_seniority_level: z.string().min(1),
});

const branch2Input = z.object({
  branch: z.literal("2"),
  current_job_title: z.string().min(1),
  current_seniority_level: z.string().min(1),
  responsibility_jump_type: z.array(z.string()).min(1),
});

const branch3Input = z.object({
  branch: z.literal("3"),
  current_job_title: z.string().min(1),
  target_jobs: z.array(z.string()).min(1),
  salary_drop_tolerance: z.string().min(1),
  training_willingness: z.string().min(1),
});

const branch4Input = z.object({
  branch: z.literal("4"),
  target_jobs: z.array(z.string()).min(1),
  seniority_acceptance: z.string().min(1),
});

const branch5Input = z.object({
  branch: z.literal("5"),
  education_level: z.string().min(1),
  education_field: z.string().min(1),
  contract_type: z.string().min(1),
});

const ALLOWED_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
] as const;

const requestSchema = z.object({
  params: z.discriminatedUnion("branch", [
    branch1Input,
    branch2Input,
    branch3Input,
    branch4Input,
    branch5Input,
  ]),
  model: z.enum(ALLOWED_MODELS).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
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
      { error: "Parametres invalides", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await generateTitles(
      parsed.data.params as BranchParams,
      parsed.data.model,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GENERATE-TITLES] Generation failed:", err);
    return NextResponse.json(
      { error: "Generation echouee", fallback: true },
      { status: 200 },
    );
  }
}
