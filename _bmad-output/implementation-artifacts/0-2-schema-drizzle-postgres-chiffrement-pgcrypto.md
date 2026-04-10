# Story 0.2: Schema Drizzle, Postgres & chiffrement pgcrypto

Status: review

## Story

En tant que developpeur,
Je veux un schema de base de donnees Postgres avec chiffrement des colonnes sensibles,
Afin de stocker les donnees d'authentification de maniere securisee des le depart.

## Acceptance Criteria

1. **Given** le monorepo initialise (Story 0.1)
   **When** le package `packages/db` est configure avec Drizzle ORM et Postgres
   **Then** les tables `users`, `sessions`, `accounts` (pour Auth.js) sont definies dans `packages/db/src/schema/`

2. **And** `packages/db/src/crypto.ts` exporte les custom column types pour pgcrypto (les tables `user_profiles` et `user_preferences` seront ajoutees dans Epic 3)

3. **And** `drizzle.config.ts` est configure pour la connexion Postgres via variable d'environnement `DATABASE_URL`

4. **And** la premiere migration est generee via Drizzle Kit (`generate`)

5. **And** un `docker-compose.dev.yml` demarre un container Postgres et Redis pour le dev local

6. **And** `pnpm db:push` ou `pnpm db:migrate` applique le schema sans erreur

## Tasks / Subtasks

