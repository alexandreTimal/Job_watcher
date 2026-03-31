---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-03-30'
inputDocuments: ['prd.md', 'architecture.md']
---

# Job_watcher - Epic Breakdown

## Overview

Ce document fournit le découpage complet en epics et stories pour Job_watcher, décomposant les exigences du PRD et de l'Architecture en stories implémentables.

## Inventaire des Exigences

### Exigences Fonctionnelles

- FR1 : Le système peut collecter des offres d'emploi depuis des flux RSS (Indeed, Google Alerts, HelloWork)
- FR2 : Le système peut collecter des offres via l'API REST France Travail (OAuth2 client_credentials)
- FR3 : Le système peut collecter des offres depuis WTTJ (API interne ou scraping avec rendu JS)
- FR4 : Le système peut collecter des offres depuis Station F (scraping HTML statique)
- FR5 : Le système peut détecter des changements sur les pages carrières d'entreprises configurées (hash diff)
- FR6 : Le système peut extraire des offres depuis les emails d'alertes LinkedIn reçus dans Gmail
- FR7 : Le système peut parser des flux RSS 2.0 et Atom de manière générique
- FR8 : Le système peut respecter un délai configurable entre requêtes HTTP pour éviter les bans
- FR9 : Le système peut scorer chaque offre selon des mots-clés pondérés par catégorie (poste, tech, contrat, contexte)
- FR10 : Le système peut appliquer des mots-clés négatifs pour exclure les offres non pertinentes
- FR11 : Le système peut classifier les offres en 3 niveaux de priorité selon le score
- FR12 : Le système peut ignorer les offres dont le score est inférieur au seuil configurable
- FR13 : Le système peut normaliser les titres et noms d'entreprise (lowercase, trim, suppression suffixes H/F)
- FR14 : Le système peut identifier les doublons cross-sources via hash titre+entreprise
- FR15 : Le système peut appliquer une fenêtre temporelle configurable de dédoublonnage (défaut : 30 jours)
- FR16 : Le système peut stocker l'historique des offres vues dans une base SQLite locale
- FR17 : Le système peut stocker les hashs de pages carrières pour la détection de changements
- FR18 : Le système peut créer automatiquement la base de données et les tables au premier lancement
- FR19 : Le système peut créer une entrée dans la base Notion pour chaque offre pertinente
- FR20 : Le système peut renseigner toutes les propriétés Notion (entreprise, poste, contrat, localisation, source, lien, score, priorité, statut par défaut, date relance)
- FR21 : Le système peut éviter de créer des doublons dans Notion
- FR22 : L'utilisateur peut configurer les mots-clés, poids et seuils de scoring dans config.ts
- FR23 : L'utilisateur peut configurer les URLs RSS et pages carrières à surveiller
- FR24 : L'utilisateur peut configurer les secrets (tokens API) via variables d'environnement .env
- FR25 : L'utilisateur peut activer/désactiver des sources individuellement
- FR26 : Le système peut s'exécuter en mode cron (one-shot, toutes sources, code retour 0/1)
- FR27 : Le système peut s'exécuter en mode dry-run (affichage console sans écriture Notion/SQLite)
- FR28 : Le système peut s'exécuter en mode verbose (logs détaillés)
- FR29 : Le système peut exécuter toutes les sources en parallèle avec isolation des erreurs
- FR30 : Le système peut logger un résumé par run (offres scannées, filtrées, ajoutées, erreurs par source)
- FR31 : Le système peut logger les erreurs avec contexte suffisant pour diagnostic (source, sélecteur, URL, code HTTP)
- FR32 : Le système peut continuer l'exécution même si une ou plusieurs sources échouent
- FR33 : L'utilisateur peut consulter les statistiques des runs via une interface web locale
- FR34 : L'utilisateur peut visualiser l'historique des offres collectées dans le tableau de bord
- FR35 : Le tableau de bord peut fonctionner en lecture seule sur la base SQLite existante

### Exigences Non-Fonctionnelles

