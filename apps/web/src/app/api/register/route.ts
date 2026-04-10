import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod/v4";

import { db } from "@jobfindeer/db/client";
import { users } from "@jobfindeer/db/schema";

const registerSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide" },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Email valide et mot de passe (8-128 caractères) requis" },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [user] = await db
      .insert(users)
      .values({
        name: name?.trim() || null,
        email: email.toLowerCase().trim(),
        hashedPassword,
        trialEndsAt,
      })
      .returning({ id: users.id });

    return NextResponse.json({ id: user!.id }, { status: 201 });
  } catch (err: unknown) {
    // Handle unique constraint violation (race condition on duplicate email)
    const message = err instanceof Error ? err.message : "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return NextResponse.json(
        { error: "Impossible de créer ce compte" },
        { status: 409 },
      );
    }
    throw err;
  }
}
