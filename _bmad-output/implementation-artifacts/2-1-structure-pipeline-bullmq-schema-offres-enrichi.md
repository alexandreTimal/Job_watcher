# Story 2.1 : Structure pipeline BullMQ & schema offres enrichi

Status: in-progress

## Story

En tant que developpeur,
Je veux le squelette du pipeline BullMQ avec le schema des offres enrichi en base,
Afin de disposer de l'infrastructure pour les workers de collecte.

## Etat actuel — deja implemente

- `packages/queue/` : connexion Redis, queues scraping-pipeline + email-notifications, types ScrapeJobData/ScoreJobData/FeedJobData/EmailJobData ✓
- `packages/db/src/schema/offers.ts` : tables `rawOffers` (base) et `sourceConfigs` ✓
- `packages/db/src/schema/pipeline.ts` : table `pipelineRuns` avec metriques ✓
- `apps/pipeline/src/index.ts` : worker BullMQ consomme scraping-pipeline ✓
- `apps/pipeline/src/lib/logger.ts` : logger structure ✓
- Sources, normalizer, deduplicator, purger deja presents

## Ce qui manque

- Champs enrichis sur `raw_offers` : `location_lat`, `location_lng`, `remote_type`, `required_experience_years`, `company_size`, `description_raw`
- Mise a jour du validator Zod `rawJobOfferSchema` pour inclure les champs enrichis
- Migration Drizzle pour les nouveaux champs

## Acceptance Criteria

### AC1 — Schema offres enrichi
Given `raw_offers`
When les champs enrichis sont ajoutes
Then `location_lat` (real nullable), `location_lng` (real nullable), `remote_type` (text enum on_site|hybrid|full_remote nullable), `required_experience_years` (integer nullable), `company_size` (text enum nullable), `description_raw` (text nullable, purgee apres 30j)

### AC2 — Validators Zod enrichis
Given `packages/validators/src/offers.ts`
When le schema est mis a jour
Then `rawJobOfferSchema` inclut les champs enrichis (tous optionnels)

### AC3 — Migration generee
Given les modifications schema
When `pnpm db:generate` est execute
Then une migration SQL est generee sans erreur

## Tasks / Subtasks

- [ ] Task 1 — Ajouter les champs enrichis a rawOffers (AC: #1)
- [ ] Task 2 — Mettre a jour rawJobOfferSchema et normalizedOfferSchema (AC: #2)
- [ ] Task 3 — Generer la migration Drizzle (AC: #3)

## Dev Notes

- `packages/db/src/schema/offers.ts` : utilise pgTable, text, integer, timestamp, index
- `packages/validators/src/offers.ts` : rawJobOfferSchema, normalizedOfferSchema, scoredOfferSchema
- Drizzle utilise `real` pour les floats (lat/lng)
- `remote_type` et `company_size` sont des text avec enum dans l'architecture

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Completion Notes List

### Change Log

### File List
