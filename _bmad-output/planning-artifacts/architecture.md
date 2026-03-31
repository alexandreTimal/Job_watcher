---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-30'
inputDocuments: ['prd.md']
workflowType: 'architecture'
project_name: 'Job_watcher'
user_name: 'Alexandre'
date: '2026-03-30'
---

# Architecture Decision Document

_Ce document se construit collaborativement étape par étape. Les sections sont ajoutées au fur et à mesure des décisions architecturales._

## Analyse du Contexte Projet

### Vue d'ensemble des Exigences

**Exigences Fonctionnelles (35 FRs) :**
- Collecte multi-sources (8 FRs) : RSS, API REST, scraping statique/JS, email parsing — chaque source est un module autonome implémentant une interface commune
- Filtrage et scoring (4 FRs) : scoring pondéré par mots-clés, mots-clés négatifs, classification en 3 priorités, seuil configurable
- Dédoublonnage (3 FRs) : normalisation titre+entreprise, hash cross-sources, fenêtre temporelle configurable
- Stockage (3 FRs) : SQLite local, historique offres + hash pages carrières, auto-création DB
- Intégration Notion (3 FRs) : création entrées, propriétés complètes, anti-doublons Notion
- Configuration (4 FRs) : mots-clés/poids dans config.ts, URLs, secrets .env, activation/désactivation sources
- Exécution (4 FRs) : mode cron, dry-run, verbose, parallélisme avec isolation erreurs
- Observabilité (3 FRs) : résumé par run, logs erreurs contextuels, résilience
- Tableau de bord local (3 FRs) : stats, historique, lecture seule SQLite

**Exigences Non-Fonctionnelles (12 NFRs) :**
- Performance : run < 2 min, parallélisme sources, dashboard < 3s
- Sécurité : secrets hors code, .env + GitHub Secrets, localhost uniquement pour dashboard
- Intégration : gestion erreurs réseau, tokens OAuth refresh, rate limiting Notion 3 req/s, concurrence SQLite lecture/écriture

**Échelle & Complexité :**
- Domaine technique : Backend CLI / Data pipeline
- Complexité : Moyenne
- Composants architecturaux estimés : ~12 modules

### Contraintes Techniques & Dépendances