- NFR1 : Un run complet (toutes sources) doit s'exécuter en moins de 2 minutes
- NFR2 : Le délai entre requêtes HTTP doit être configurable (défaut : 1-2s)
- NFR3 : Les sources sont exécutées en parallèle pour minimiser le temps total
- NFR4 : Le tableau de bord local doit se charger en moins de 3 secondes
- NFR5 : Aucun secret ne doit être commité dans le code source
- NFR6 : Les secrets sont stockés exclusivement dans .env (local) ou GitHub Secrets (CI)
- NFR7 : Le fichier .env est listé dans .gitignore
- NFR8 : Le tableau de bord local est accessible uniquement sur localhost
- NFR9 : Chaque intégration externe doit gérer les erreurs réseau sans crasher le process
- NFR10 : Les tokens OAuth doivent être rafraîchissables sans redéploiement
- NFR11 : Le rate limiting de l'API Notion (3 req/s) doit être respecté
- NFR12 : La base SQLite doit supporter les accès concurrents lecture/écriture sans corruption

### Exigences Additionnelles (Architecture)

- Setup manuel TypeScript : npm init, rss-parser, better-sqlite3, dotenv, tsx
- Activer PRAGMA journal_mode=WAL pour concurrence SQLite dashboard/cron
- Définir le type ScoredOffer (extension de JobOffer avec score et priority) dans types.ts
- Validateur centralisé (validator.ts) entre sources et pipeline
- util.parseArgs natif Node.js 20+ pour les flags CLI (--dry-run, --verbose)
- Dashboard Next.js + shadcn/ui dans /dashboard (sous-projet séparé)
- Pipeline : sources (parallèle) → validateur → scoring → dédoublonnage → Notion

### Exigences UX Design

Aucune (pas de document UX)

### Carte de Couverture des Exigences

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 1 | Collecte RSS (Indeed, Google Alerts, HelloWork) |
| FR2 | Epic 3 | API France Travail |
| FR3 | Epic 3 | WTTJ (API/scraping) |
| FR4 | Epic 3 | Station F (Cheerio) |
| FR5 | Epic 3 | Monitoring pages carrières |
| FR6 | Epic 4 | LinkedIn emails (Gmail API) |
| FR7 | Epic 1 | Parser RSS/Atom générique |
| FR8 | Epic 1 | Rate limiting configurable |
| FR9-12 | Epic 1 | Scoring et filtrage |
| FR13-15 | Epic 1 | Dédoublonnage |
| FR16-18 | Epic 1 | Stockage SQLite |
| FR19-21 | Epic 2 | Intégration Notion |
| FR22-25 | Epic 1 | Configuration |
| FR26-29 | Epic 1 | Modes d'exécution |
| FR30-32 | Epic 1 | Observabilité et résilience |
| FR33-35 | Epic 5 | Tableau de bord local |

## Liste des Epics

### Epic 1 : Fondation du Projet et Pipeline de Base
L'utilisateur peut exécuter le script qui collecte des offres depuis des flux RSS, les score, les dédoublonne et les affiche en console.
**FRs couverts :** FR1, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32

### Epic 2 : Intégration Notion
L'utilisateur peut retrouver les offres pertinentes dans sa base Notion avec toutes les métadonnées, sans doublons.
**FRs couverts :** FR19, FR20, FR21

### Epic 3 : Sources API et Scraping
L'utilisateur bénéficie d'une couverture élargie grâce aux sources France Travail, WTTJ, Station F et au monitoring des pages carrières.
**FRs couverts :** FR2, FR3, FR4, FR5

### Epic 4 : Parsing Emails LinkedIn
L'utilisateur reçoit dans son pipeline les offres détectées via les alertes email LinkedIn dans Gmail.
**FRs couverts :** FR6

### Epic 5 : Tableau de Bord Local
L'utilisateur peut consulter les statistiques et l'historique des offres via une interface web locale (Next.js + shadcn/ui).
**FRs couverts :** FR33, FR34, FR35

---

## Epic 1 : Fondation du Projet et Pipeline de Base

L'utilisateur peut exécuter le script qui collecte des offres depuis des flux RSS, les score, les dédoublonne et les affiche en console.

