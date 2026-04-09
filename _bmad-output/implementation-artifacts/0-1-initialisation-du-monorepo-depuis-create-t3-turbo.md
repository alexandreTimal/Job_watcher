# Story 0.1: Initialisation du monorepo depuis create-t3-turbo

Status: review

## Story

En tant que developpeur,
Je veux un monorepo TypeScript initialise depuis create-t3-turbo avec la structure nettoyee,
Afin de disposer de la fondation technique pour developper toutes les features.

## Acceptance Criteria

1. **AC1 — Clone et structure de base**
   - Given un repertoire vide
   - When le starter create-t3-turbo est clone et nettoye
   - Then le monorepo contient `apps/web` (Next.js 15 App Router), `packages/db` (Drizzle), `packages/api` (tRPC v11), `packages/ui` (shadcn/ui + Tailwind v4), `packages/validators` (Zod)

2. **AC2 — Suppression Expo**
   - And `apps/expo` est supprime (app native prevue Phase 2)

3. **AC3 — Retrait better-auth**
   - And `better-auth` est retire du package `packages/auth`

4. **AC4 — Packages supplementaires**
   - And les packages supplementaires sont crees : `apps/pipeline`, `packages/queue`, `packages/email`

5. **AC5 — Configuration tooling**
   - And `turbo.json`, `pnpm-workspace.yaml`, `tsconfig` de base sont configures

6. **AC6 — Variables d'environnement**
   - And `.env.example` liste toutes les variables d'environnement requises

7. **AC7 — Gitignore**
   - And `.gitignore` exclut `node_modules/`, `.env`, `data/`

8. **AC8 — Build fonctionnel**
   - And `pnpm install` et `pnpm build` s'executent sans erreur

## Tasks / Subtasks

- [x] Task 1 — Cloner et nettoyer le starter (AC: 1, 2, 3)
  - [x] 1.1 Cloner `create-t3-turbo` dans un nouveau repertoire
  - [x] 1.2 Supprimer entierement `apps/expo/` (dossier + references dans turbo.json et pnpm-workspace)
  - [x] 1.3 Retirer `better-auth` de `packages/auth` (deps + code) — garder le dossier pour Auth.js (Story 1.1)
  - [x] 1.4 Adapter les references Supabase dans `packages/db` vers Postgres classique (`DATABASE_URL`)

- [x] Task 2 — Creer les packages manquants (AC: 4)
  - [x] 2.1 Creer `apps/pipeline/` : `package.json`, `tsconfig.json`, `src/index.ts` (entry point vide)
  - [x] 2.2 Creer `packages/queue/` : `package.json`, `tsconfig.json`, `src/index.ts` (export vide)
  - [x] 2.3 Creer `packages/email/` : `package.json`, `tsconfig.json`, `src/index.ts` (export vide)

- [x] Task 3 — Configurer le tooling (AC: 5)
  - [x] 3.1 Mettre a jour `turbo.json` pour inclure `apps/pipeline` dans le pipeline (build, lint, typecheck)
  - [x] 3.2 Verifier `pnpm-workspace.yaml` (doit lister `apps/*`, `packages/*`, `tooling/*`)
  - [x] 3.3 Configurer les `tsconfig.json` de chaque nouveau package — heritage de `tooling/typescript/base.json`
  - [x] 3.4 Configurer les champs `exports` dans chaque `package.json` pour les imports internes

- [x] Task 4 — Variables d'environnement et gitignore (AC: 6, 7)
  - [x] 4.1 Creer `.env.example` a la racine avec toutes les variables (voir section Dev Notes)
  - [x] 4.2 Mettre a jour `.gitignore` : ajouter `data/`, verifier `node_modules/`, `.env`, `.env.local`

- [x] Task 5 — Validation build (AC: 8)
  - [x] 5.1 Executer `pnpm install` — zero erreur
  - [x] 5.2 Executer `pnpm build` — zero erreur
  - [x] 5.3 Executer `pnpm lint` — zero erreur
  - [x] 5.4 Executer `pnpm typecheck` — zero erreur

## Dev Notes

### Contexte projet important

Ce projet **remplace** le prototype CLI `Job_watcher` existant (dossiers `src/`, `dashboard/`, `scripts/`). Le monorepo create-t3-turbo sera la nouvelle architecture. Le code du prototype est conserve dans l'historique git mais ne fait pas partie de la nouvelle structure.

**Decision :** Initialiser le monorepo dans un nouveau repertoire, puis migrer vers ce repo. Ne PAS essayer de restructurer le code existant en place.

### Stack technique exacte

| Technologie | Version | Package |
|---|---|---|
| TypeScript | strict | Herite du starter |
| Node.js | 20+ | Runtime |
| pnpm | 9+ | Package manager |
| Turborepo | 2.9+ | Monorepo orchestration |
| Next.js | 15 | `apps/web` (App Router, React 19) |
| Drizzle ORM | latest | `packages/db` |
| tRPC | v11 | `packages/api` |
| Tailwind CSS | v4 | `packages/ui` (via shadcn/ui) |
| shadcn/ui | latest | `packages/ui` |
| Zod | latest | `packages/validators` |

