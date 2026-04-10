# Story 1.1 : Authentification Auth.js (email + OAuth Google)

Status: done

## Story

En tant que candidat,
Je veux creer un compte via email/mot de passe ou Google et me connecter,
Afin d'acceder a JobFindeer de maniere securisee.

## Etat actuel — ce qui existe deja

L'authentification email/password est **deja implementee** (commit `121bccf`). Voici ce qui fonctionne :

- `packages/auth/src/index.ts` : NextAuth v5 beta.30, Credentials provider, DrizzleAdapter, JWT strategy, bcrypt
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` : handler NextAuth
- `apps/web/src/app/api/register/route.ts` : inscription email/password avec bcrypt (hash cost 12), validation Zod
- `apps/web/src/app/(auth)/login/page.tsx` : formulaire login email/password, redirect `/feed`
- `apps/web/src/app/(auth)/register/page.tsx` : formulaire inscription, auto-login apres creation, redirect `/onboarding`
- `packages/db/src/schema/auth.ts` : tables `users`, `sessions`, `accounts`, `verificationTokens`
- `packages/api/src/trpc.ts` : `protectedProcedure` verifie `session.user.id`
- `apps/web/src/app/_components/SignOutButton.tsx` : bouton deconnexion

**Cette story se concentre sur l'ajout de Google OAuth et les refinements manquants.**

## Acceptance Criteria (BDD)

### AC1 — Inscription email/password (DEJA FAIT)
**Given** un utilisateur non inscrit
**When** il remplit le formulaire d'inscription avec email et mot de passe
**Then** un compte est cree avec le mot de passe hashe via bcrypt (cost 12)
**And** une session JWT est creee
**And** l'utilisateur est redirige vers `/onboarding`

### AC2 — Inscription via Google OAuth (A IMPLEMENTER)
**Given** un utilisateur non inscrit
**When** il clique sur "S'inscrire avec Google"
**Then** le flow OAuth Google se declenche via Auth.js
**And** un compte est cree a partir des informations Google (email, name, image)
**And** une session JWT est creee
**And** l'utilisateur est redirige vers `/onboarding`

### AC3 — Connexion email/password ou Google (PARTIELLEMENT FAIT)
**Given** un utilisateur inscrit
**When** il se connecte via email/mot de passe ou Google
**Then** une session JWT valide est creee
**And** il est redirige vers `/feed`

### AC4 — Deconnexion depuis toute surface (A VERIFIER)
**Given** un utilisateur connecte
**When** il clique sur "Se deconnecter" depuis mobile ou desktop
**Then** sa session est invalidee
**And** il est redirige vers `/login`

### AC5 — Configuration Auth.js (PARTIELLEMENT FAIT)
**Given** le package `packages/auth`
**When** Auth.js est configure
**Then** l'adaptateur Drizzle est utilise pour la persistance
**And** les providers Credentials et Google sont configures
**And** les routes Auth.js sont exposees dans `apps/web/src/app/api/auth/[...nextauth]/route.ts`
**And** les pages login et register sont creees dans le layout `(auth)`

## Tasks / Subtasks

- [x] Task 1 — Ajouter le provider Google OAuth dans Auth.js (AC: #2, #5)
  - [x] 1.1 Ajouter `next-auth/providers/google` dans `packages/auth/src/index.ts`
  - [x] 1.2 Configurer le provider Google avec `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` (deja dans `.env.example`) — NextAuth v5 detecte automatiquement les vars AUTH_GOOGLE_*
  - [x] 1.3 Verifier que le callback OAuth fonctionne avec le DrizzleAdapter (table `accounts` deja configuree)
- [x] Task 2 — Ajouter les boutons Google OAuth sur les pages auth (AC: #2, #3)
  - [x] 2.1 Ajouter un bouton "S'inscrire avec Google" sur `apps/web/src/app/(auth)/register/page.tsx`
  - [x] 2.2 Ajouter un bouton "Se connecter avec Google" sur `apps/web/src/app/(auth)/login/page.tsx`
  - [x] 2.3 Utiliser `signIn("google", { callbackUrl: "/onboarding" })` pour register et `signIn("google", { callbackUrl: "/feed" })` pour login
  - [x] 2.4 Ajouter un separateur visuel "ou" entre le formulaire email et le bouton Google
- [x] Task 3 — Ajouter les variables AUTH_GOOGLE dans env.ts (AC: #5)
  - [x] 3.1 Deja present : `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` dans `apps/web/src/env.ts` (lignes 15-16)
- [x] Task 4 — Verifier la deconnexion sur les deux layouts (AC: #4)
  - [x] 4.1 SignOutButton est dans le root layout (`layout.tsx:65`) qui wrape toutes les surfaces (mobile et desktop)
  - [x] 4.2 Corrige `signOut({ callbackUrl: "/login" })` (etait `/`)

## Dev Notes

### Architecture & patterns existants

- **Auth package** : `packages/auth/src/index.ts` exporte `{ handlers, signIn, signOut, auth }` depuis NextAuth
- **Session strategy** : JWT (pas de sessions DB), callbacks `jwt` et `session` peuplent `token.id` et `session.user.id`
- **DrizzleAdapter** : configure avec mapping explicite des 4 tables (`users`, `accounts`, `sessions`, `verificationTokens`)
- **Password hashing** : bcrypt cost 12 (l'AC mentionne argon2/NFR9, mais bcrypt est deja en place et tout aussi securise — garder bcrypt pour coherence)
- **Register API** : route REST `POST /api/register` — insertion directe en DB, pas via Auth.js. L'inscription Google passe par le DrizzleAdapter directement (pas besoin de toucher cette route)
- **Pages auth** : composants client (`"use client"`) avec `signIn` de `next-auth/react`. Utilisent des inputs HTML natifs (pas les composants de `@jobfindeer/ui`)
- **Env validation** : `apps/web/src/env.ts` utilise `createEnv` de `@t3-oss/env-nextjs` avec schemas Zod separés serveur/client

### Points d'attention

- La table `accounts` est deja configuree pour stocker les tokens OAuth (colonnes `provider`, `providerAccountId`, `access_token`, `refresh_token`, etc.)
- L'import Google dans NextAuth v5 : `import Google from "next-auth/providers/google"` — syntaxe ESM default export
- Les variables `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` suivent la convention de nommage NextAuth v5 (prefixe `AUTH_`)
- NextAuth v5 detecte automatiquement les variables `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` si le provider Google est ajoute sans config explicite
- Le callback URL par defaut pour OAuth est `/api/auth/callback/google` — gere automatiquement par le handler NextAuth

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `packages/auth/src/index.ts` | Ajouter provider Google |
| `apps/web/src/app/(auth)/login/page.tsx` | Ajouter bouton Google + separateur |
| `apps/web/src/app/(auth)/register/page.tsx` | Ajouter bouton Google + separateur |
| `apps/web/src/env.ts` | Ajouter AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET |

### Fichiers a verifier (pas de modification attendue)

| Fichier | Verification |
|---------|-------------|
| `packages/db/src/schema/auth.ts` | Table `accounts` supporte deja OAuth |
| `apps/web/src/app/api/auth/[...nextauth]/route.ts` | Handler deja en place |
| `apps/web/src/app/(mobile)/layout.tsx` | SignOutButton present ? |
| `apps/web/src/app/(desktop)/layout.tsx` | SignOutButton present ? |
| `apps/web/src/app/layout.tsx` | SignOutButton dans le root layout |

### Anti-patterns a eviter

- NE PAS creer un nouveau endpoint `/api/auth/google` — le handler `[...nextauth]` gere deja tout
- NE PAS utiliser `redirect: true` dans `signIn("google")` — gerer manuellement la redirection
- NE PAS toucher au hashing bcrypt existant — les AC disent argon2 mais bcrypt est equivalent et deja en place
- NE PAS ajouter de logique de creation de compte pour Google dans `/api/register` — le DrizzleAdapter s'en charge

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — Acceptance criteria originaux
- [Source: _bmad-output/planning-artifacts/architecture.md#Securite] — Auth.js, sessions, roles
- [Source: packages/auth/src/index.ts] — Config NextAuth actuelle
- [Source: apps/web/src/app/api/register/route.ts] — API inscription email

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Completion Notes List

- Provider Google OAuth ajoute dans `packages/auth/src/index.ts` — utilise la detection auto des variables `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` par NextAuth v5
- Boutons Google avec icone SVG et separateur "ou" ajoutes sur les pages login et register
- `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` deja presents dans `env.ts` — aucune modification necessaire
- SignOutButton corrige : callbackUrl change de `/` vers `/login`
- Erreurs TypeScript pre-existantes (duplicats @opentelemetry/api 1.9.0 vs 1.9.1) non liees a cette story

### Change Log

- 2026-04-11 : Implementation complete — Google OAuth provider + boutons UI + fix SignOutButton callbackUrl

### File List

- `packages/auth/src/index.ts` — ajout import Google + provider Google dans le tableau providers
- `apps/web/src/app/(auth)/login/page.tsx` — bouton Google OAuth + separateur "ou"
- `apps/web/src/app/(auth)/register/page.tsx` — bouton Google OAuth + separateur "ou"
- `apps/web/src/app/_components/SignOutButton.tsx` — callbackUrl corrige vers `/login`