### Story 1.1 : Initialisation du Projet et Types de Base

En tant qu'utilisateur,
Je veux un projet TypeScript initialisé avec les types partagés et la configuration centralisée,
Afin de disposer de la fondation pour développer tous les modules.

**Acceptance Criteria:**

**Given** un répertoire vide
**When** j'exécute les commandes d'initialisation (npm init, install deps, tsc --init)
**Then** le projet contient package.json, tsconfig.json, et la structure src/ avec sources/, filters/, notifications/, store/, utils/
**And** `src/types.ts` définit les interfaces `JobOffer`, `ScoredOffer`, `Source`, `RunContext`
**And** `src/config.ts` exporte la configuration typée (mots-clés par catégorie avec poids, URLs RSS, pages carrières, seuils)
**And** `.env.example` liste toutes les variables d'environnement requises
**And** `.gitignore` exclut node_modules/, data/, .env

### Story 1.2 : Stockage SQLite et Logger

En tant qu'utilisateur,
Je veux une base SQLite locale avec un logger structuré,
Afin de persister les offres vues et d'avoir des logs lisibles par run.

**Acceptance Criteria:**

**Given** le projet initialisé
**When** le module `src/store/sqlite.ts` est importé
**Then** la base `data/job-watcher.db` est créée automatiquement si elle n'existe pas
**And** les tables `seen_offers` et `page_hashes` sont créées avec le schéma défini dans le PRD
**And** `PRAGMA journal_mode=WAL` est activé à la connexion
**And** `src/utils/logger.ts` exporte des fonctions info/warn/error au format `[timestamp] [SOURCE] level: message`
**And** `src/utils/sleep.ts` exporte une fonction `sleep(ms)` pour le rate limiting

### Story 1.3 : Parser RSS Générique et Sources Indeed/Google Alerts/HelloWork

En tant qu'utilisateur,
Je veux collecter les offres depuis les flux RSS Indeed, Google Alerts et HelloWork,
Afin d'avoir mes premières offres dans le pipeline.

**Acceptance Criteria:**

**Given** des URLs RSS configurées dans `config.ts`
**When** les sources `indeed-rss.ts`, `google-alerts-rss.ts` et `hellowork-rss.ts` sont exécutées
**Then** chaque source retourne un `JobOffer[]` via `fetchOffers()`
**And** `src/utils/rss-parser.ts` gère le parsing RSS 2.0 et Atom de manière générique
**And** un délai configurable est respecté entre les requêtes HTTP (FR8)
**And** chaque source wrappe ses appels dans try/catch et retourne `[]` en cas d'erreur
**And** les logs indiquent le nombre d'offres récupérées par source

### Story 1.4 : Filtrage par Scoring et Dédoublonnage

En tant qu'utilisateur,
Je veux que les offres soient scorées par pertinence et dédoublonnées,
Afin de ne voir que les offres pertinentes sans doublons.

**Acceptance Criteria:**

**Given** une liste de `JobOffer[]` bruts
**When** le validateur (`validator.ts`) puis le filtre (`keyword-filter.ts`) sont appliqués
**Then** chaque offre reçoit un score basé sur les mots-clés pondérés (high_match×3, tech_match×2, contract_match×2, context_match×1, negative×-5)
**And** les offres avec score < seuil configurable sont ignorées
**And** les offres sont classifiées en 3 priorités (⭐ score 3, ⭐⭐ score 4-6, ⭐⭐⭐ score ≥7)
**And** `dedup.ts` normalise titre+entreprise, calcule le hash, vérifie dans SQLite (fenêtre 30 jours)
**And** les nouvelles offres sont insérées dans `seen_offers`

### Story 1.5 : Orchestrateur et Modes d'Exécution

En tant qu'utilisateur,
Je veux exécuter le pipeline complet avec les flags --dry-run et --verbose,
Afin de lancer la collecte en mode production ou en mode test.

**Acceptance Criteria:**

