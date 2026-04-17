import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth } from "@jobfindeer/auth";
import { analyzeIntent } from "~/lib/intent-analyzer";
import { AVAILABLE_MODEL_IDS } from "~/lib/model-config";
import { rateLimit } from "~/lib/rate-limit";

const requestSchema = z.object({
  freeText: z.string().min(100).max(500),
  model: z.enum(AVAILABLE_MODEL_IDS).optional(),
  profile: z
    .object({
      currentTitle: z.string().nullable(),
      experienceYears: z.number().nullable(),
      hardSkills: z.array(z.string()),
      softSkills: z.array(z.string()),
    })
    .nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const limit = rateLimit(`intent:${session.user.id}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes" },
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
      { error: "Texte requis (100-500 caractères)" },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeIntent(
      parsed.data.freeText,
      parsed.data.profile as Parameters<typeof analyzeIntent>[1],
      parsed.data.model,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[INTENT] Analysis failed:", err);
    return NextResponse.json(
      { error: "Analyse échouée" },
      { status: 500 },
    );
  }
}
