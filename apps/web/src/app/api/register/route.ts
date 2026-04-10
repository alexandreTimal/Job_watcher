import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "@jobfindeer/db/client";
import { users } from "@jobfindeer/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, password } = body as {
    name: string;
    email: string;
    password: string;
  };

  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: "Email et mot de passe requis (min 8 caractères)" },
      { status: 400 },
    );
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email" },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({
      name: name || null,
      email,
      hashedPassword,
    })
    .returning({ id: users.id });

  return NextResponse.json({ id: user!.id }, { status: 201 });
}
