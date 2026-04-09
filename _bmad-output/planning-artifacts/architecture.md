---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-09'
status: 'in-progress'
inputDocuments: ['prd.md']
workflowType: 'architecture'
project_name: 'Job_watcher'
user_name: 'Alexandre'
date: '2026-04-09'
---

# Architecture Decision Document

_Ce document se construit collaborativement étape par étape. Les sections sont ajoutées au fur et à mesure des décisions architecturales._

## Analyse du Contexte Projet

### Vue d'ensemble des Exigences

**Exigences Fonctionnelles (41 FRs) :**
- Gestion de compte & authentification (7 FRs) : inscription email/OAuth, essai 7 jours, abonnements Stripe, export/suppression RGPD
- Onboarding & profil (6 FRs) : upload CV, extraction LLM, préférences candidat, mots-clés négatifs
- Feed & découverte d'offres (7 FRs) : feed quotidien scoré, swipe mobile, archivage desktop, redirection source, logs de redirection
- Notifications (2 FRs) : push quotidien, opt-in/opt-out
- Pipeline de collecte (8 FRs) : multi-sources (France Travail API, WTTJ scraping, sources complémentaires), normalisation, dédup, purge, métadonnées uniquement, respect robots.txt
- Scoring & matching (3 FRs) : scoring règles pondérées par profil, feed pré-calculé batch, justification score
- Dashboard ops (5 FRs) : monitoring sources, alertes, logs erreur, run de test, métriques globales
- Conformité & juridique (3 FRs) : cessation de scraping, désactivation source, logs redirection

**Exigences Non-Fonctionnelles (32 NFRs) :**
- Performance (6 NFRs) : feed < 2s 4G, FCP < 1.5s, TTI < 3s, bundle < 200KB, pipeline avant 7h, swipe < 300ms
- Sécurité (6 NFRs) : HTTPS, chiffrement au repos, bcrypt/argon2, expiration sessions, Stripe délégué, secrets protégés
- Scalabilité (4 NFRs) : 100k MAU sans réécriture, VPS scale-up, pipeline découplé, coût < 5€/client/mois
- Fiabilité (4 NFRs) : 99% uptime, isolation erreurs sources, backup quotidien, feed consultable même si pipeline en panne
- Accessibilité (4 NFRs) : WCAG 2.1 AA, tap 44x44px, contraste 4.5:1, navigation clavier
- Intégration (4 NFRs) : France Travail OAuth2, Stripe webhooks, LLM abstrait, gestion erreurs réseau
- Observabilité (4 NFRs) : logs structurés, alerte source < 50%, Sentry, métriques business

### Échelle & Complexité

- **Domaine technique :** Full-stack (backend pipeline + frontend PWA/desktop + ops Docker/VPS)
- **Complexité :** Élevée — 7 domaines techniques distincts (scraping, LLM, paiement, auth, PWA, pipeline async, ops) à intégrer par un développeur unique
- **Composants architecturaux estimés :** ~18-22 modules (auth, profil, pipeline, sources×N, scoring, feed, notifications, dashboard ops, admin, API routes, composants UI mobile, composants UI desktop, couche DB, couche LLM, couche Stripe, monitoring)

### Contraintes Techniques & Dépendances

