# Auth Email/Password Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add email/password authentication to JobFindeer so users can create accounts, log in, and access protected routes. 100% free — no trial/subscription checks.

**Architecture:** Auth.js v5 (next-auth@beta) with Credentials provider, Drizzle adapter for session persistence, bcrypt for password hashing. The auth config lives in `packages/auth`, route handler in `apps/web`, and tRPC context wired to real sessions. JWT strategy (Credentials provider doesn't support DB sessions in Auth.js v5).

**Tech Stack:** next-auth@beta, @auth/drizzle-adapter, bcrypt, Auth.js Credentials provider

---

### Task 1: Add password column to users schema

**Files:**
- Modify: `packages/db/src/schema/auth.ts`

**Step 1: Add hashedPassword column**

In `packages/db/src/schema/auth.ts`, add a `hashedPassword` column to the `users` table:

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  hashedPassword: text("hashed_password"),
  image: text("image"),
  role: text("role", { enum: ["candidate", "admin"] })
    .notNull()
    .default("candidate"),
  trialEndsAt: timestamp("trial_ends_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
```

**Step 2: Generate migration**

Run: `cd packages/db && pnpm drizzle-kit generate`
Expected: A new migration SQL file is created in drizzle/

**Step 3: Push schema to dev DB**

Run: `cd packages/db && pnpm with-env drizzle-kit push`
Expected: Schema applied successfully

**Step 4: Commit**

```bash
git add packages/db/src/schema/auth.ts packages/db/drizzle/
git commit -m "feat(auth): add hashedPassword column to users table"
```

---

### Task 2: Install auth dependencies

**Files:**
- Modify: `packages/auth/package.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Install packages**

Run from repo root:
```bash
pnpm --filter @jobfindeer/auth add next-auth@beta @auth/drizzle-adapter bcrypt
pnpm --filter @jobfindeer/auth add -D @types/bcrypt
```

**Step 2: Verify install**

Run: `pnpm install`
Expected: No errors, lock file updated

**Step 3: Commit**

```bash
git add packages/auth/package.json pnpm-lock.yaml
git commit -m "feat(auth): install next-auth, drizzle-adapter, bcrypt"
```

---

### Task 3: Configure Auth.js in packages/auth

**Files:**
- Rewrite: `packages/auth/src/index.ts`

**Step 1: Write the Auth.js config**

Replace `packages/auth/src/index.ts` with:

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "@jobfindeer/db/client";
import { users, accounts, sessions, verificationTokens } from "@jobfindeer/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials.email as string;
        const password = credentials.password as string;

        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user?.hashedPassword) return null;

        const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordMatch) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export type { Session } from "next-auth";
```

**Step 2: Verify typecheck**

Run: `pnpm --filter @jobfindeer/auth typecheck`
Expected: No type errors (may need adjustments based on exact Auth.js types)

**Step 3: Commit**

```bash
git add packages/auth/src/index.ts
git commit -m "feat(auth): configure Auth.js v5 with Credentials provider and Drizzle adapter"
```

---

### Task 4: Create the Auth.js route handler

**Files:**
- Create: `apps/web/src/app/api/auth/[...nextauth]/route.ts`

**Step 1: Create the route handler**

```typescript
import { handlers } from "@jobfindeer/auth";

export const { GET, POST } = handlers;
```

**Step 2: Verify route loads**

Run: `pnpm --filter @jobfindeer/web dev` and navigate to `http://localhost:3000/api/auth/providers`
Expected: JSON response listing "credentials" provider

**Step 3: Commit**

```bash
git add apps/web/src/app/api/auth/
git commit -m "feat(auth): add NextAuth route handler"
```

---

### Task 5: Create the register API route

**Files:**
- Create: `apps/web/src/app/api/register/route.ts`

Since Auth.js Credentials provider doesn't handle registration, we need a separate endpoint.

**Step 1: Create registration endpoint**

```typescript
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
```

**Step 2: Test with curl**

Run (with dev server running):
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'
```
Expected: `{"id":"<uuid>"}` with status 201

**Step 3: Commit**

```bash
git add apps/web/src/app/api/register/
git commit -m "feat(auth): add user registration endpoint"
```

---

### Task 6: Create login page

**Files:**
- Create: `apps/web/src/app/(auth)/login/page.tsx`

**Step 1: Create login page with form**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
      return;
    }

    router.push("/feed");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Connexion à Job<span className="text-primary">Findeer</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Entrez vos identifiants pour accéder à votre compte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="vous@exemple.fr"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Pas encore de compte ?{" "}
          <a href="/register" className="text-primary hover:underline">
            S'inscrire
          </a>
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Verify page renders**

Navigate to `http://localhost:3000/login`
Expected: Login form displayed

**Step 3: Commit**

```bash
git add "apps/web/src/app/(auth)/login/"
git commit -m "feat(auth): add login page"
```

---

### Task 7: Create register page

**Files:**
- Create: `apps/web/src/app/(auth)/register/page.tsx`