### Structure cible du monorepo

```
jobfindeer/
├── apps/
│   ├── web/                  # Next.js 15 (App Router, PWA)
│   │   ├── src/app/
│   │   │   ├── (mobile)/     # Layout mobile (vide, pret)
│   │   │   ├── (desktop)/    # Layout desktop (vide, pret)
│   │   │   └── (auth)/       # Layout auth (pret pour Story 1.1)
│   │   ├── public/
│   │   │   └── manifest.json # PWA manifest (basique)
│   │   └── next.config.js    # output: 'standalone'
│   └── pipeline/             # Workers BullMQ (a creer)
│       ├── src/
│       │   └── index.ts      # Entry point (vide)
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── api/                  # tRPC v11 routers (du starter)
│   ├── auth/                 # Auth.js (vide apres retrait better-auth)
│   ├── db/                   # Drizzle ORM + Postgres (du starter, adapte)
│   ├── ui/                   # shadcn/ui + Tailwind v4 (du starter)
│   ├── validators/           # Schemas Zod partages (du starter)
│   ├── queue/                # Config BullMQ (a creer)
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── email/                # React Email + Resend (a creer)
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── tooling/
│   ├── typescript/           # tsconfig de base
│   ├── tailwind/             # config Tailwind partagee
│   └── eslint/               # config ESLint partagee
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
└── package.json
```

### Variables d'environnement (.env.example)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/jobfindeer

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Auth.js
AUTH_SECRET=your-auth-secret-here
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email (Resend)
RESEND_API_KEY=

# LLM (Gemini via Vercel AI SDK)
GOOGLE_GENERATIVE_AI_API_KEY=

# Chiffrement colonnes sensibles
PGCRYPTO_KEY=

# Error tracking
SENTRY_DSN=