- Runtime : Node.js 20+ avec TypeScript (tsx pour exécution directe)
- HTTP : fetch natif (pas d'axios)
- SQLite : better-sqlite3 (synchrone)
- RSS : rss-parser ou fast-xml-parser
- Scraping : Cheerio (statique), Playwright (WTTJ si nécessaire)
- Pas de framework web pour le script principal
- Déploiement : GitHub Actions cron avec cache SQLite

### Préoccupations Transversales

- Rate limiting : délai configurable entre requêtes HTTP, applicable à toutes les sources
- Gestion d'erreurs : isolation par source via Promise.allSettled, logging contextuel
- Logging : structuré par source, timestamp, compteurs par run
- Configuration : partagée entre sources, filtrage, et orchestrateur
- Mode dry-run : court-circuite les effets de bord (Notion, SQLite) sans modifier le pipeline
- Accès concurrentiel SQLite : lecture (dashboard) / écriture (cron) à gérer

## Évaluation du Starter Template

### Domaine Technique

CLI Tool / Data pipeline TypeScript — script cron, pas d'interface web pour le script principal (le tableau de bord local est un composant séparé).

### Options Considérées

| Option | Verdict | Raison |
|---|---|---|
| oclif / commander | Rejeté | Sur-dimensionné pour un script cron sans CLI interactif |
| create-t3-app / Next.js | Rejeté | Framework web, pas adapté à un script batch |
| Yeoman generator | Rejeté | Complexité inutile pour un projet ciblé |
| Setup manuel TypeScript | **Retenu** | Contrôle total, zéro dépendance superflue, adapté au profil du projet |

### Setup Retenu : Initialisation Manuelle TypeScript

**Rationale :** Le projet est un script cron spécialisé avec des besoins très spécifiques (multi-source scraping, SQLite, Notion API). Aucun starter template n'apporte de valeur — chaque dépendance et chaque module sont choisis individuellement pour couvrir les besoins exacts.

**Commande d'initialisation :**

```bash
npm init -y
npm install rss-parser better-sqlite3 dotenv
npm install -D typescript @types/node @types/better-sqlite3 tsx
npx tsc --init --target es2022 --module nodenext --moduleResolution nodenext --outDir dist --rootDir src --strict true
mkdir -p src/{sources,filters,notifications,store,utils} data
```

**Décisions techniques fournies par ce setup :**

- **Langage & Runtime :** TypeScript strict, Node.js 20+, exécution via tsx (pas de build nécessaire)
- **Module system :** ESM natif (NodeNext)
- **Target :** ES2022 (top-level await, etc.)
- **Pas de bundler :** exécution directe via tsx, pas de Webpack/Vite/Turbopack
- **Pas de framework de test initial :** tests ajoutés si nécessaire (vitest recommandé)
- **Linting :** optionnel (ESLint + Prettier à ajouter si souhaité)

## Décisions Architecturales

### Priorité des Décisions

**Décisions critiques (bloquent l'implémentation) :**

| Catégorie | Décision | Choix | Rationale |
|---|---|---|---|
| Validation données | Niveau de validation | Validateur centralisé après collecte | Chaque source retourne des `JobOffer` bruts, un validateur unique normalise et vérifie les champs requis — un seul point de contrôle |
| Arguments CLI | Parsing des flags | `util.parseArgs` natif Node.js 20+ | Zero dépendance, suffisant pour --dry-run, --verbose, --source |
| Rate limiting | Stratégie | `await sleep(delay)` dans chaque source | Simple, configurable par source, pas besoin de rate limiter centralisé pour 8 sources en parallèle |
| Retry logic | Gestion des échecs | Pas de retry, log et continue | Le cron 4x/jour compense les échecs ponctuels. La simplicité prime |
| Dashboard | Framework | Next.js + shadcn/ui + Tailwind | Composants UI prêts à l'emploi, lecture SQLite via API routes |
| Logs | Destination | Console uniquement | GitHub Actions capture stdout/stderr nativement |

**Décisions importantes (façonnent l'architecture) :**

| Catégorie | Décision | Choix | Rationale |
|---|---|---|---|
| Structure projet | Organisation | Monorepo léger : `/src` pour le script cron, `/dashboard` pour le Next.js | Deux entry points séparés, DB SQLite partagée |
| Dashboard accès DB | Méthode | API routes Next.js lisant SQLite en lecture seule via better-sqlite3 | Pas de serveur séparé, Next.js sert tout |
| Dashboard démarrage | Commande | `cd dashboard && npm run dev` | Local uniquement, jamais déployé |

**Décisions différées :**

| Décision | Raison du report |
|---|---|
| Tests (vitest) | À ajouter quand le pipeline fonctionne |
| Linting (ESLint + Prettier) | Optionnel, ajout post-fonctionnel |

### Architecture des Données

- **Schéma SQLite** : 2 tables (`seen_offers`, `page_hashes`) — défini dans le PRD
- **Validation** : validateur centralisé dans `src/filters/validator.ts` — vérifie les champs requis (title, url, source) et normalise avant le pipeline
- **Emplacement DB** : `data/job-watcher.db`, partagée entre le script cron et le dashboard (lecture seule côté dashboard)

### Sécurité

- Secrets dans `.env` + `.gitignore`
- Dashboard accessible uniquement sur `localhost:3000`
- Pas d'authentification (usage personnel local uniquement)

### Communication & APIs

- **Rate limiting** : `sleep()` configurable par source (défaut 1-2s)
- **Pas de retry** : le cron 4x/jour compense naturellement les échecs ponctuels
- **Notion API** : rate limit respecté via `sleep(350ms)` entre requêtes (< 3 req/s)
- **Gestion erreurs HTTP** : chaque source wrappe ses appels dans try/catch, log l'erreur avec contexte (URL, status code), retourne `[]`

### Tableau de Bord Local

- **Framework** : Next.js + shadcn/ui + Tailwind
- **Emplacement** : `/dashboard` (sous-projet séparé avec son propre `package.json`)
- **Accès données** : API routes Next.js → `better-sqlite3` en lecture seule sur `../data/job-watcher.db`
- **Pages** : stats par source/score/date, liste des offres avec filtres, historique des runs
- **Non hébergé** : `npm run dev` en local uniquement

### Infrastructure & Déploiement

- **Script cron** : GitHub Actions (`0 7,11,15,19 * * 1-5`), persistance DB via `actions/cache`
- **Logs** : console uniquement (stdout capturé par GitHub Actions)
- **Dashboard** : local uniquement, jamais déployé
- **Code retour** : 0 si au moins une source a fonctionné, 1 si toutes ont échoué

### Analyse d'Impact

**Séquence d'implémentation :**
1. Types + config + SQLite + logger → fondation
2. Interface Source + validateur → contrat des modules
3. Sources RSS → premiers résultats
4. Filtrage + dédoublonnage → pipeline complet
5. Notion → output principal
6. Sources API/scraping → couverture complète
7. Flags CLI (dry-run, verbose) → modes d'exécution
8. Dashboard Next.js + shadcn → visualisation
9. GitHub Actions → déploiement

**Dépendances cross-composants :**
- Le dashboard dépend de la DB SQLite (doit être créée par le script d'abord)
- Le validateur est le point de convergence entre toutes les sources et le pipeline
- La config (`config.ts`) est partagée entre sources, filtrage et orchestrateur

## Patterns d'Implémentation & Règles de Cohérence

### Points de Conflit Identifiés

8 zones où des agents AI pourraient faire des choix différents si non spécifié.

### Conventions de Nommage

**Base de données SQLite :**
- Tables : `snake_case`, pluriel → `seen_offers`, `page_hashes`
- Colonnes : `snake_case` → `first_seen_at`, `content_hash`
- Index : `idx_{table}_{column}` → `idx_seen_hash`, `idx_seen_date`

**Code TypeScript :**
- Fichiers : `kebab-case.ts` → `keyword-filter.ts`, `rss-parser.ts`
- Interfaces/Types : `PascalCase` → `JobOffer`, `Source`, `FilterResult`
- Fonctions : `camelCase` → `fetchOffers()`, `calculateScore()`
- Variables : `camelCase` → `scoreThreshold`, `seenOffers`
- Constantes globales : `UPPER_SNAKE_CASE` → `KEYWORDS`, `MIN_SCORE`
- Répertoires : `kebab-case` → `src/sources/`, `src/filters/`

**Dashboard (Next.js) :**
- Composants : `PascalCase` fichier et export → `OfferTable.tsx`
- API routes : `kebab-case` → `app/api/offers/route.ts`

### Patterns de Structure

**Organisation des sources :**
Chaque source exporte une fonction `fetchOffers(): Promise<JobOffer[]>` — même signature, même type de retour.

**Organisation des tests (quand ajoutés) :**
- Co-localisés : `src/sources/indeed-rss.test.ts` à côté de `indeed-rss.ts`

**Config :**
- `src/config.ts` — configuration métier typée, exportée comme objet
- `.env` — secrets uniquement, chargés via `dotenv`

### Patterns de Format

**Type `JobOffer` (contrat central) :**
```typescript
interface JobOffer {
  title: string;
  company: string | null;
  url: string;
  source: string;          // identifiant source: 'indeed', 'wttj', 'france-travail', etc.
  location: string | null;
  contractType: string | null;
  publishedAt: Date | null;
  description: string | null;
}
```

Toutes les sources retournent des `JobOffer[]`. Le pipeline en aval ne connaît pas l'origine.

**Logging :**
```
[{timestamp}] [{SOURCE}] {level}: {message}
[2026-03-30T09:00:12Z] [INDEED] INFO: 23 offres récupérées, 8 après filtrage
[2026-03-30T09:00:12Z] [WTTJ] ERROR: Selector .job-card not found (status: 200, url: https://...)
```

Niveaux : `INFO`, `WARN`, `ERROR`. Pas de `DEBUG` sauf en mode `--verbose`.

**Dates :** ISO 8601 partout (`2026-03-30T09:00:00Z`). SQLite stocke en texte ISO.

### Patterns de Communication

**Orchestrateur → Sources :**
- `Promise.allSettled()` — jamais `Promise.all()`
- Chaque résultat est traité indépendamment (fulfilled = offres, rejected = log erreur)

**Pipeline séquentiel après collecte :**
```
sources (parallèle) → validateur → scoring → dédoublonnage → Notion
```

Pas d'événements, pas de pub/sub. Pipeline synchrone et linéaire après la phase de collecte parallèle.

### Patterns de Gestion d'Erreurs

**Chaque source :**
```typescript
try {
  const offers = await fetchFromSource();
  logger.info(`[${SOURCE}] ${offers.length} offres récupérées`);
  return offers;
} catch (error) {
  logger.error(`[${SOURCE}] ${error.message}`, { url, status: error.status });
  return [];
}
```

Règle : une source ne throw jamais vers l'orchestrateur. Elle retourne `[]` en cas d'erreur.

**Mode dry-run :**
- Le flag `--dry-run` est lu au démarrage et passé dans un objet `context` à travers le pipeline
- Les fonctions Notion et SQLite vérifient `context.dryRun` et loggent au lieu d'écrire

### Directives pour Agents AI

**OBLIGATOIRE :**
- Toute nouvelle source DOIT implémenter l'interface `Source` et retourner `JobOffer[]`
- Toute nouvelle source DOIT wrapper ses appels HTTP dans try/catch et retourner `[]` en cas d'erreur
- Tout appel HTTP DOIT respecter le délai de rate limiting configuré
- Les logs DOIVENT suivre le format `[{timestamp}] [{SOURCE}] {level}: {message}`

**INTERDIT :**
- Jamais de `console.log` direct — utiliser le logger
- Jamais de secrets en dur dans le code
- Jamais de `Promise.all()` pour les sources — toujours `Promise.allSettled()`
- Jamais de mutation de la config à runtime

## Structure du Projet & Frontières

### Structure Complète du Répertoire

```
job-watcher/
├── .env.example                    # Template variables d'environnement
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── .github/
│   └── workflows/
│       └── job-watcher.yml         # Cron GitHub Actions (4x/jour semaine)
├── data/
│   └── job-watcher.db              # SQLite DB (créée au runtime, gitignored)
├── src/
│   ├── index.ts                    # Orchestrateur principal (entry point cron)
│   ├── config.ts                   # Configuration centralisée (mots-clés, URLs, seuils)
│   ├── types.ts                    # Types partagés (JobOffer, Source, Context, etc.)
│   ├── sources/
│   │   ├── indeed-rss.ts           # FR1 — Parser RSS Indeed
│   │   ├── google-alerts-rss.ts    # FR1 — Parser RSS/Atom Google Alerts
│   │   ├── hellowork-rss.ts        # FR1 — Parser RSS HelloWork
│   │   ├── france-travail.ts       # FR2 — API REST France Travail (OAuth2)
│   │   ├── wttj.ts                 # FR3 — WTTJ (API interne ou Playwright)
│   │   ├── station-f.ts            # FR4 — Scraper Station F (Cheerio)
│   │   ├── career-pages.ts         # FR5 — Monitoring pages carrières (hash diff)
│   │   └── linkedin-email.ts       # FR6 — Parser emails LinkedIn (Gmail API)
│   ├── filters/
│   │   ├── validator.ts            # Validation centralisée des JobOffer bruts
│   │   ├── keyword-filter.ts       # FR9-12 — Scoring pondéré + classification priorité
│   │   └── dedup.ts                # FR13-15 — Dédoublonnage (hash titre+entreprise)
│   ├── notifications/
│   │   └── notion.ts               # FR19-21 — Client Notion API
│   ├── store/
│   │   └── sqlite.ts               # FR16-18 — Couche accès SQLite (seen_offers, page_hashes)
│   └── utils/
│       ├── rss-parser.ts           # FR7 — Utilitaire parse RSS/Atom générique
│       ├── html-parser.ts          # Helpers Cheerio
│       ├── logger.ts               # Logging structuré [timestamp] [SOURCE] level: message
│       └── sleep.ts                # Utilitaire rate limiting (await sleep(ms))
└── dashboard/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── components.json              # Config shadcn/ui
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx             # FR33 — Page stats (offres par source/score/date)
    │   │   ├── offers/
    │   │   │   └── page.tsx         # FR34 — Liste des offres avec filtres
    │   │   └── api/
    │   │       ├── offers/
    │   │       │   └── route.ts     # API route lecture SQLite → offres
    │   │       └── stats/
    │   │           └── route.ts     # API route lecture SQLite → statistiques
    │   ├── components/
    │   │   ├── ui/                  # Composants shadcn/ui
    │   │   ├── OfferTable.tsx       # Table des offres avec tri/filtre
    │   │   ├── StatsCards.tsx       # Cartes statistiques (offres/jour, par source)
    │   │   └── ScoreChart.tsx       # Graphique distribution des scores
    │   └── lib/
    │       └── db.ts               # FR35 — Connexion SQLite lecture seule (../data/job-watcher.db)
    └── public/
```

### Frontières Architecturales

**Frontière Sources → Pipeline :**
- Chaque fichier `src/sources/*.ts` est autonome
- Contrat : exporte `fetchOffers(): Promise<JobOffer[]>`
- Ne connaît pas le reste du pipeline (scoring, dédoublonnage, Notion)

**Frontière Pipeline → Effets de bord :**
- `src/notifications/notion.ts` et `src/store/sqlite.ts` sont les seuls modules qui écrivent
- En mode dry-run, ces modules loggent au lieu d'écrire
- Le pipeline (validator → filter → dedup) est pur : entrée `JobOffer[]`, sortie `JobOffer[]`

**Frontière Script Cron → Dashboard :**
- Communication uniquement via la DB SQLite (`data/job-watcher.db`)
- Le script cron écrit, le dashboard lit
- Pas de communication directe entre les deux processus

### Mapping Exigences → Structure

| Catégorie FR | Fichiers |
|---|---|
| Collecte (FR1-8) | `src/sources/*.ts`, `src/utils/rss-parser.ts`, `src/utils/sleep.ts` |
| Filtrage (FR9-12) | `src/filters/keyword-filter.ts` |
| Dédoublonnage (FR13-15) | `src/filters/dedup.ts` |
| Stockage (FR16-18) | `src/store/sqlite.ts` |
| Notion (FR19-21) | `src/notifications/notion.ts` |
| Configuration (FR22-25) | `src/config.ts`, `.env` |
| Exécution (FR26-29) | `src/index.ts` |
| Observabilité (FR30-32) | `src/utils/logger.ts`, `src/index.ts` |
| Dashboard (FR33-35) | `dashboard/` |

### Flux de Données

```
[Sources en parallèle] → JobOffer[][] → flat → [Validateur] → JobOffer[]
  → [Scoring] → ScoredOffer[] → [Dédoublonnage via SQLite] → ScoredOffer[]
  → [Notion API] → créations dans la base Notion
  → [Log résumé] → console stdout
```

## Résultats de Validation

### Validation de Cohérence ✅

**Compatibilité des décisions :**
- TypeScript + better-sqlite3 + fetch natif + rss-parser + Cheerio : toutes compatibles Node.js 20+
- ESM (NodeNext) compatible avec tsx, better-sqlite3, et rss-parser
- Next.js (dashboard) séparé dans `/dashboard` — pas de conflit avec le tsconfig du script cron

**Cohérence des patterns :**
- Conventions de nommage cohérentes (snake_case DB, camelCase TS, kebab-case fichiers)
- Pattern Source → `fetchOffers(): Promise<JobOffer[]>` uniforme sur les 8 sources
- Logging format uniforme `[timestamp] [SOURCE] level: message`

### Validation Couverture des Exigences ✅

**Couverture FR (35/35) :** Toutes les exigences fonctionnelles ont un fichier assigné dans le mapping structure.

**Couverture NFR (12/12) :** Performance (parallélisme, sleep configurable), sécurité (.env, localhost), intégration (try/catch, rate limiting Notion, WAL mode SQLite).

### Validation Prêt pour Implémentation ✅

- Toutes les décisions critiques documentées avec rationale
- Arborescence complète avec mapping FR → fichiers
- Patterns couverts : nommage, structure, format, communication, erreurs, dry-run

### Lacunes Mineures (non bloquantes)

- Activer `PRAGMA journal_mode=WAL` dans `sqlite.ts` pour concurrence lecture/écriture dashboard/cron
- Définir le type `ScoredOffer` (extension de `JobOffer` avec `score` et `priority`) dans `types.ts`

### Évaluation Finale

**Statut :** PRÊT POUR IMPLÉMENTATION
**Niveau de confiance :** Élevé

**Points forts :**
- Architecture pipeline claire et prévisible
- Isolation forte entre sources (ajout/suppression sans impact)
- Contrat `JobOffer` central qui découple toutes les couches
- Mode dry-run intégré dans la conception

**Première priorité d'implémentation :**
```bash
npm init -y && npm install rss-parser better-sqlite3 dotenv && npm install -D typescript @types/node @types/better-sqlite3 tsx
```