**Step 1: Create register page with form**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de l'inscription");
      setLoading(false);
      return;
    }

    // Auto-login after registration
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Compte créé mais erreur de connexion. Essayez de vous connecter.");
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Créer un compte Job<span className="text-primary">Findeer</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Commencez votre veille emploi intelligente
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nom (optionnel)
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Votre nom"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="vous@exemple.fr"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Min. 8 caractères"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Déjà un compte ?{" "}
          <a href="/login" className="text-primary hover:underline">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Verify page renders**

Navigate to `http://localhost:3000/register`
Expected: Registration form displayed

**Step 3: Commit**

```bash
git add "apps/web/src/app/(auth)/register/"
git commit -m "feat(auth): add registration page"
```

---

### Task 8: Wire real session into tRPC context

**Files:**
- Modify: `packages/api/src/trpc.ts`
- Modify: `packages/api/package.json` (add @jobfindeer/auth dep)

**Step 1: Add auth dependency to api package**

Run: `pnpm --filter @jobfindeer/api add @jobfindeer/auth@workspace:*`

**Step 2: Update tRPC context to use real Auth.js session**

Replace `packages/api/src/trpc.ts` createTRPCContext:

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import { db } from "@jobfindeer/db/client";
import { auth } from "@jobfindeer/auth";

export const createTRPCContext = async (_opts: {
  headers: Headers;
}) => {
  const session = await auth();

  return {
    db,
    session,
  };
};
```

Keep the rest of the file (t init, timingMiddleware, publicProcedure, protectedProcedure) unchanged.

**Step 3: Verify typecheck**

Run: `pnpm --filter @jobfindeer/api typecheck`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/api/src/trpc.ts packages/api/package.json pnpm-lock.yaml
git commit -m "feat(auth): wire real Auth.js session into tRPC context"
```

---

### Task 9: Update navbar with auth state

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Add session-aware nav**

Update the nav section in `apps/web/src/app/layout.tsx` to show login/logout based on session:

```tsx
import { auth } from "@jobfindeer/auth";

// ... existing imports ...

export default async function RootLayout(props: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={cn(/* existing classes */)}>
        <ThemeProvider>
          <nav className="border-b px-6 py-3">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <a href="/" className="text-lg font-bold">
                Job<span className="text-primary">Findeer</span>
              </a>
              <div className="flex items-center gap-4 text-sm">
                {session?.user ? (
                  <>
                    <a href="/onboarding" className="hover:text-primary">Onboarding</a>
                    <a href="/feed" className="hover:text-primary">Feed</a>
                    <a href="/offers" className="hover:text-primary">Offres</a>
                    <a href="/settings" className="hover:text-primary">Settings</a>
                    <span className="text-muted-foreground">{session.user.email}</span>
                    <form action="/api/auth/signout" method="POST">
                      <button type="submit" className="hover:text-primary">Déconnexion</button>
                    </form>
                  </>
                ) : (
                  <>
                    <a href="/login" className="hover:text-primary">Connexion</a>
                    <a href="/register" className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm font-medium">S'inscrire</a>
                  </>
                )}
                <ThemeToggle />
              </div>
            </div>
          </nav>
          <TRPCReactProvider>{props.children}</TRPCReactProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Step 2: Verify**

Navigate to `http://localhost:3000` — should show Connexion/S'inscrire buttons.
Log in — should show nav links + email + Déconnexion.

**Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(auth): add session-aware navbar with login/logout"
```

---

### Task 10: Add AUTH_SECRET to .env and .env.example

**Files:**
- Modify: `.env.example`
- Modify: `.env` (local only, not committed)

**Step 1: Generate AUTH_SECRET**

Run: `npx auth secret`
Or: `openssl rand -base64 33`

**Step 2: Update .env.example**

Ensure `AUTH_SECRET=your-auth-secret-here` is present (it already is).

**Step 3: Add to local .env**

Add the generated secret to `.env`:
```
AUTH_SECRET=<generated-value>
```

**Step 4: Verify the full flow**

1. Start dev server: `pnpm --filter @jobfindeer/web dev`
2. Go to `/register`, create an account
3. Should auto-redirect to `/onboarding`
4. Navbar shows email + Déconnexion
5. Click Déconnexion — redirected, navbar shows Connexion/S'inscrire
6. Go to `/login`, log back in
7. Redirected to `/feed`

**Step 5: Commit**

```bash
git add .env.example
git commit -m "feat(auth): ensure AUTH_SECRET in env example"
```

---

### Task 11: Update auth tRPC router

**Files:**
- Modify: `packages/api/src/router/auth.ts`

**Step 1: Update auth router to return proper session**

```typescript
import type { TRPCRouterRecord } from "@trpc/server";

import { protectedProcedure, publicProcedure } from "../trpc";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),
} satisfies TRPCRouterRecord;
```

Remove `getSecretMessage` — it was a placeholder.

**Step 2: Commit**

```bash
git add packages/api/src/router/auth.ts
git commit -m "feat(auth): clean up auth router, return real session"
```
