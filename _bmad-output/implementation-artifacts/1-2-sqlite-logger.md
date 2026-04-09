# Story 1.2: Stockage SQLite et Logger

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux une base SQLite locale avec un logger structuré,
Afin de persister les offres vues et d'avoir des logs lisibles par run.

## Acceptance Criteria

1. La base `data/job-watcher.db` est créée automatiquement si elle n'existe pas
2. Les tables `seen_offers` et `page_hashes` sont créées avec le schéma du PRD
3. `PRAGMA journal_mode=WAL` est activé à la connexion
4. `src/utils/logger.ts` exporte des fonctions info/warn/error au format `[timestamp] [SOURCE] level: message`
5. `src/utils/sleep.ts` exporte une fonction `sleep(ms)` pour le rate limiting

## Tasks / Subtasks

- [ ] Task 1 (AC: 1-3) Créer src/store/sqlite.ts
  - [ ] Importer better-sqlite3
  - [ ] Ouvrir/créer la DB dans `data/job-watcher.db` (créer le dossier data/ si absent)
  - [ ] Activer `PRAGMA journal_mode=WAL` immédiatement après connexion
  - [ ] Créer table `seen_offers`: id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT UNIQUE NOT NULL, title TEXT NOT NULL, company TEXT, url TEXT, source TEXT NOT NULL, score INTEGER DEFAULT 0, first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP, notified_notion BOOLEAN DEFAULT 0
  - [ ] Créer table `page_hashes`: url TEXT PRIMARY KEY, content_hash TEXT NOT NULL, last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
  - [ ] Créer index `idx_seen_hash` sur seen_offers(hash)
  - [ ] Créer index `idx_seen_date` sur seen_offers(first_seen_at)
  - [ ] Exporter fonctions: initDb(), getDb(), isOfferSeen(hash), insertOffer(offer), getPageHash(url), updatePageHash(url, hash)
- [ ] Task 2 (AC: 4) Créer src/utils/logger.ts
  - [ ] Exporter createLogger(source: string) qui retourne { info, warn, error, debug }
  - [ ] Format: `[2026-03-30T09:00:12Z] [INDEED] INFO: message`
  - [ ] debug() ne log que si RunContext.verbose === true
  - [ ] Utiliser console.log/warn/error (pas de fichier — GitHub Actions capture stdout)
- [ ] Task 3 (AC: 5) Créer src/utils/sleep.ts
  - [ ] `export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))`

## Dev Notes

- better-sqlite3 est synchrone — pas de async/await pour les opérations DB
- Le schéma SQL est exactement celui du PRD (section "SQLite : schéma de la base")
- WAL mode est nécessaire pour la concurrence lecture (dashboard Epic 5) / écriture (cron)
- Le logger ne doit PAS utiliser console.log directement — toujours passer par createLogger()
- Le dossier data/ doit être créé programmatiquement si absent (fs.mkdirSync avec recursive)

### Project Structure Notes

- src/store/sqlite.ts — seul module qui accède à la DB
- src/utils/logger.ts — seul module de logging, importé par tous les autres
- src/utils/sleep.ts — utilisé par toutes les sources pour le rate limiting

### References

- [Source: prd.md#SQLite : schéma de la base]
- [Source: architecture.md#Patterns de Format — Logging]
- [Source: architecture.md#Décisions Architecturales — Architecture des Données]
- [Source: architecture.md#Lacunes Mineures — WAL mode]