**Given** le script `src/index.ts`
**When** j'exécute `npx tsx src/index.ts`
**Then** toutes les sources activées sont exécutées en parallèle via `Promise.allSettled`
**And** les offres brutes sont agrégées, validées, scorées et dédoublonnées
**And** un résumé est loggé : X offres scannées, Y filtrées, Z nouvelles
**And** le code retour est 0 si au moins une source a fonctionné, 1 sinon

**Given** le flag `--dry-run`
**When** j'exécute `npx tsx src/index.ts --dry-run`
**Then** le pipeline s'exécute mais aucune écriture n'a lieu dans SQLite ni Notion
**And** les résultats sont affichés en console

**Given** le flag `--verbose`
**When** j'exécute `npx tsx src/index.ts --verbose`
**Then** les logs incluent le niveau DEBUG avec le détail de chaque offre traitée

---

## Epic 2 : Intégration Notion

L'utilisateur retrouve les offres pertinentes dans sa base Notion avec toutes les métadonnées, sans doublons.

### Story 2.1 : Client Notion et Création d'Entrées

En tant qu'utilisateur,
Je veux que les offres pertinentes soient automatiquement ajoutées dans ma base Notion,
Afin de consulter ma veille quotidienne dans un seul endroit.

**Acceptance Criteria:**

**Given** une liste de `ScoredOffer[]` nouvelles (après dédoublonnage)
**When** le module `src/notifications/notion.ts` est exécuté
**Then** une page Notion est créée pour chaque offre avec les propriétés : Entreprise (title), Poste (rich text), Type contrat (select), Localisation (rich text), Source (select), Lien offre (URL), Date publication (date), Score (number), Priorité (select ⭐/⭐⭐/⭐⭐⭐), Statut (select, défaut "🔵 À postuler"), Date relance (date = publication + 7 jours)
**And** un `sleep(350ms)` est respecté entre chaque requête pour ne pas dépasser 3 req/s (NFR11)
**And** les erreurs réseau sont gérées sans crasher le process (NFR9)
**And** les offres déjà présentes dans Notion ne sont pas recréées (FR21, vérification via le hash dans SQLite)
**And** le flag `--dry-run` empêche toute écriture dans Notion (log uniquement)

---

## Epic 3 : Sources API et Scraping

L'utilisateur bénéficie d'une couverture élargie grâce aux sources France Travail, WTTJ, Station F et au monitoring des pages carrières.

### Story 3.1 : Source France Travail API

En tant qu'utilisateur,
Je veux collecter les offres depuis l'API France Travail,
Afin de couvrir le plus grand job board public français.

**Acceptance Criteria:**

**Given** les variables `FRANCE_TRAVAIL_CLIENT_ID` et `FRANCE_TRAVAIL_CLIENT_SECRET` dans `.env`
**When** la source `france-travail.ts` est exécutée
**Then** un token OAuth2 est obtenu via client_credentials
**And** les offres sont récupérées via `GET /partenaire/offresdemploi/v2/offres/search` avec les paramètres configurés (motsCles, typeContrat, departement)
**And** les résultats sont mappés en `JobOffer[]`
**And** le rate limiting est respecté entre les requêtes
**And** en cas d'erreur (token expiré, réseau), la source retourne `[]` et log l'erreur

### Story 3.2 : Source WTTJ

En tant qu'utilisateur,
Je veux collecter les offres depuis Welcome to the Jungle,
Afin de couvrir le principal job board tech/startup français.

**Acceptance Criteria:**

**Given** les URLs de recherche WTTJ configurées dans `config.ts`
**When** la source `wttj.ts` est exécutée
**Then** les offres sont récupérées via l'API interne WTTJ ou par scraping Playwright si l'API est indisponible
**And** les résultats sont mappés en `JobOffer[]` (titre, entreprise, localisation, type contrat, lien, date)
**And** en cas de changement de structure HTML, l'erreur est loggée avec le sélecteur qui a échoué
**And** la source retourne `[]` en cas d'erreur

### Story 3.3 : Source Station F

En tant qu'utilisateur,
Je veux collecter les offres depuis le job board Station F,
Afin de détecter les opportunités dans l'écosystème startup français.

