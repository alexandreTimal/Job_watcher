# Story 0.3: Infrastructure Docker, Caddy, CI/CD & Sentry

Status: review

## Story

En tant que developpeur,
Je veux une infrastructure de deploiement automatisee avec monitoring,
Afin de deployer et operer JobFindeer en production de maniere fiable.

## Acceptance Criteria

1. `apps/web/Dockerfile` build Next.js en mode standalone
2. `apps/pipeline/Dockerfile` build le worker Node.js
3. `docker-compose.yml` avec 4 services (web, worker, postgres, redis), volumes persistants — DEJA FAIT
4. `Caddyfile` reverse proxy vers web, HTTPS Let's Encrypt
5. `ci.yml` lint + typecheck sur chaque PR — PARTIELLEMENT FAIT (manque tests)
6. `deploy.yml` build images → push GHCR → deploy SSH
7. Sentry integre frontend + backend (DSN via env var)
8. `manifest.json` PWA avec icones — PARTIELLEMENT FAIT (manque icones)
9. Layouts `(mobile)` et `(desktop)` — DEJA FAIT

## Tasks / Subtasks

- [x] Task 1: Creer apps/web/Dockerfile (AC: #1)
  - [x] 1.1 Multi-stage build: deps → build → runner
  - [x] 1.2 Utiliser `output: 'standalone'` de Next.js
  - [x] 1.3 Copier public/ et .next/standalone + .next/static

- [x] Task 2: Creer apps/pipeline/Dockerfile (AC: #2)
  - [x] 2.1 Image Node.js alpine legere
  - [x] 2.2 Installer deps avec pnpm et demarrer via tsx

- [x] Task 3: Creer Caddyfile (AC: #4)
  - [x] 3.1 Reverse proxy vers service web:3000
  - [x] 3.2 HTTPS automatique Let's Encrypt
  - [x] 3.3 Ajouter service caddy dans docker-compose.yml

- [x] Task 4: Creer deploy.yml GitHub Actions (AC: #6)
  - [x] 4.1 Trigger sur push main
  - [x] 4.2 Build et push images Docker vers GHCR
  - [x] 4.3 Deploy via SSH (docker compose pull && up -d)

- [x] Task 5: Integrer Sentry (AC: #7)
  - [x] 5.1 Installer @sentry/nextjs dans apps/web
  - [x] 5.2 Creer sentry.client.config.ts et sentry.server.config.ts
  - [x] 5.3 Configurer via SENTRY_DSN env var

- [x] Task 6: Completer PWA manifest (AC: #8)
  - [x] 6.1 Ajouter placeholder icons 192x192 et 512x512 dans manifest.json

## Dev Notes

### Etat actuel
- docker-compose.yml existe avec 4 services, volumes, healthchecks
- docker-compose.dev.yml existe pour dev local (Postgres + Redis uniquement)
- ci.yml existe avec lint, format, typecheck
- manifest.json existe mais sans icones propres
- Layouts (mobile) et (desktop) existent
- next.config.js a `output: "standalone"`
- SENTRY_DSN dans .env.example et env.ts

### Architecture
- VPS Hetzner, Docker Compose, Caddy reverse proxy
- CI/CD: GitHub Actions → build images → push GHCR → SSH deploy
- Sentry: error tracking frontend + backend + pipeline (NFR31)
- Monorepo pnpm avec Turborepo

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Completion Notes List
- Dockerfile web: multi-stage build (deps → builder → runner), Next.js standalone, non-root user
- Dockerfile pipeline: multi-stage build, node --import tsx/esm, non-root user
- Caddyfile: reverse proxy web:3000, gzip/zstd, DOMAIN env var, HTTPS auto Let's Encrypt
- docker-compose.yml: ajout service caddy (ports 80/443), volumes caddy_data/caddy_config
- deploy.yml: build+push GHCR, deploy SSH via appleboy/ssh-action
- Sentry: @sentry/nextjs v10, client+server+edge configs, withSentryConfig wrapper
- PWA: manifest.json avec icons 192x192 et 512x512 (placeholder)
- Fix: @types/google.maps deplace de dependencies vers devDependencies (sherif)
- NEXT_PUBLIC_SENTRY_DSN ajoute dans env.ts et .env.example

### Change Log
- 2026-04-12: Story 0.3 implementation complete

### File List
- apps/web/Dockerfile (new)
- apps/pipeline/Dockerfile (new)
- Caddyfile (new)
- .github/workflows/deploy.yml (new)
- docker-compose.yml (modified — ajout service caddy)
- apps/web/next.config.js (modified — Sentry wrapper)
- apps/web/sentry.client.config.ts (new)
- apps/web/sentry.server.config.ts (new)
- apps/web/sentry.edge.config.ts (new)
- apps/web/package.json (modified — @sentry/nextjs, @types/google.maps moved)
- apps/web/src/env.ts (modified — NEXT_PUBLIC_SENTRY_DSN)
- apps/web/public/manifest.json (modified — icons)
- apps/web/public/icon-192x192.png (new)
- apps/web/public/icon-512x512.png (new)
- .env.example (modified — NEXT_PUBLIC_SENTRY_DSN)
- package.json (modified — db scripts root level)
