# Story 1.2 : Essai gratuit 7 jours & roles utilisateur

Status: done

## Story

En tant que candidat,
Je veux beneficier d'un essai gratuit de 7 jours sans carte bancaire,
Afin de tester JobFindeer avant de m'engager financierement.

## Etat actuel

- Schema `users` a deja `role` (enum candidate|admin, default candidate) et `trialEndsAt` (timestamp nullable)
- `protectedProcedure` verifie uniquement `session.user.id` — pas de check trial/abonnement
- Pas de `adminProcedure`
- `/api/register` ne set pas `trialEndsAt`
- OAuth (Google) ne set pas `trialEndsAt` non plus

## Acceptance Criteria

### AC1 — Trial 7 jours a l'inscription
Given un nouvel utilisateur qui s'inscrit
When son compte est cree (email ou Google)
Then `trial_ends_at` = now + 7 jours, role = candidate

### AC2 — Acces bloque apres expiration
Given un utilisateur dont l'essai est expire et sans abonnement actif
When il tente d'acceder au feed ou fonctionnalites premium
Then il est redirige vers la page d'abonnement

### AC3 — Middleware tRPC
Given le middleware tRPC
When une `protectedProcedure` est appelee
Then l'utilisateur doit etre authentifie ET avoir un essai actif ou abonnement valide
And une `adminProcedure` verifie en plus que le role est admin

## Tasks / Subtasks

- [x] Task 1 — Setter trialEndsAt a l'inscription email (AC: #1)
  - [x] 1.1 Dans `/api/register/route.ts`, ajouter `trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)` a l'insertion
- [x] Task 2 — Setter trialEndsAt a l'inscription Google OAuth (AC: #1)
  - [x] 2.1 Dans `packages/auth/src/index.ts`, ajouter un callback `events.createUser` qui set `trialEndsAt` pour les nouveaux utilisateurs OAuth
- [x] Task 3 — Enrichir le token JWT avec role et trialEndsAt (AC: #2, #3)
  - [x] 3.1 Dans le callback `jwt`, ajouter `token.role` et `token.trialEndsAt` depuis la DB au premier login (trigger signIn/signUp)
  - [x] 3.2 Dans le callback `session`, exposer `session.user.role` et `session.user.trialEndsAt`
  - [x] 3.3 Creer `packages/auth/src/types.ts` pour augmenter les types Session et JWT de NextAuth
- [x] Task 4 — Ajouter la verification trial dans protectedProcedure (AC: #3)
  - [x] 4.1 protectedProcedure verifie trialEndsAt > now (TODO Epic 6: check subscription)
  - [x] 4.2 Throw FORBIDDEN avec message "TRIAL_EXPIRED" si expire
  - [x] 4.3 Creer `adminProcedure` qui verifie en plus `role === "admin"`
- [x] Task 5 — Redirection frontend pour trial expire (AC: #2)
  - [x] 5.1 QueryClient global: retry=false + redirect /pricing sur erreur TRIAL_EXPIRED (queries et mutations)

## Dev Notes

- Le champ `trialEndsAt` est nullable — null = pas de trial (admin ou migration). Checker aussi un futur champ subscription.
- Pour l'OAuth, le DrizzleAdapter cree l'utilisateur mais ne set pas `trialEndsAt`. Utiliser `events.createUser` de NextAuth.
- Le token JWT doit etre enrichi pour eviter des requetes DB a chaque appel tRPC.
- Pas de table subscription encore (Epic 6) — pour l'instant, seul le trial gate l'acces.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Completion Notes List

- trialEndsAt set a l'inscription email (register route) et Google OAuth (events.createUser)
- Token JWT enrichi avec role + trialEndsAt, types NextAuth augmentes
- protectedProcedure verifie trial actif, adminProcedure verifie role admin
- Redirection client vers /pricing sur erreur TRIAL_EXPIRED via QueryClient global

### Change Log

- 2026-04-11 : Implementation complete — trial 7j, roles, middleware tRPC, redirection client

### File List

- `apps/web/src/app/api/register/route.ts` — ajout trialEndsAt a l'insertion
- `packages/auth/src/index.ts` — events.createUser, jwt/session callbacks enrichis, import types
- `packages/auth/src/types.ts` — NOUVEAU — augmentation types Session et JWT
- `packages/api/src/trpc.ts` — protectedProcedure avec check trial, adminProcedure
- `apps/web/src/trpc/query-client.ts` — retry + onError pour TRIAL_EXPIRED redirect