- [x] Task 1: Corriger drizzle.config.ts (AC: #3)
  - [x] 1.1 Fixer le chemin `schema` de `"./src/schema.ts"` vers `"./src/schema/index.ts"`
  - [x] 1.2 Ajouter le chemin `out` pour les migrations (`"./drizzle"`)
  - [x] 1.3 Verifier que `dialect: "postgresql"` et `dbCredentials.url` pointent sur `DATABASE_URL`

- [x] Task 2: Creer packages/db/src/crypto.ts — helpers pgcrypto (AC: #2)
  - [x] 2.1 Exporter `pgEncrypt(value)` / `pgDecrypt(column)` — SQL helpers pour pgp_sym_encrypt/decrypt via session variable `app.pgcrypto_key`
  - [x] 2.2 Exporter `pgEncryptJson(value)` / `pgDecryptJson(column)` — variante JSON
  - [x] 2.3 Exporter `setPgcryptoKey(key)` — initialise la cle de session Postgres
  - [x] 2.4 Documenter l'usage dans un commentaire en tete de fichier

- [x] Task 3: Verifier et completer le schema auth.ts (AC: #1)
  - [x] 3.1 Confirmer que `users`, `sessions`, `accounts`, `verificationTokens` sont conformes au Drizzle adapter Auth.js v5
  - [x] 3.2 Verifier le composite PK sur `verificationTokens(identifier, token)` et l'unique index sur `accounts(provider, providerAccountId)` — deja corriges dans code review 0.1
  - [x] 3.3 S'assurer que `packages/db/src/schema/index.ts` re-exporte tout correctement

- [x] Task 4: Ajouter les scripts db:generate et db:migrate dans package.json (AC: #6)
  - [x] 4.1 Ajouter scripts `"generate"` et `"migrate"` dans `packages/db/package.json`
  - [x] 4.2 Script `push` existant OK avec chemin schema corrige
  - [x] 4.3 Ajouter scripts root-level `"db:generate"` et `"db:migrate"` dans le `package.json` racine

- [x] Task 5: Generer la premiere migration Drizzle Kit (AC: #4)
  - [x] 5.1 Containers Docker dev deja en cours (Postgres 16 + Redis 7)
  - [x] 5.2 `pnpm db:generate` genere `drizzle/0000_careless_the_call.sql` (11 tables)
  - [x] 5.3 Migration SQL contient les 4 tables auth + 7 tables metier avec FK, indexes et contraintes
  - [x] 5.4 `pnpm db:push` applique le schema sans erreur
  - [x] 5.5 11 tables confirmees dans Postgres via `\dt`

- [x] Task 6: Verifier docker-compose.dev.yml (AC: #5)
  - [x] 6.1 Postgres 16 et Redis 7 en cours sans erreur
  - [x] 6.2 Extension `pgcrypto` v1.3 activee (verifiee via pg_extension)
  - [x] 6.3 Connexion DB OK — 11 tables creees, 2 users existants

## Dev Notes

### Etat actuel du code (post code-review story 0.1)

**Ce qui existe deja et fonctionne :**
- `packages/db/src/schema/auth.ts` — tables `users`, `sessions`, `accounts`, `verificationTokens` avec contraintes corrigees (composite PK, unique index)
- `packages/db/src/schema/index.ts` — barrel export
- `packages/db/src/client.ts` — client Drizzle + connexion Postgres via `DATABASE_URL`
- `packages/db/package.json` — scripts `push`, `studio`, `seed`, `with-env`
- `docker-compose.dev.yml` — Postgres 16 + Redis 7 + init-pgcrypto.sql
- `scripts/init-pgcrypto.sql` — CREATE EXTENSION IF NOT EXISTS pgcrypto

**Ce qui est casse ou manquant :**
- `drizzle.config.ts` : `schema: "./src/schema.ts"` pointe vers un fichier inexistant (le vrai est `./src/schema/index.ts`)
- `packages/db/src/crypto.ts` : n'existe pas du tout
- Aucune migration generee (pas de dossier `drizzle/`)
- Pas de script `migrate` dans package.json

### Architecture et contraintes

- **Conventions nommage DB :** tables `snake_case` pluriel, colonnes `snake_case`, index `idx_{table}_{columns}`, enums `snake_case`
- **pgcrypto :** chiffrement colonnes sensibles (CV extrait, profil). Utiliser `pgp_sym_encrypt` / `pgp_sym_decrypt` via custom column types Drizzle. Cle dans `PGCRYPTO_KEY` (.env)
- **Scope story 0.2 :** UNIQUEMENT tables auth (users, sessions, accounts, verificationTokens) + crypto.ts + config + migration. Les tables `user_profiles`, `user_preferences`, `raw_offers`, `user_feeds`, etc. seront ajoutees dans les epics suivants
- **Drizzle Kit :** mode `generate` pour review SQL avant apply (pas de `push` direct en prod)
- **Interdit :** SQL brut hors de `packages/db`
- **Import :** `packages/db` est importe par `apps/web` ET `apps/pipeline`

### NFRs applicables

- NFR8: Donnees sensibles chiffrees au repos (pgcrypto)
- NFR9: Mots de passe hashes avec bcrypt ou argon2 (schema supporte `hashedPassword` — hash implementé en Epic 1)
- NFR12: Secrets (PGCRYPTO_KEY) jamais exposes cote client

### Schemas futurs (contexte, NE PAS implementer)

Les fichiers schema suivants seront crees dans les epics suivants — mentionnes ici pour contexte architectural :
- `schema/profiles.ts` — user_profiles (branch, free_text_raw, calibration_answers, current_employer), user_preferences (location_mode, cities, default_radius_km, remote_friendly) → Epic 3
- `schema/offers.ts` — raw_offers (location_lat/lng, remote_type, experience_years, description_raw), offer_hashes → Epic 2
- `schema/feeds.ts` — user_feeds (status: pending|saved|dismissed) → Epic 4
- `schema/pipeline.ts` — pipeline_runs, source_configs → Epic 2
- `schema/interactions.ts` — user_interactions → Epic 3
- `schema/subscriptions.ts` — stripe_subscriptions, stripe_events → Epic 6
- `schema/redirections.ts` — redirection_logs → Epic 5

### Previous story intelligence (Story 0.1)

- Le monorepo create-t3-turbo est initialise et fonctionnel
- Code review 0.1 a corrige : composite PK verificationTokens, unique index accounts, turbo.json globalEnv, env.ts validation, manifest PWA, ScoredOffer validator
- Le dossier `tooling/typescript/base.json` utilise `moduleResolution: "Bundler"` — c'est le tsconfig qui fait autorite pour les packages

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Architecture des Donnees]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 0.2]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR8, NFR9, NFR12]

### Project Structure Notes

- `packages/db/drizzle.config.ts` — config Drizzle Kit
- `packages/db/src/schema/` — dossier des schemas (auth.ts existe, index.ts existe)
- `packages/db/src/client.ts` — client Drizzle (existe)
- `packages/db/src/crypto.ts` — a creer
- `packages/db/src/index.ts` — re-export client + schema
- `docker-compose.dev.yml` — a la racine du repo
- `scripts/init-pgcrypto.sql` — script d'init extension pgcrypto

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- `turbo -F generate` intercepte par turbo gen (custom generators) → utiliser `pnpm --filter` pour db:generate, db:migrate, db:push
- tsx `-e` ne supporte pas top-level await en mode CJS → test connexion DB fait via psql directement

### Completion Notes List

- drizzle.config.ts corrige : schema path `./src/schema/index.ts`, ajout `out: "./drizzle"`
- package.json exports corrige : `./schema` pointe vers `src/schema/index.ts`
- crypto.ts cree avec helpers SQL pgcrypto (pgEncrypt, pgDecrypt, pgEncryptJson, pgDecryptJson, setPgcryptoKey)
- crypto.ts exporte aussi via `./crypto` dans package.json et via index.ts
- Scripts ajoutes : generate, migrate dans packages/db + db:generate, db:migrate, db:push en root (tous via pnpm --filter)
- Migration initiale generee : `drizzle/0000_careless_the_call.sql` (11 tables, FK, indexes, contraintes)
- Schema applique avec succes sur Postgres 16 local (pgcrypto v1.3 actif)
- Typecheck et build packages/db OK sans erreur

### Change Log

- 2026-04-12: Story 0.2 implementation — drizzle config fix, crypto.ts creation, migration generation, scripts setup

### File List

- packages/db/drizzle.config.ts (modified)
- packages/db/package.json (modified)
- packages/db/src/crypto.ts (new)
- packages/db/src/index.ts (modified)
- packages/db/drizzle/0000_careless_the_call.sql (new, generated)
- packages/db/drizzle/meta/0000_snapshot.json (new, generated)
- packages/db/drizzle/meta/_journal.json (new, generated)
- package.json (modified — root scripts)