# France Travail API
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=
```

### Modifications specifiques du starter create-t3-turbo

**Retrait `apps/expo` :**
- Supprimer le dossier `apps/expo/`
- Retirer les references dans `turbo.json` (tasks specifiques expo)
- Nettoyer les scripts racine qui referencent expo

**Retrait `better-auth` :**
- Dans `packages/auth/` : supprimer les deps `better-auth` du `package.json`
- Vider le code d'implementation mais garder la structure du package
- Le `src/index.ts` exporte un placeholder vide (Auth.js sera configure en Story 1.1)

**Adaptation Postgres (au lieu de Supabase) :**
- Dans `packages/db/` : modifier `drizzle.config.ts` pour utiliser `DATABASE_URL` directement
- Retirer toute reference a Supabase ou a son client
- La connexion Drizzle utilise `postgres` driver natif (pas `@supabase/supabase-js`)

### Nouveaux packages — Structure minimale

Chaque nouveau package (`apps/pipeline`, `packages/queue`, `packages/email`) doit avoir :

**`package.json` :**
```json
{
  "name": "@jobfindeer/queue",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  }
}
```

**`tsconfig.json` :**
```json
{
  "extends": "../../tooling/typescript/base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**`src/index.ts` :** Export vide (`export {}` ou exports types placeholder).

**Nommage des packages :** Scope `@jobfindeer/` (ex: `@jobfindeer/queue`, `@jobfindeer/email`, `@jobfindeer/pipeline`).

### Conventions de code a respecter des l'init

- Fichiers TS : `kebab-case.ts`
- Composants React : `PascalCase.tsx`
- Types/Interfaces : `PascalCase`
- Fonctions/variables : `camelCase`
- Constantes : `UPPER_SNAKE_CASE`
- Schemas Zod : `camelCase` + suffixe `Schema` (ex: `createUserSchema`)
- Tables DB : `snake_case` pluriel (ex: `user_feeds`)
- Colonnes DB : `snake_case` (ex: `user_id`)
- TypeScript strict — pas de `any`, pas de `// @ts-ignore`
- Pas de `console.log` direct — utiliser un logger structure
- Pas de secrets en dur dans le code

### Contraintes d'infrastructure

- **Pas de Vercel** pour le deploiement — VPS Hetzner + Docker Compose + Caddy
- `next.config.js` doit avoir `output: 'standalone'` (pour le build Docker)
- Le `docker-compose.dev.yml` sera cree dans Story 0.2, pas ici
- Les layouts `(mobile)` et `(desktop)` doivent etre crees vides (juste le layout wrapper)
- Le `manifest.json` PWA basique doit etre present dans `apps/web/public/`

### Anti-patterns a eviter

- Ne PAS installer de dependances qui seront ajoutees dans les stories suivantes (BullMQ, Stripe, Sentry, etc.)
- Ne PAS configurer la DB au-dela du driver Postgres basique (le schema viendra en Story 0.2)
- Ne PAS creer de routes API — juste la structure de dossiers
- Ne PAS ajouter de logique metier dans les packages crees — exports vides uniquement
- Ne PAS garder de code du prototype `Job_watcher` dans la nouvelle structure

### Project Structure Notes

- Le monorepo suit exactement la structure `create-t3-turbo` avec les ajouts decrits
- Les imports entre packages utilisent le champ `exports` du `package.json` (pas de paths relatifs)
- Chaque package est independant et buildable isolement
- Le `turbo.json` orchestre build, lint, typecheck pour tous les packages

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Section Infrastructure, Tech Stack, Project Structure]
- [Source: _bmad-output/planning-artifacts/prd.md — Section Stack Technique, Infrastructure]
- [Source: _bmad-output/planning-artifacts/epics.md — Sprint 0, Story 0.1]
- [Starter: https://github.com/t3-oss/create-t3-turbo]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fix: sherif lint exigeait l'ordre alphabetique des deps dans packages/db/package.json
- Fix: @types/node manquant dans packages/db pour compiler client.ts (process.env)
- Fix: packages/api/tsconfig.json necessite lib:dom pour Headers/setTimeout
- Fix: .env requis pour le build Next.js (validation DATABASE_URL via t3-env)
- Fix: styles.css referençait encore @acme/tailwind-config (fichier CSS non touche par le sed)
- Fix: eslint-config typecheck — turboPlugin.configs.recommended type assertion
- Fix: VERCEL_URL reference retiree de trpc/react.tsx (pas de deploiement Vercel)
- Fix: packages/auth tsconfig incluait *.ts — restreint a src/ uniquement

### Completion Notes List

- Monorepo create-t3-turbo clone, nettoye et adapte avec scope @jobfindeer
- apps/expo et apps/tanstack-start supprimes (non clones)
- better-auth entierement retire (packages/auth, packages/api, apps/web)
- @vercel/postgres remplace par postgres natif (driver postgres.js)
- Schema DB vide (auth-schema.ts et Post table supprimes)
- 3 nouveaux packages crees : apps/pipeline, packages/queue, packages/email
- Layouts (mobile), (desktop), (auth) crees vides dans apps/web
- manifest.json PWA basique cree dans apps/web/public
- next.config.js configure avec output: standalone
- .env.example avec toutes les variables requises
- .gitignore nettoye (sans expo, vercel, tanstack)
- Toutes les refs Vercel retirees (globalPassThroughEnv, env.ts, react.tsx)
- pnpm install, build, lint, typecheck — zero erreur

### Change Log

- 2026-04-09: Implementation complete de la Story 0.1

### File List

- package.json (modifie — renomme jobfindeer, scripts nettoyes)
- pnpm-workspace.yaml (modifie — better-auth retire du catalog)
- turbo.json (modifie — globalEnv adaptes, Vercel refs retirees)
- .env.example (modifie — toutes les variables du projet)
- .env (cree — variables dev locales)
- .gitignore (modifie — nettoye expo/vercel, ajoute data/)
- apps/web/package.json (cree — renomme @jobfindeer/web, better-auth retire)
- apps/web/next.config.js (modifie — output standalone, @jobfindeer scope)
- apps/web/src/env.ts (modifie — DATABASE_URL, retire authEnv/vercel)
- apps/web/src/app/layout.tsx (modifie — metadata JobFindeer, lang fr)
- apps/web/src/app/page.tsx (modifie — page accueil JobFindeer)
- apps/web/src/app/styles.css (modifie — @jobfindeer/tailwind-config)
- apps/web/src/app/(mobile)/layout.tsx (cree — layout vide)
- apps/web/src/app/(desktop)/layout.tsx (cree — layout vide)
- apps/web/src/app/(auth)/layout.tsx (cree — layout vide)
- apps/web/src/trpc/server.tsx (modifie — auth retire)
- apps/web/src/trpc/react.tsx (modifie — VERCEL_URL retire)
- apps/web/src/app/api/trpc/[trpc]/route.ts (modifie — auth retire)
- apps/web/public/manifest.json (cree — PWA basique)
- apps/pipeline/package.json (cree)
- apps/pipeline/tsconfig.json (cree)
- apps/pipeline/eslint.config.ts (cree)
- apps/pipeline/src/index.ts (cree — vide)
- packages/auth/package.json (modifie — better-auth retire)
- packages/auth/src/index.ts (modifie — export vide)
- packages/auth/tsconfig.json (modifie — include src only)
- packages/db/package.json (modifie — postgres remplace @vercel/postgres)
- packages/db/src/client.ts (modifie — postgres.js natif)
- packages/db/src/schema.ts (modifie — vide, auth-schema retire)
- packages/db/drizzle.config.ts (modifie — DATABASE_URL)
- packages/api/package.json (modifie — auth dep retiree)
- packages/api/src/trpc.ts (modifie — auth retire du contexte)
- packages/api/src/root.ts (modifie — post router retire)
- packages/api/tsconfig.json (modifie — lib dom ajoute)
- packages/queue/package.json (cree)
- packages/queue/tsconfig.json (cree)
- packages/queue/eslint.config.ts (cree)
- packages/queue/src/index.ts (cree — vide)
- packages/email/package.json (cree)
- packages/email/tsconfig.json (cree)
- packages/email/eslint.config.ts (cree)
- packages/email/src/index.ts (cree — vide)
- tooling/eslint/base.ts (modifie — turbo plugin type fix)