- **Runtime :** Node.js, TypeScript, Next.js standalone (`output: 'standalone'`)
- **Base de données :** Postgres (multi-tenant, chiffrement au repos)
- **Infra :** VPS Hetzner, Docker Compose, Caddy reverse proxy
- **Paiement :** Stripe Checkout + webhooks (aucune donnée bancaire côté serveur)
- **Auth :** Auth.js (email + OAuth Google)
- **LLM :** Gemini (via couche d'abstraction provider-agnostic)
- **Scraping :** Cheerio (HTML statique), Playwright stealth (JS-rendered)
- **Queue :** BullMQ pour le pipeline batch nocturne
- **Frontend :** TanStack Query (cache HTTP), PWA manifest, deux layouts mobile/desktop
- **Monitoring :** Sentry (error tracking), dashboard ops custom

### Préoccupations Transversales

- **Isolation des erreurs :** chaque source de scraping est autonome, `Promise.allSettled` — une source qui casse n'affecte pas les autres
- **RGPD :** traverse toutes les couches — stockage (chiffrement, minimisation), API (export, suppression), pipeline (métadonnées uniquement, purge), logs (redirection comme preuve)
- **Contrainte de coût :** < 5 €/client/mois impose des choix d'infra (VPS > cloud managed), de LLM (modèles économiques), et de pipeline (batch > temps réel)
- **Observabilité :** logs structurés, alertes automatiques, Sentry, métriques business — le monitoring n'est pas un nice-to-have, c'est le risque #1 (maintenance scraping)
- **Sécurité :** secrets, chiffrement, sessions, HTTPS — standard mais non négociable
- **Accessibilité :** WCAG 2.1 AA sur les deux surfaces, impacte tous les composants UI
- **Multi-tenancy :** chaque opération (scoring, feed, préférences) est scoped par utilisateur

## Évaluation du Starter Template

### Domaine Technique

Full-stack TypeScript : Next.js (PWA mobile + desktop) + pipeline batch Node.js (BullMQ workers), avec code partagé (types, DB Drizzle, config).

### Options Considérées

| Option | Verdict | Raison |
|---|---|---|
| `create-turbo` (officiel) | Rejeté | Squelette vide — tout à construire, pas de valeur ajoutée |
| `next-forge` (Vercel) | Rejeté | Très complet mais utilise Prisma, Clerk, ~20 packages. Migration Prisma→Drizzle lourde, trop de code à comprendre et adapter pour un dev solo |
| `create-t3-turbo` (t3-oss) | **Retenu** | Drizzle natif, tRPC, Tailwind v4, shadcn/ui, Turborepo. Base légère et compréhensible |
| `turborepo-starter-kit` | Rejeté | Pas de Next.js (Vite + Hono), 8 stars, immature |

### Starter Retenu : `create-t3-turbo`

**Rationale :** Drizzle ORM est déjà intégré, tRPC v11 donne du type-safety end-to-end entre frontend et backend, et la base est suffisamment légère pour qu'un développeur solo comprenne chaque ligne. L'ajout de BullMQ, Stripe et Sentry est incrémental et maîtrisé.

**Initialisation :**

```bash
git clone https://github.com/t3-oss/create-t3-turbo.git jobfindeer
cd jobfindeer && pnpm i
```

**Décisions architecturales fournies par le starter :**

**Langage & Runtime :**
- TypeScript strict, Node.js 20+
- ESM natif, Turborepo v2.9+

**Monorepo :**
- `apps/web` — Next.js 15 (App Router, React 19)
- `packages/db` — Drizzle ORM + Postgres
- `packages/api` — tRPC v11 (API type-safe)
- `packages/ui` — shadcn/ui + Tailwind v4
- `packages/auth` — better-auth (à remplacer par Auth.js)
- `packages/validators` — Zod schemas partagés

**Styling :**
- Tailwind CSS v4 + shadcn/ui pré-configuré

**Build & DX :**
- Turborepo (cache incrémental, `turbo prune` pour Docker)
- pnpm workspaces
- TypeScript project references (intellisense cross-packages)

**Testing :**
- Non inclus — Vitest à ajouter

**Modifications nécessaires :**

| Modification | Raison |
|---|---|
| Remplacer `better-auth` par Auth.js | Adaptateur Drizzle officiel, OAuth Google, aligné avec le PRD |
| Retirer Expo (`apps/expo`) | App native prévue Phase 2 (React Native), pas Phase 1 |
| Ajouter `apps/pipeline` | Workers BullMQ (scraping, scoring, feed) — process Node.js séparé |
| Ajouter `packages/queue` | Config BullMQ partagée, types de jobs, connexion Redis |
| Ajouter Stripe | Checkout + webhooks dans `apps/web` |
| Ajouter Sentry | Error tracking frontend + backend + pipeline |
| Configurer PWA | manifest.json, service worker, mode standalone |
| Adapter DB de Supabase vers Postgres classique | VPS Hetzner + Docker Compose, pas de Supabase |
| Ajouter deux layouts Next.js | `(mobile)` et `(desktop)` — deux surfaces distinctes |

**Note :** L'initialisation du projet depuis ce starter sera la première story d'implémentation.

## Décisions Architecturales

### Priorité des Décisions

**Décisions critiques (bloquent l'implémentation) :**

| Catégorie | Décision | Choix | Rationale |
|---|---|---|---|
| Validation données | Stratégie | Zod partout + contraintes DB | Zod catch les erreurs tôt (tRPC, frontend), contraintes DB en filet de sécurité. Pattern natif du starter t3 |
| Cache | Stratégie | TanStack Query client, pas de cache serveur | Feed pré-calculé en DB, requêtes indexées < 10ms. Redis réservé à BullMQ. Cache serveur ajouté si besoin Phase 2 |
| Chiffrement | Données sensibles | `pgcrypto` côté Postgres | Chiffrement au niveau des colonnes sensibles (CV, profil extrait). Transparent pour Drizzle via custom column types. Clé dans `.env` |
| Autorisation | Stratégie | Vérification simple par rôle | Champ `role` (`candidate` \| `admin`), middleware tRPC `protectedProcedure` + `adminProcedure`. Scoping par `user_id` dans chaque requête |
| Communication services | Next.js ↔ Pipeline | Redis/BullMQ + Postgres | Dashboard enqueue un job BullMQ, pipeline le consomme. Résultats écrits en DB. Pas de serveur HTTP côté pipeline |
| Retry pipeline | Gestion des échecs | Retry par source avec backoff (BullMQ natif) | 3 tentatives, backoff exponentiel. Config BullMQ, pas de code custom. Échec final → log + alerte dashboard ops |
| Notifications | MVP | Email uniquement (Resend) | Pas de push au MVP. Email récap quotidien via Resend (3000/mois gratuits, React Email pour templates). Push Web natif prévu Phase 2 |
| LLM | Couche d'abstraction | Vercel AI SDK (`ai` npm) | Package open-source gratuit, multi-provider. Structured output Zod. Commence avec Gemini Flash, switch de provider en une ligne |
| Stockage fichiers | CV uploads | Filesystem VPS | Volume Docker `/data/uploads/`, sauvegardé par backup quotidien. Migration S3 si multi-serveurs Phase 2 |

**Décisions importantes (façonnent l'architecture) :**

| Catégorie | Décision | Choix | Rationale |
|---|---|---|---|
| Containers | Structure Docker | 4 containers Docker Compose | `web` (Next.js), `worker` (BullMQ), `postgres`, `redis`. Caddy reverse proxy + HTTPS Let's Encrypt |
| CI/CD | Déploiement | GitHub Actions → SSH deploy | Build images → push GHCR → SSH `docker compose pull && up -d`. Secrets dans GitHub Secrets |
| Monitoring | Observabilité | Logs console + Sentry + métriques Postgres | `docker compose logs` pour debug, Sentry tier gratuit pour error tracking, table `pipeline_runs` pour stats dashboard ops |
| Feed | Rétention | 7 jours d'offres non traitées | Offres `pending` visibles 7 jours. Swipe → `saved` ou `dismissed`. Offres `saved` sans limite de temps côté desktop |

**Décisions différées (Phase 2+) :**

| Décision | Raison du report |
|---|---|
| Cache Redis serveur | Postgres suffit au MVP, ajout si latences justifiées |
| Push notifications (Web Push VAPID) | Email suffit au MVP, push en Phase 2 |
| Stockage S3 | Filesystem VPS suffit en mono-serveur |
| Scoring LLM sémantique | Scoring règles pondérées au MVP, LLM sémantique Phase 2 |
| App native React Native | PWA au MVP, app native Phase 2 |

### Architecture des Données

- **ORM :** Drizzle ORM + Postgres
- **Validation :** Zod schemas partagés (`packages/validators`) + contraintes DB
- **Chiffrement :** `pgcrypto` pour colonnes sensibles (CV, profil), clé dans `.env`
- **Feed :** table `user_feeds` avec `status` (`pending` | `saved` | `dismissed`), rétention 7 jours pour `pending`, pas de limite pour `saved`
- **Métriques :** table `pipeline_runs` (source, offres collectées, erreurs, durée, timestamp)
- **Migrations :** Drizzle Kit (mode `generate` pour review avant apply)

### Sécurité

- **Auth :** Auth.js (email + OAuth Google), sessions avec expiration
- **Autorisation :** rôle simple (`candidate` | `admin`), middleware tRPC
- **Chiffrement transit :** HTTPS via Caddy + Let's Encrypt
- **Chiffrement repos :** `pgcrypto` colonnes sensibles
- **Secrets :** `.env` local, GitHub Secrets en CI
- **Paiements :** Stripe Checkout, aucune donnée bancaire côté serveur

### Communication & APIs

- **API :** tRPC v11 (type-safe end-to-end, pas de routes REST manuelles)
- **Next.js ↔ Pipeline :** BullMQ comme bus de communication + Postgres comme intermédiaire de données
- **Gestion erreurs pipeline :** retry BullMQ natif (3 tentatives, backoff exponentiel), `Promise.allSettled` entre sources
- **Rate limiting scraping :** `sleep()` configurable par source
- **LLM :** Vercel AI SDK, provider Gemini Flash, structured output Zod

### Infrastructure & Déploiement

- **VPS :** Hetzner, Docker Compose (4 containers : web, worker, postgres, redis)
- **Reverse proxy :** Caddy (HTTPS automatique Let's Encrypt)
- **CI/CD :** GitHub Actions → build images → push GHCR → SSH deploy
- **Stockage CV :** volume Docker `/data/uploads/`
- **Backup :** quotidien (Postgres + uploads)
- **Monitoring :** Sentry (error tracking) + `docker compose logs` + métriques Postgres

### Analyse d'Impact

**Séquence d'implémentation :**
1. Init monorepo `create-t3-turbo` + nettoyage (retirer Expo, remplacer better-auth)
2. Schema Drizzle + migrations + `pgcrypto` setup
3. Auth.js + rôles + Stripe
4. Pipeline BullMQ : sources → validation → scoring → dedup → DB
5. Feed API (tRPC) + interface swipe mobile
6. Interface desktop (offres sauvegardées)
7. Dashboard ops (métriques pipeline)
8. Notifications email (Resend)
9. LLM onboarding (extraction CV via Vercel AI SDK)
10. Docker Compose + Caddy + CI/CD GitHub Actions

**Dépendances cross-composants :**
- `packages/db` (Drizzle) est importé par `apps/web` ET `apps/pipeline`
- `packages/queue` (BullMQ) est importé par `apps/web` (enqueue) ET `apps/pipeline` (consume)
- `packages/validators` (Zod) est partagé entre tRPC, pipeline et frontend
- Le feed dépend du pipeline (doit tourner au moins une fois avant d'avoir du contenu)
- Stripe webhooks dépendent d'Auth.js (association user ↔ subscription)

## Patterns d'Implémentation & Règles de Cohérence

### Points de Conflit Identifiés

12 zones où des agents AI pourraient faire des choix différents si non spécifié.

### Conventions de Nommage

**Base de données (Drizzle + Postgres) :**
- Tables : `snake_case`, pluriel → `users`, `user_feeds`, `pipeline_runs`
- Colonnes : `snake_case` → `user_id`, `created_at`, `content_hash`
- Index : `idx_{table}_{columns}` → `idx_user_feeds_user_id`
- Enums Postgres : `snake_case` → `feed_status`, `user_role`

**Code TypeScript :**
- Fichiers : `kebab-case.ts` → `keyword-filter.ts`, `cv-extraction.ts`
- Composants React : `PascalCase.tsx` → `OfferCard.tsx`, `SwipeStack.tsx`
- Types/Interfaces : `PascalCase` → `JobOffer`, `UserProfile`, `FeedItem`
- Fonctions : `camelCase` → `calculateScore()`, `extractSkills()`
- Variables : `camelCase` → `scoreThreshold`, `feedItems`
- Constantes : `UPPER_SNAKE_CASE` → `MAX_RETRY_COUNT`, `FEED_RETENTION_DAYS`
- Schemas Zod : `camelCase` + suffixe `Schema` → `createUserSchema`, `updatePreferencesSchema`

**BullMQ Jobs :**
- Noms de queues : `kebab-case` → `scraping-pipeline`, `email-notifications`
- Noms de jobs : `kebab-case` → `scrape-wttj`, `score-feeds`, `send-daily-recap`

### Patterns de Structure

**Organisation des composants (par feature, pas par type) :**
```
apps/web/src/app/(mobile)/feed/
  _components/          ← composants spécifiques à cette page
    OfferCard.tsx
    SwipeStack.tsx
  page.tsx
  loading.tsx
```

**Tests (co-localisés) :**
```
packages/db/src/
  schema.ts
  schema.test.ts        ← à côté du fichier testé
packages/api/src/
  routers/feed.ts
  routers/feed.test.ts
```

**Sources de scraping (chaque source = un fichier autonome dans le pipeline) :**
```
apps/pipeline/src/sources/
  france-travail.ts     ← exporte une fonction unique
  wttj.ts
  hellowork.ts
```

### Patterns de Format

**Erreurs tRPC (format standard) :**
```typescript
throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Offre introuvable',
});
```

**Dates :** ISO 8601 partout (`2026-04-09T07:00:00Z`). Postgres stocke en `timestamptz`. Formatage pour l'affichage uniquement côté frontend.

**Logging pipeline :**
```
[2026-04-09T07:00:12Z] [WTTJ] INFO: 23 offres collectées, 8 après scoring
[2026-04-09T07:00:12Z] [FRANCE-TRAVAIL] ERROR: OAuth token expired (status: 401)
```
Niveaux : `INFO`, `WARN`, `ERROR`. Pas de `DEBUG` sauf en mode verbose.

### Patterns de Communication

**Sources de scraping — contrat uniforme :**
```typescript
export interface ScrapingSource {
  name: string;
  fetch(): Promise<RawJobOffer[]>;
}
```
Toutes les sources retournent des `RawJobOffer[]`. Le pipeline en aval ne connaît pas l'origine.

**Pipeline séquentiel après collecte :**
```
sources (parallèle via BullMQ jobs) → validation Zod → scoring → dédup → DB → email
```

**Orchestrateur → Sources :**
- `Promise.allSettled()` — jamais `Promise.all()`
- Chaque source est un job BullMQ séparé avec ses propres retries

### Patterns de Gestion d'Erreurs

**Chaque source de scraping :**
```typescript
try {
  const offers = await source.fetch();
  logger.info(`[${source.name}] ${offers.length} offres collectées`);
  return offers;
} catch (error) {
  logger.error(`[${source.name}] ${error.message}`, { url, status: error.status });
  return [];
}
```
Règle : une source ne throw jamais vers l'orchestrateur. Elle retourne `[]` en cas d'erreur.

**Frontend — Error Boundaries React :**
- Un Error Boundary par layout (`(mobile)`, `(desktop)`)
- Les erreurs tRPC sont gérées par TanStack Query (`onError`)
- Message utilisateur générique, détail technique dans Sentry

**Loading states :**
- `loading.tsx` de Next.js App Router pour chaque route (skeleton natif)
- TanStack Query `isPending` / `isError` pour les données async
- Pas de state de loading global — chaque composant gère le sien

### Directives pour Agents AI

**OBLIGATOIRE :**
- Toute nouvelle source DOIT implémenter l'interface `ScrapingSource`
- Toute requête DB DOIT être scoped par `user_id` (sauf admin)
- Tout schema de validation DOIT être dans `packages/validators`
- Les logs pipeline DOIVENT suivre le format `[timestamp] [SOURCE] level: message`
- Les composants UI DOIVENT utiliser les composants shadcn/ui existants avant d'en créer
- Les mutations tRPC DOIVENT invalider les queries TanStack Query concernées

**INTERDIT :**
- Jamais de `console.log` direct — utiliser le logger (pipeline) ou Sentry (frontend)
- Jamais de secrets en dur dans le code
- Jamais de `Promise.all()` pour les sources — toujours `Promise.allSettled()`
- Jamais de SQL brut hors du package `packages/db`
- Jamais de fetch HTTP direct dans `apps/web` — passer par tRPC
- Jamais de style inline ou CSS custom — Tailwind uniquement

## Structure du Projet & Frontières

### Structure Complète du Répertoire

```
jobfindeer/
├── .env.example
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci.yml                          # Lint + tests sur PR
│       └── deploy.yml                      # Build images → GHCR → SSH deploy
├── docker-compose.yml                      # 4 services : web, worker, postgres, redis
├── docker-compose.dev.yml                  # Override dev (ports exposés, volumes)
├── Caddyfile                               # Reverse proxy + HTTPS Let's Encrypt
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
│
├── apps/
│   ├── web/                                # Next.js 15 (App Router, standalone)
│   │   ├── Dockerfile
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   │   ├── manifest.json               # PWA manifest
│   │   │   ├── sw.js                       # Service worker (PWA)
│   │   │   └── icons/                      # Icônes PWA
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx              # Root layout (providers tRPC, TanStack Query)
│   │       │   ├── (mobile)/               # Layout mobile-only (375px ref)
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── feed/
│   │       │   │   │   ├── page.tsx        # FR14-16 — Feed swipe quotidien
│   │       │   │   │   ├── loading.tsx
│   │       │   │   │   └── _components/
│   │       │   │   │       ├── OfferCard.tsx
│   │       │   │   │       └── SwipeStack.tsx
│   │       │   │   └── onboarding/
│   │       │   │       ├── page.tsx        # FR8-11 — Upload CV + préférences
│   │       │   │       ├── loading.tsx
│   │       │   │       └── _components/
│   │       │   │           ├── CvUploader.tsx
│   │       │   │           ├── ProfileReview.tsx
│   │       │   │           └── PreferencesForm.tsx
│   │       │   ├── (desktop)/              # Layout desktop-first (1024px+)
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── page.tsx            # Landing page marketing (SEO)
│   │       │   │   ├── offers/
│   │       │   │   │   ├── page.tsx        # FR17-19 — Offres sauvegardées
│   │       │   │   │   ├── loading.tsx
│   │       │   │   │   └── _components/
│   │       │   │   │       └── OfferTable.tsx
│   │       │   │   ├── settings/
│   │       │   │   │   ├── page.tsx        # FR12-13 — Préférences + mots-clés négatifs
│   │       │   │   │   └── _components/
│   │       │   │   │       └── PreferencesEditor.tsx
│   │       │   │   └── billing/
│   │       │   │       ├── page.tsx        # FR4-5 — Gestion abonnement Stripe
│   │       │   │       └── _components/
│   │       │   │           └── SubscriptionManager.tsx
│   │       │   ├── (auth)/                 # Layout auth (login/register)
│   │       │   │   ├── login/
│   │       │   │   │   └── page.tsx        # FR1-2 — Connexion
│   │       │   │   └── register/
│   │       │   │       └── page.tsx        # FR1, FR3 — Inscription + essai 7j
│   │       │   ├── admin/                  # Dashboard ops (protégé role admin)
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── page.tsx            # FR34, FR38 — Vue d'ensemble sources + métriques
│   │       │   │   ├── sources/
│   │       │   │   │   └── page.tsx        # FR36-37 — Logs erreur + run de test
│   │       │   │   └── _components/
│   │       │   │       ├── SourceStatusCard.tsx
│   │       │   │       ├── PipelineRunsTable.tsx
│   │       │   │       └── MetricsCharts.tsx
│   │       │   └── api/
│   │       │       ├── trpc/[trpc]/
│   │       │       │   └── route.ts        # Handler tRPC
│   │       │       ├── stripe/
│   │       │       │   └── webhook/
│   │       │       │       └── route.ts    # FR4 — Stripe webhooks (hors tRPC)
│   │       │       └── auth/[...nextauth]/
│   │       │           └── route.ts        # Auth.js handler
│   │       ├── trpc/
│   │       │   ├── client.ts               # Client tRPC côté browser
│   │       │   ├── server.ts               # Caller tRPC côté server components
│   │       │   └── query-client.ts         # Config TanStack Query
│   │       └── lib/
│   │           ├── stripe.ts               # Config Stripe client
│   │           └── uploads.ts              # Gestion upload CV vers filesystem
│   │
│   └── pipeline/                           # Workers BullMQ (process Node.js séparé)
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                    # Entry point — démarre les workers
│           ├── workers/
│           │   ├── scraping.worker.ts      # Consomme les jobs de scraping
│           │   ├── scoring.worker.ts       # Calcule les scores par profil
│           │   ├── feed.worker.ts          # Génère les feeds utilisateurs
│           │   └── email.worker.ts         # Envoie les emails récap (Resend)
│           ├── sources/                    # FR23-30 — Sources de scraping
│           │   ├── france-travail.ts       # FR23 — API officielle (OAuth2)
│           │   ├── wttj.ts                 # FR24 — Scraping métadonnées
│           │   ├── hellowork.ts            # FR25 — Source complémentaire
│           │   └── index.ts               # Registry des sources actives
│           ├── scoring/
│           │   ├── rules-engine.ts         # FR31 — Scoring règles pondérées
│           │   └── justification.ts        # FR33 — Génération justification score
│           ├── processing/
│           │   ├── normalizer.ts           # FR26 — Normalisation offres
│           │   ├── deduplicator.ts         # FR27 — Dédup cross-sources (hash)
│           │   └── purger.ts              # FR28 — Purge offres expirées
│           ├── llm/
│           │   └── cv-extractor.ts         # FR9 — Extraction CV via Vercel AI SDK
│           └── lib/
│               ├── logger.ts              # Logger structuré [timestamp] [SOURCE] level
│               └── sleep.ts               # Rate limiting configurable
│
├── packages/
│   ├── api/                                # tRPC routers
│   │   ├── package.json
│   │   └── src/
│   │       ├── root.ts                    # Root router
│   │       ├── trpc.ts                    # Context, middleware (protectedProcedure, adminProcedure)
│   │       └── routers/
│   │           ├── feed.ts                # CRUD feed + swipe
│   │           ├── offers.ts              # Offres sauvegardées
│   │           ├── profile.ts             # Profil + préférences
│   │           ├── auth.ts                # Endpoints auth
│   │           ├── billing.ts             # Stripe subscription status
│   │           ├── admin.ts               # Dashboard ops endpoints
│   │           └── gdpr.ts               # FR6-7 — Export données + suppression compte
│   │
│   ├── db/                                 # Drizzle ORM + schema
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts                   # Client Drizzle + connexion Postgres
│   │       ├── schema/
│   │       │   ├── users.ts               # users, user_roles
│   │       │   ├── profiles.ts            # user_profiles, user_preferences
│   │       │   ├── offers.ts              # raw_offers, offer_hashes
│   │       │   ├── feeds.ts               # user_feeds (status: pending|saved|dismissed)
│   │       │   ├── pipeline.ts            # pipeline_runs, source_configs
│   │       │   ├── subscriptions.ts       # stripe_subscriptions, stripe_events
│   │       │   └── redirections.ts        # redirection_logs (preuve juridique)
│   │       ├── migrations/                # Fichiers générés par Drizzle Kit
│   │       └── crypto.ts                  # Custom column types pgcrypto
│   │
│   ├── queue/                              # Config BullMQ partagée
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts                   # Connexion Redis + factory queues
│   │       ├── queues.ts                  # Définition des queues (scraping-pipeline, email-notifications)
│   │       └── types.ts                   # Types de jobs (ScrapeJobData, ScoreJobData, etc.)
│   │
│   ├── validators/                         # Schemas Zod partagés
│   │   ├── package.json
│   │   └── src/
│   │       ├── user.ts                    # createUserSchema, updateProfileSchema
│   │       ├── preferences.ts             # preferencesSchema, keywordsSchema
│   │       ├── offer.ts                   # rawJobOfferSchema, feedItemSchema
│   │       └── admin.ts                   # sourceConfigSchema, testRunSchema
│   │
│   ├── auth/                               # Auth.js config
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts                   # Auth.js setup (providers, adapter Drizzle)
│   │       └── config.ts                  # Options auth (session, callbacks)
│   │
│   ├── email/                              # Templates email (React Email + Resend)
│   │   ├── package.json
│   │   └── src/
│   │       ├── client.ts                  # Client Resend
│   │       └── templates/
│   │           ├── DailyRecap.tsx          # FR21 — Email récap quotidien
│   │           └── Welcome.tsx            # Email de bienvenue
│   │
│   └── ui/                                 # shadcn/ui + composants partagés
│       ├── package.json
│       ├── components.json
│       └── src/
│           ├── components/                # Composants shadcn/ui générés
│           └── styles/
│               └── globals.css
│
└── tooling/                                # Config partagée
    ├── typescript/                         # tsconfig de base
    ├── tailwind/                           # Config Tailwind partagée
    └── eslint/                             # Config ESLint partagée
```

### Frontières Architecturales

**Frontière Sources → Pipeline :**
- Chaque fichier `apps/pipeline/src/sources/*.ts` est autonome
- Contrat : implémente `ScrapingSource` → retourne `RawJobOffer[]`
- Ne connaît pas le scoring, la dédup, ni le feed

**Frontière Pipeline → Base de données :**
- Le pipeline écrit via `packages/db` uniquement
- Les workers n'importent jamais depuis `apps/web`

**Frontière Web → API :**
- `apps/web` n'accède jamais à la DB directement
- Tout passe par tRPC (`packages/api`)
- Exception : Stripe webhooks et Auth.js handlers (routes API Next.js directes)

**Frontière Web ↔ Pipeline :**
- Communication uniquement via `packages/queue` (BullMQ) et `packages/db` (Postgres)
- Pas d'import croisé entre `apps/web` et `apps/pipeline`

### Mapping Exigences → Structure

| Catégorie FR | Fichiers |
|---|---|
| Auth (FR1-3) | `packages/auth/`, `apps/web/src/app/(auth)/` |
| Abonnement (FR4-5) | `apps/web/src/app/(desktop)/billing/`, `packages/api/src/routers/billing.ts`, `apps/web/src/app/api/stripe/` |
| RGPD (FR6-7) | `packages/api/src/routers/gdpr.ts` |
| Onboarding (FR8-11) | `apps/web/src/app/(mobile)/onboarding/`, `apps/pipeline/src/llm/cv-extractor.ts` |
| Préférences (FR12-13) | `apps/web/src/app/(desktop)/settings/`, `packages/api/src/routers/profile.ts` |
| Feed (FR14-16) | `apps/web/src/app/(mobile)/feed/`, `packages/api/src/routers/feed.ts` |
| Offres desktop (FR17-20) | `apps/web/src/app/(desktop)/offers/`, `packages/db/src/schema/redirections.ts` |
| Notifications (FR21-22) | `packages/email/`, `apps/pipeline/src/workers/email.worker.ts` |
| Collecte (FR23-30) | `apps/pipeline/src/sources/`, `apps/pipeline/src/processing/` |
| Scoring (FR31-33) | `apps/pipeline/src/scoring/`, `apps/pipeline/src/workers/scoring.worker.ts` |
| Dashboard ops (FR34-38) | `apps/web/src/app/admin/`, `packages/api/src/routers/admin.ts` |
| Conformité (FR39-41) | `packages/db/src/schema/redirections.ts`, `packages/api/src/routers/admin.ts` |

### Flux de Données

```
[Pipeline nocturne]
  Sources (parallèle) → RawJobOffer[] → Normalisation → Validation Zod
  → Dédup (hash) → DB (raw_offers)
  → Scoring par profil → DB (user_feeds, status: pending)
  → Email récap (Resend)

[Consultation utilisateur]
  Mobile : feed page → tRPC feed.list → Postgres → TanStack Query cache
  Swipe : tRPC feed.swipe → UPDATE status → invalidate TanStack Query
  Desktop : offers page → tRPC offers.saved → Postgres

[Admin]
  Dashboard → tRPC admin.sources → Postgres (pipeline_runs)
  Test run → tRPC admin.testRun → BullMQ job → Pipeline exécute
```

## Résultats de Validation

### Validation de Cohérence ✅

**Compatibilité des technologies :**
- Stack T3 (tRPC + Drizzle + Zod + TanStack Query) : compatibilité prouvée, écosystème mature
- BullMQ + Redis : process séparé, pas de conflit avec Next.js
- Docker Compose (4 containers) + Caddy : architecture standard, aucun conflit
- Vercel AI SDK + Resend + Stripe : packages npm indépendants

**Clarification :** TanStack Query est inclus via `@trpc/react-query` — pas d'installation séparée nécessaire.

**Cohérence des patterns :**
- Conventions de nommage cohérentes entre DB (snake_case), TS (camelCase), fichiers (kebab-case), composants (PascalCase)
- Contrat `ScrapingSource` uniforme sur toutes les sources
- Gestion d'erreurs stratifiée : sources → `[]`, tRPC → `TRPCError`, frontend → Error Boundary + Sentry

### Validation Couverture des Exigences ✅

**Couverture FR : 41/41** — toutes les exigences fonctionnelles ont un emplacement assigné dans la structure.

**Couverture NFR : 32/32** — performance (cache client, pipeline batch), sécurité (pgcrypto, HTTPS, Auth.js), scalabilité (VPS scale-up, pipeline découplé), fiabilité (retry BullMQ, isolation sources), accessibilité (shadcn/ui), intégration (couches d'abstraction), observabilité (Sentry, logs, métriques Postgres).

### Validation Prêt pour Implémentation ✅

- Toutes les décisions critiques documentées avec rationale
- Arborescence complète avec mapping FR → fichiers
- Patterns couverts : nommage, structure, format, communication, erreurs
- Directives OBLIGATOIRE/INTERDIT pour agents AI

### Lacunes Corrigées

1. **Alerte automatique scraper (FR35) :** job BullMQ `check-source-health` après chaque pipeline run → vérifie taux de succès dans `pipeline_runs` → email Resend à l'admin si source < 50%
2. **Monitoring durée pipeline (NFR5) :** timestamps début/fin dans `pipeline_runs`, alerte si durée > seuil configurable
3. **Scheduler pipeline nocturne :** BullMQ RepeatableJob (cron natif dans le code, pas d'outil externe)
4. **Types intermédiaires pipeline :** `RawJobOffer`, `NormalizedOffer`, `ScoredOffer`, `FeedItem` à définir dans `packages/validators/src/offer.ts`
5. **Backup Postgres :** `pg_dump` quotidien via script cron sur le VPS, stocké dans volume Docker séparé

### Évaluation Finale

**Statut :** PRÊT POUR IMPLÉMENTATION
**Niveau de confiance :** Élevé

**Points forts :**
- Architecture monorepo claire avec frontières bien définies
- Stack T3 éprouvée (tRPC + Drizzle + Zod) — type-safety end-to-end
- Pipeline découplé du frontend via BullMQ — chacun peut évoluer indépendamment
- Contrainte de coût respectée (VPS + Docker + services gratuits/économiques)
- RGPD intégré dans l'architecture (pgcrypto, export, suppression, logs redirection)

**Améliorations futures (Phase 2+) :**
- Cache Redis serveur si latences Postgres insuffisantes
- Push notifications Web Push (VAPID) quand l'email ne suffit plus
- Stockage S3 si multi-serveurs
- Scoring LLM sémantique (Gemini → Extract & Match)
- App native React Native (Expo)
