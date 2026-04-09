# Story 1.1: Initialisation du Projet et Types de Base

Status: review

## Story

En tant qu'utilisateur,
Je veux un projet TypeScript initialisé avec les types partagés et la configuration centralisée,
Afin de disposer de la fondation pour développer tous les modules.

## Acceptance Criteria

1. Le projet contient package.json, tsconfig.json, et la structure src/ avec sources/, filters/, notifications/, store/, utils/
2. `src/types.ts` définit les interfaces JobOffer, ScoredOffer, Source, RunContext
3. `src/config.ts` exporte la configuration typée (mots-clés par catégorie avec poids, URLs RSS, pages carrières, seuils)
4. `.env.example` liste toutes les variables d'environnement requises
5. `.gitignore` exclut node_modules/, data/, .env, .env.local

## Tasks / Subtasks

- [x] Task 1 (AC: 1) Initialiser le projet
  - [x] `npm init -y`
  - [x] `npm install rss-parser better-sqlite3 dotenv`
  - [x] `npm install -D typescript @types/node @types/better-sqlite3 tsx`
  - [x] `npx tsc --init --target es2022 --module nodenext --moduleResolution nodenext --outDir dist --rootDir src --strict true`
  - [x] Créer les répertoires: `mkdir -p src/{sources,filters,notifications,store,utils} data`
- [x] Task 2 (AC: 2) Créer src/types.ts
  - [x] Interface `JobOffer`: title (string), company (string|null), url (string), source (string), location (string|null), contractType (string|null), publishedAt (Date|null), description (string|null)
  - [x] Interface `ScoredOffer`: extends JobOffer avec score (number), priority ('⭐'|'⭐⭐'|'⭐⭐⭐')
  - [x] Type `Source`: { name: string, enabled: boolean, fetchOffers: () => Promise<JobOffer[]> }
  - [x] Interface `RunContext`: { dryRun: boolean, verbose: boolean }
- [x] Task 3 (AC: 3) Créer src/config.ts
  - [x] Importer dotenv/config
  - [x] Exporter KEYWORDS avec catégories: high_match (poids 3), tech_match (poids 2), contract_match (poids 2), context_match (poids 1), negative (poids -5)
  - [x] Exporter RSS_URLS: Indeed (9 URLs), Google Alerts (12 URLs), HelloWork
  - [x] Exporter CAREER_PAGES: 14+ URLs avec sélecteurs CSS configurables
  - [x] Exporter SCORING: minScore (3), priorities ({7: '⭐⭐⭐', 4: '⭐⭐', 3: '⭐'})
  - [x] Exporter DEDUP: windowDays (30)
  - [x] Exporter RATE_LIMIT: delayMs (1500)
  - [x] Exporter les variables d'env: NOTION_API_KEY, NOTION_DATABASE_ID, FRANCE_TRAVAIL_CLIENT_ID/SECRET, GMAIL tokens
- [x] Task 4 (AC: 4-5) Créer .env.example et .gitignore
  - [x] .env.example avec tous les tokens (TELEGRAM supprimé — pas dans le scope)
  - [x] .gitignore: node_modules/, data/, .env, .env.local, dist/

## Dev Notes

- Runtime: Node.js 20+ avec TypeScript strict
- Module system: ESM natif (NodeNext) — tous les imports avec extensions .js
- Exécution via tsx (pas de build nécessaire)
- Les mots-clés sont ceux définis dans le PRD (section "Mots-clés par catégorie et poids")
- Les URLs RSS Indeed sont les 9 URLs listées dans le PRD
- Les Google Alerts sont les 12 alertes listées dans le PRD (URLs RSS à obtenir après création manuelle)
- CAREER_PAGES inclut les 14 URLs du PRD avec un sélecteur CSS par défaut configurable

### Project Structure Notes

- Ce story crée la structure racine du monorepo léger
- Le dashboard/ sera créé dans l'Epic 5
- Tous les fichiers suivent kebab-case.ts

### References

- [Source: architecture.md#Évaluation du Starter Template]
- [Source: architecture.md#Structure du Projet & Frontières]
- [Source: architecture.md#Patterns d'Implémentation]
- [Source: prd.md#Périmètre Produit]
- [Source: prd.md#Variables d'environnement requises]
- [Source: prd.md#Mots-clés par catégorie et poids]