**Acceptance Criteria:**

**Given** l'URL `https://jobs.stationf.co/jobs`
**When** la source `station-f.ts` est exécutée
**Then** la page est récupérée et parsée via Cheerio
**And** les cartes d'offres sont extraites (titre, entreprise, localisation, type contrat, lien)
**And** les résultats sont mappés en `JobOffer[]`
**And** la source retourne `[]` en cas d'erreur avec log contextuel

### Story 3.4 : Monitoring Pages Carrières

En tant qu'utilisateur,
Je veux être informé quand une entreprise ciblée publie de nouvelles offres sur sa page carrières,
Afin de détecter des opportunités invisibles sur les job boards.

**Acceptance Criteria:**

**Given** une liste d'URLs de pages carrières configurées dans `config.ts` (14+ entreprises)
**When** la source `career-pages.ts` est exécutée
**Then** chaque page est récupérée et le contenu pertinent est extrait via Cheerio (sélecteur CSS configurable par site)
**And** un hash SHA-256 du contenu normalisé est calculé et comparé au hash précédent dans `page_hashes`
**And** si le hash a changé, une `JobOffer` est créée avec le titre "[Changement détecté] {nom entreprise}" et le lien de la page
**And** le nouveau hash est sauvegardé dans `page_hashes`
**And** le rate limiting est respecté entre les requêtes

---

## Epic 4 : Parsing Emails LinkedIn

L'utilisateur reçoit dans son pipeline les offres détectées via les alertes email LinkedIn dans Gmail.

### Story 4.1 : Source LinkedIn via Gmail API

En tant qu'utilisateur,
Je veux que les offres des alertes email LinkedIn soient intégrées dans mon pipeline,
Afin de ne pas rater les opportunités détectées par LinkedIn.

**Acceptance Criteria:**

**Given** les variables `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` dans `.env`
**When** la source `linkedin-email.ts` est exécutée
**Then** les emails récents de `jobs-noreply@linkedin.com` sont récupérés via l'API Gmail (scope `gmail.readonly`)
**And** le HTML de chaque email est parsé pour extraire titre, entreprise et lien de l'offre
**And** les résultats sont mappés en `JobOffer[]`
**And** le token OAuth est rafraîchi automatiquement si expiré (NFR10)
**And** la source retourne `[]` en cas d'erreur avec log contextuel

---

## Epic 5 : Tableau de Bord Local

L'utilisateur peut consulter les statistiques et l'historique des offres via une interface web locale (Next.js + shadcn/ui).

### Story 5.1 : Setup Next.js + shadcn/ui et Page Stats

En tant qu'utilisateur,
Je veux un tableau de bord local affichant les statistiques de mes runs,
Afin de suivre l'efficacité de ma veille d'un coup d'œil.

**Acceptance Criteria:**

**Given** le sous-projet `dashboard/` initialisé avec Next.js + shadcn/ui + Tailwind
**When** j'exécute `cd dashboard && npm run dev`
**Then** la page d'accueil affiche des cartes statistiques : nombre total d'offres, offres par source, offres par niveau de priorité, offres ajoutées aujourd'hui
**And** une API route `api/stats/route.ts` lit la base SQLite en lecture seule (`../data/job-watcher.db`)
**And** la page se charge en moins de 3 secondes (NFR4)
**And** le serveur écoute uniquement sur localhost (NFR8)

### Story 5.2 : Page Liste des Offres avec Filtres

En tant qu'utilisateur,
Je veux consulter la liste de toutes les offres collectées avec des filtres,
Afin de retrouver facilement une offre spécifique.

**Acceptance Criteria:**

**Given** le dashboard en cours d'exécution
**When** je navigue vers `/offers`
**Then** une table affiche toutes les offres avec colonnes : entreprise, poste, source, score, priorité, date
**And** je peux filtrer par source, par plage de score, par date
**And** je peux trier par n'importe quelle colonne
**And** une API route `api/offers/route.ts` retourne les offres depuis SQLite en lecture seule
**And** la table supporte la pagination
