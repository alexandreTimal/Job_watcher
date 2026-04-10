import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { auth } from "@jobfindeer/auth";
import { analyzeIntent } from "~/lib/intent-analyzer";

const requestSchema = z.object({
  freeText: z.string().min(100).max(500),
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
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
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
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[INTENT] Analysis failed:", err);
    return NextResponse.json(
      { error: "Analyse échouée", fallback: true },
      { status: 200 },
    );
  }
}
