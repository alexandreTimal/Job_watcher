---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments: ['prd.md', 'architecture.md']
---

# JobFindeer - Epic Breakdown

## Overview

Ce document fournit le decoupage complet en epics et stories pour JobFindeer, decomposant les exigences du PRD et de l'Architecture en stories implementables.

## Requirements Inventory

### Functional Requirements

FR1: Le candidat peut creer un compte via email/mot de passe ou OAuth Google
FR2: Le candidat peut se connecter et se deconnecter depuis mobile et desktop
FR3: Le candidat peut demarrer un essai gratuit de 7 jours sans carte bancaire
FR4: Le candidat peut souscrire a un abonnement mensuel (9,90 EUR ou 19,90 EUR)
FR5: Le candidat peut gerer son abonnement (upgrade, downgrade, annulation)
FR6: Le candidat peut exporter l'integralite de ses donnees personnelles (RGPD)
FR7: Le candidat peut supprimer son compte et toutes ses donnees (droit a l'oubli)
FR8: Le candidat peut uploader son CV (PDF) lors de l'onboarding
FR9: Le systeme peut extraire les competences, experience et localisation du CV via LLM
FR10: Le candidat peut valider et ajuster le profil extrait par le LLM
FR11: Le candidat peut definir ses preferences : type de contrat, fourchette salariale, teletravail, secteurs preferes, perimetre geographique
FR12: Le candidat peut modifier ses preferences et son profil a tout moment
FR13: Le candidat peut ajouter des mots-cles negatifs pour exclure certaines offres
FR14: Le candidat peut consulter un feed quotidien d'offres scorees par compatibilite avec son profil
FR15: Le systeme affiche pour chaque offre : titre, entreprise, salaire, localisation, type de contrat, score de compatibilite, justification courte du score
FR16: Le candidat peut trier les offres par swipe sur mobile (garder, ecarter, mettre de cote)
FR17: Le candidat peut consulter ses offres sauvegardees sur la version web desktop
FR18: Le candidat peut acceder a l'offre originale sur le site source via redirection one-tap
FR19: Le candidat peut marquer une offre comme "candidate"
FR20: Le systeme logge chaque redirection vers une source (preuve de trafic renvoye)
FR21: Le candidat peut recevoir une notification email quotidienne indiquant le nombre de nouvelles offres a fort match
FR22: Le candidat peut activer ou desactiver les notifications
FR23: Le systeme peut collecter des offres via l'API officielle France Travail
FR24: Le systeme peut collecter des metadonnees d'offres depuis WTTJ par scraping
FR25: Le systeme peut collecter des offres depuis 1-2 sources complementaires (HelloWork ou autre)
FR26: Le systeme peut normaliser les offres collectees (titre, entreprise, localisation, salaire, contrat)
FR27: Le systeme peut dedupliquer les offres cross-sources via hash normalise
FR28: Le systeme peut purger les offres expirees automatiquement (retention courte)
FR29: Le systeme stocke uniquement les metadonnees des offres, jamais la description complete
FR30: Le systeme respecte robots.txt et s'arrete si une source bloque techniquement
FR31: Le systeme peut scorer chaque offre par rapport a un profil candidat selon des regles ponderees (mots-cles, salaire, localisation, contrat, experience)
FR32: Le systeme genere un feed pre-calcule par profil via pipeline batch nocturne
FR33: Le systeme fournit une justification courte du score pour chaque offre
FR34: L'administrateur peut consulter le taux de succes de chaque source de scraping
FR35: L'administrateur recoit une alerte automatique quand un scraper casse
FR36: L'administrateur peut consulter les logs d'erreur par source avec contexte (selecteur, URL, code HTTP)
FR37: L'administrateur peut relancer un run de test sur une source depuis le dashboard
FR38: L'administrateur peut consulter les metriques globales (offres collectees/jour, taux de dedup, utilisateurs servis)
FR39: Le systeme peut traiter une demande de cessation de scraping d'une source dans un delai rapide
FR40: Le systeme peut desactiver une source de collecte sans impact sur les autres sources
FR41: Le systeme conserve les logs de redirection comme preuve de loyaute

### NonFunctional Requirements

NFR1: Le feed mobile se charge en < 2s sur connexion 4G
NFR2: First Contentful Paint < 1.5s
NFR3: Time to Interactive < 3s
NFR4: Bundle JS initial < 200 KB gzippe
NFR5: Le pipeline batch nocturne se termine avant 7h
NFR6: Le swipe d'une offre repond en < 300ms
NFR7: Donnees chiffrees en transit (HTTPS/TLS)
NFR8: Donnees sensibles (CV, profil) chiffrees au repos dans Postgres
NFR9: Mots de passe hashes avec bcrypt ou argon2
NFR10: Tokens de session expirent apres inactivite prolongee
NFR11: Paiements delegues a Stripe — aucune donnee bancaire stockee par JobFindeer
NFR12: Secrets (cles API, tokens) jamais exposes cote client ni commites
NFR13: Architecture supporte une montee a 100 000 MAU sans reecriture fondamentale
NFR14: VPS initial suffit pour 100-500 utilisateurs ; scale-up par migration VPS, pas par changement d'architecture
NFR15: Pipeline scraping decouple du trafic utilisateur
NFR16: Cout operationnel < 5 EUR/client/mois payant a toute echelle
NFR17: Disponibilite > 99% (hors maintenance planifiee)
NFR18: Si une source echoue, les autres continuent (isolation des erreurs)
NFR19: Backup Postgres quotidien des donnees utilisateur
NFR20: Panne du pipeline n'empeche pas la consultation du feed existant
NFR21: Conformite WCAG 2.1 AA sur les deux surfaces
NFR22: Zones de tap minimum 44x44px sur mobile
NFR23: Contraste texte/fond ratio 4.5:1 minimum sur les cartes d'offres
NFR24: Navigation clavier complete sur desktop
NFR25: API France Travail via OAuth2 client_credentials avec refresh automatique
NFR26: Stripe webhooks pour synchronisation des etats d'abonnement (essai -> payant -> annule -> expire)
NFR27: LLM (Gemini) via couche d'abstraction permettant de changer de provider
NFR28: Chaque integration externe gere les erreurs reseau sans crasher le service
NFR29: Logs structures par run du pipeline (offres collectees, filtrees, dedupliquees, scorees, par source)
NFR30: Alerte automatique si taux de succes d'une source < 50%
NFR31: Error tracking centralise (Sentry) frontend et backend
NFR32: Metriques business : utilisateurs actifs, taux de swipe positif, taux de redirection

### Additional Requirements

- Starter template : `create-t3-turbo` (monorepo Turborepo + tRPC + Drizzle + Zod + shadcn/ui + Tailwind v4)
- Remplacer `better-auth` par Auth.js (adaptateur Drizzle officiel, OAuth Google)
- Retirer Expo (`apps/expo`) — app native prevue Phase 2
- Ajouter `apps/pipeline` : workers BullMQ (scraping, scoring, feed, email) — process Node.js separe
- Ajouter `packages/queue` : config BullMQ partagee, types de jobs, connexion Redis
- Ajouter Stripe : Checkout + webhooks dans `apps/web`
- Ajouter Sentry : error tracking frontend + backend + pipeline
- Configurer PWA : manifest.json, service worker, mode standalone
- Adapter DB de Supabase vers Postgres classique (VPS Hetzner + Docker Compose)
- Ajouter deux layouts Next.js : `(mobile)` et `(desktop)` — deux surfaces distinctes
- Infrastructure : 4 containers Docker Compose (web, worker, postgres, redis) + Caddy reverse proxy + HTTPS Let's Encrypt
- CI/CD : GitHub Actions -> build images -> push GHCR -> SSH deploy
- Chiffrement colonnes sensibles via `pgcrypto` cote Postgres
- Notifications MVP : email uniquement via Resend (pas de push), push Web prevu Phase 2
- LLM : Vercel AI SDK (`ai` npm), provider Gemini Flash, structured output Zod
- Stockage CV : filesystem VPS (volume Docker `/data/uploads/`), migration S3 si multi-serveurs Phase 2
- Backup : pg_dump quotidien via script cron sur VPS
- Scheduler pipeline nocturne : BullMQ RepeatableJob (cron natif)
- Types intermediaires pipeline : RawJobOffer, NormalizedOffer, ScoredOffer, FeedItem dans `packages/validators`
- Alerte sante sources : job BullMQ `check-source-health` apres chaque pipeline run

### UX Design Requirements

Aucun document UX Design trouve. Section non applicable.

### FR Coverage Map

FR1: Epic 1 - Inscription email/OAuth Google
FR2: Epic 1 - Connexion/deconnexion mobile et desktop
FR3: Epic 1 - Essai gratuit 7 jours sans carte bancaire
FR4: Epic 6 - Abonnement mensuel Stripe (9,90 EUR / 19,90 EUR)
FR5: Epic 6 - Gestion abonnement (upgrade, downgrade, annulation)
FR6: Epic 6 - Export donnees personnelles RGPD
FR7: Epic 6 - Suppression compte et donnees (droit a l'oubli)
FR8: Epic 3 - Upload CV (PDF) onboarding
FR9: Epic 3 - Extraction competences/experience/localisation CV via LLM
FR10: Epic 3 - Validation et ajustement profil extrait
FR11: Epic 3 - Definition preferences (contrat, salaire, teletravail, secteurs, geo)
FR12: Epic 3 - Modification preferences et profil a tout moment
FR13: Epic 3 - Mots-cles negatifs pour exclure des offres
FR14: Epic 4 - Feed quotidien d'offres scorees par compatibilite
FR15: Epic 4 - Affichage metadonnees + score + justification par offre
FR16: Epic 4 - Tri par swipe mobile (garder, ecarter, mettre de cote)
FR17: Epic 5 - Consultation offres sauvegardees sur desktop
FR18: Epic 5 - Redirection one-tap vers site source
FR19: Epic 5 - Marquage offre comme "candidate"
FR20: Epic 5 - Logging redirection vers source (preuve trafic)
FR21: Epic 7 - Notification email quotidienne offres a fort match
FR22: Epic 7 - Activation/desactivation notifications
FR23: Epic 2 - Collecte offres via API France Travail
FR24: Epic 2 - Collecte metadonnees WTTJ par scraping
FR25: Epic 2 - Collecte sources complementaires (HelloWork ou autre)
FR26: Epic 2 - Normalisation offres (titre, entreprise, localisation, salaire, contrat)
FR27: Epic 2 - Deduplication cross-sources via hash normalise
FR28: Epic 2 - Purge offres expirees (retention courte)
FR29: Epic 2 - Stockage metadonnees uniquement
FR30: Epic 2 - Respect robots.txt, arret si source bloque
FR31: Epic 4 - Scoring regles ponderees par profil
FR32: Epic 4 - Feed pre-calcule par profil via pipeline batch nocturne
FR33: Epic 4 - Justification courte du score par offre
FR34: Epic 7 - Taux de succes par source de scraping
FR35: Epic 7 - Alerte automatique quand un scraper casse
FR36: Epic 7 - Logs erreur par source avec contexte
FR37: Epic 7 - Relance run de test sur une source
FR38: Epic 7 - Metriques globales (offres/jour, taux dedup, utilisateurs servis)
FR39: Epic 2 - Traitement demande cessation scraping
FR40: Epic 2 - Desactivation source sans impact sur les autres
FR41: Epic 5 - Conservation logs redirection comme preuve de loyaute

## Epic List

### Sprint 0 : Fondation Technique
Le developpeur dispose d'un monorepo fonctionnel avec DB, infra Docker et CI/CD, pret a recevoir les features produit.
**Prerequis technique — pas de valeur utilisateur directe.**

### Epic 1 : Authentification & Inscription
Le candidat peut creer un compte, se connecter et beneficier d'un essai gratuit de 7 jours.
**FRs couverts :** FR1, FR2, FR3

### Epic 2 : Pipeline de Collecte & Traitement des Offres
L'administrateur peut executer le pipeline qui collecte, normalise, deduplique et stocke les offres depuis plusieurs sources.
**FRs couverts :** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR39, FR40

### Epic 3 : Onboarding Candidat & Profil
Le candidat peut creer son profil en uploadant son CV, definir ses preferences, et ajuster ses criteres a tout moment.
**FRs couverts :** FR8, FR9, FR10, FR11, FR12, FR13

### Epic 4 : Scoring, Feed & Experience Mobile
Le candidat peut consulter son feed quotidien d'offres scorees sur mobile et trier par swipe.
**FRs couverts :** FR14, FR15, FR16, FR31, FR32, FR33

### Epic 5 : Experience Desktop & Archivage
Le candidat peut consulter ses offres sauvegardees sur desktop, acceder aux sources originales, et suivre ses candidatures.
**FRs couverts :** FR17, FR18, FR19, FR20, FR41

### Epic 6 : Abonnement Stripe & RGPD
Le candidat peut souscrire un abonnement, gerer sa facturation, exporter ses donnees et supprimer son compte.
**FRs couverts :** FR4, FR5, FR6, FR7

### Epic 7 : Dashboard Ops, Notifications & Observabilite
L'administrateur peut monitorer le pipeline et les sources. Le candidat recoit ses notifications email quotidiennes.
**FRs couverts :** FR21, FR22, FR34, FR35, FR36, FR37, FR38

---

## Sprint 0 : Fondation Technique

Le developpeur dispose d'un monorepo fonctionnel avec DB, infra Docker et CI/CD, pret a recevoir les features produit.

### Story 0.1 : Initialisation du monorepo depuis create-t3-turbo

En tant que developpeur,
Je veux un monorepo TypeScript initialise depuis create-t3-turbo avec la structure nettoyee,
Afin de disposer de la fondation technique pour developper toutes les features.

**Acceptance Criteria:**

**Given** un repertoire vide
**When** le starter create-t3-turbo est clone et nettoye
**Then** le monorepo contient `apps/web` (Next.js 15 App Router), `packages/db` (Drizzle), `packages/api` (tRPC v11), `packages/ui` (shadcn/ui + Tailwind v4), `packages/validators` (Zod)
**And** `apps/expo` est supprime (app native prevue Phase 2)
**And** `better-auth` est retire du package `packages/auth`
**And** les packages supplementaires sont crees : `apps/pipeline`, `packages/queue`, `packages/email`
**And** `turbo.json`, `pnpm-workspace.yaml`, `tsconfig` de base sont configures
**And** `.env.example` liste toutes les variables d'environnement requises
**And** `.gitignore` exclut node_modules/, .env, data/
**And** `pnpm install` et `pnpm build` s'executent sans erreur

### Story 0.2 : Schema Drizzle, Postgres & chiffrement pgcrypto

En tant que developpeur,
Je veux un schema de base de donnees Postgres avec chiffrement des colonnes sensibles,
Afin de stocker les donnees d'authentification de maniere securisee des le depart.

**Acceptance Criteria:**

**Given** le monorepo initialise (Story 0.1)
**When** le package `packages/db` est configure avec Drizzle ORM et Postgres
**Then** les tables `users`, `sessions`, `accounts` (pour Auth.js) sont definies dans `packages/db/src/schema/`
**And** `packages/db/src/crypto.ts` exporte les custom column types pour pgcrypto (les tables `user_profiles` et `user_preferences` seront ajoutees dans Epic 3)
**And** `drizzle.config.ts` est configure pour la connexion Postgres via variable d'environnement `DATABASE_URL`
**And** la premiere migration est generee via Drizzle Kit (`generate`)
**And** un `docker-compose.dev.yml` demarre un container Postgres et Redis pour le dev local
**And** `pnpm db:push` ou `pnpm db:migrate` applique le schema sans erreur

### Story 0.3 : Infrastructure Docker, Caddy, CI/CD & Sentry

En tant que developpeur,
Je veux une infrastructure de deploiement automatisee avec monitoring,
Afin de deployer et operer JobFindeer en production de maniere fiable.

**Acceptance Criteria:**

**Given** le monorepo avec apps/web et apps/pipeline
**When** les Dockerfiles sont crees
**Then** `apps/web/Dockerfile` build Next.js en mode standalone (`output: 'standalone'`)
**And** `apps/pipeline/Dockerfile` build le worker Node.js

**Given** les Dockerfiles
**When** `docker-compose.yml` est configure
**Then** 4 services sont definis : `web`, `worker`, `postgres`, `redis`
**And** les volumes persistent les donnees Postgres et le repertoire `/data/uploads/`
**And** `docker compose up` demarre l'ensemble sans erreur

**Given** Docker Compose
**When** Caddy est configure via `Caddyfile`
**Then** le reverse proxy route le trafic vers le container web
**And** HTTPS est automatique via Let's Encrypt (NFR7)

**Given** le repo GitHub
**When** les workflows GitHub Actions sont configures
**Then** `ci.yml` execute lint + tests sur chaque PR
**And** `deploy.yml` build les images, les push sur GHCR, et deploie via SSH (`docker compose pull && up -d`)

**Given** l'application deployee
**When** Sentry est integre
**Then** les erreurs frontend et backend sont capturees (NFR31)
**And** le DSN Sentry est configure via variable d'environnement

**Given** `apps/web`
**When** la PWA est configuree
**Then** `public/manifest.json` definit le nom, les icones et le mode `standalone`
**And** les deux layouts Next.js `(mobile)` et `(desktop)` sont crees (vides, prets a recevoir les pages)

---

## Epic 1 : Authentification & Inscription

Le candidat peut creer un compte, se connecter et beneficier d'un essai gratuit de 7 jours.

### Story 1.1 : Authentification Auth.js (email + OAuth Google)

En tant que candidat,
Je veux creer un compte via email/mot de passe ou Google et me connecter,
Afin d'acceder a JobFindeer de maniere securisee.

**Acceptance Criteria:**

**Given** un utilisateur non inscrit
**When** il remplit le formulaire d'inscription avec email et mot de passe
**Then** un compte est cree avec le mot de passe hashe via argon2 (NFR9)
**And** une session est creee avec expiration configurable (NFR10)
**And** l'utilisateur est redirige vers l'application

**Given** un utilisateur non inscrit
**When** il clique sur "S'inscrire avec Google"
**Then** le flow OAuth Google se declenche via Auth.js
**And** un compte est cree a partir des informations Google
**And** une session est creee

**Given** un utilisateur inscrit
**When** il se connecte via email/mot de passe ou Google
**Then** une session valide est creee
**And** il peut se deconnecter depuis n'importe quelle surface (mobile ou desktop) (FR2)

**Given** le package `packages/auth`
**When** Auth.js est configure
**Then** l'adaptateur Drizzle est utilise pour la persistance
**And** les providers email et Google sont configures
**And** les routes Auth.js sont exposees dans `apps/web/src/app/api/auth/[...nextauth]/route.ts`
**And** les pages login et register sont creees dans le layout `(auth)`

### Story 1.2 : Essai gratuit 7 jours & roles utilisateur

En tant que candidat,
Je veux beneficier d'un essai gratuit de 7 jours sans carte bancaire,
Afin de tester JobFindeer avant de m'engager financierement.

**Acceptance Criteria:**

**Given** un nouvel utilisateur qui s'inscrit
**When** son compte est cree
**Then** un champ `trial_ends_at` est defini a `now + 7 jours`
**And** son role est `candidate` par defaut
**And** il a acces a toutes les fonctionnalites pendant la periode d'essai (FR3)

**Given** un utilisateur dont l'essai est expire et sans abonnement actif
**When** il tente d'acceder au feed ou aux fonctionnalites premium
**Then** il est redirige vers la page d'abonnement

**Given** le middleware tRPC
**When** une procedure `protectedProcedure` est appelee
**Then** l'utilisateur doit etre authentifie et avoir un essai actif ou un abonnement valide
**And** une procedure `adminProcedure` verifie en plus que le role est `admin`

---

## Epic 2 : Pipeline de Collecte & Traitement des Offres

L'administrateur peut executer le pipeline qui collecte, normalise, deduplique et stocke les offres depuis plusieurs sources.

### Story 2.1 : Structure pipeline BullMQ & schema offres

En tant que developpeur,
Je veux le squelette du pipeline BullMQ avec le schema des offres en base,
Afin de disposer de l'infrastructure pour les workers de collecte.

**Acceptance Criteria:**

**Given** le monorepo avec `apps/pipeline` et `packages/queue`
**When** le package queue est configure
**Then** `packages/queue/src/index.ts` exporte la connexion Redis et la factory de queues
**And** `packages/queue/src/queues.ts` definit les queues `scraping-pipeline`, `email-notifications`
**And** `packages/queue/src/types.ts` definit les types de jobs (`ScrapeJobData`, `ScoreJobData`, etc.)

**Given** le package `packages/db`
**When** les tables d'offres sont ajoutees
**Then** `raw_offers` stocke les metadonnees : titre, entreprise, localisation, salaire, type_contrat, url_source, date_publication, content_hash, source_name (FR29)
**And** `source_configs` stocke la config par source : nom, actif/inactif, derniere execution
**And** `pipeline_runs` stocke les metriques par run : source, offres_collectees, offres_filtrees, erreurs, duree, timestamp
**And** les migrations sont generees et applicables

**Given** `apps/pipeline/src/index.ts`
**When** le worker de scraping est demarre
**Then** il consomme les jobs de la queue `scraping-pipeline`
**And** le logger structure est disponible au format `[timestamp] [SOURCE] level: message`

### Story 2.2 : Source France Travail (API officielle)

En tant qu'administrateur,
Je veux collecter les offres depuis l'API officielle France Travail,
Afin de couvrir le plus grand job board public francais.

**Acceptance Criteria:**

**Given** les variables `FRANCE_TRAVAIL_CLIENT_ID` et `FRANCE_TRAVAIL_CLIENT_SECRET` dans `.env`
**When** la source `apps/pipeline/src/sources/france-travail.ts` est executee
**Then** un token OAuth2 est obtenu via `client_credentials` avec refresh automatique (NFR25)
**And** les offres sont recuperees via l'API `/partenaire/offresdemploi/v2/offres/search`
**And** les resultats sont mappes en `RawJobOffer[]` (titre, entreprise, localisation, salaire, contrat, URL, date)
**And** la source implemente l'interface `ScrapingSource` (`name` + `fetch()`)
**And** le rate limiting est respecte entre les requetes
**And** en cas d'erreur (token expire, reseau), la source retourne `[]` et log l'erreur (NFR28)

### Story 2.3 : Source WTTJ (scraping metadonnees)

En tant qu'administrateur,
Je veux collecter les metadonnees d'offres depuis Welcome to the Jungle,
Afin de couvrir le principal job board tech/startup francais.

**Acceptance Criteria:**

**Given** les URLs de recherche WTTJ configurees
**When** la source `apps/pipeline/src/sources/wttj.ts` est executee
**Then** les pages sont recuperees et parsees (Cheerio pour HTML statique, Playwright stealth si JS requis)
**And** seules les metadonnees sont extraites : titre, entreprise, localisation, type contrat, URL source, date (FR29)
**And** la source implemente l'interface `ScrapingSource`
**And** robots.txt est respecte (FR30)
**And** en cas de changement de structure HTML, l'erreur est loggee avec le selecteur qui a echoue
**And** la source retourne `[]` en cas d'erreur

### Story 2.4 : Source complementaire (HelloWork)

En tant qu'administrateur,
Je veux collecter les offres depuis une source complementaire,
Afin d'elargir la couverture des offres disponibles.

**Acceptance Criteria:**

**Given** la source HelloWork configuree
**When** la source `apps/pipeline/src/sources/hellowork.ts` est executee
**Then** les metadonnees sont extraites par scraping (Cheerio) : titre, entreprise, localisation, salaire, contrat, URL, date
**And** la source implemente l'interface `ScrapingSource`
**And** robots.txt est respecte (FR30)
**And** la source retourne `[]` en cas d'erreur avec log contextuel

### Story 2.5 : Normalisation, deduplication & purge

En tant qu'administrateur,
Je veux que les offres collectees soient normalisees, dedupliquees et les anciennes purgees,
Afin d'avoir une base d'offres propre sans doublons.

**Acceptance Criteria:**

**Given** des `RawJobOffer[]` collectees depuis plusieurs sources
**When** le normalizer (`apps/pipeline/src/processing/normalizer.ts`) est applique
**Then** les titres sont normalises (lowercase, trim, suppression suffixes H/F) (FR26)
**And** les entreprises, localisations et salaires sont normalises dans un format uniforme
**And** les offres sont validees via le schema Zod `rawJobOfferSchema` dans `packages/validators`

**Given** des offres normalisees
**When** le deduplicator (`apps/pipeline/src/processing/deduplicator.ts`) est applique
**Then** un hash SHA-256 est calcule sur titre_normalise + entreprise_normalisee + source (FR27)
**And** les offres dont le hash existe deja en base sont filtrees
**And** les nouvelles offres sont inserees dans `raw_offers`

**Given** la table `raw_offers`
**When** le purger (`apps/pipeline/src/processing/purger.ts`) est execute
**Then** les offres `pending` de plus de 7 jours sont supprimees (FR28)
**And** les offres `saved` ne sont jamais purgees

### Story 2.6 : Orchestrateur pipeline & scheduler nocturne

En tant qu'administrateur,
Je veux un orchestrateur qui execute le pipeline complet chaque nuit et que je puisse desactiver une source,
Afin d'avoir des offres fraiches chaque matin sans intervention manuelle.

**Acceptance Criteria:**

**Given** toutes les sources configurees dans `source_configs`
**When** le pipeline nocturne se declenche
**Then** seules les sources avec `actif = true` sont executees (FR40)
**And** les sources sont executees en parallele via `Promise.allSettled` (NFR18)
**And** chaque source est un job BullMQ separe avec retry (3 tentatives, backoff exponentiel)
**And** apres collecte : normalisation → validation Zod → dedup → insertion DB
**And** un `pipeline_run` est enregistre par source avec metriques (offres collectees, filtrees, erreurs, duree)
**And** le pipeline se termine avant 7h (NFR5)

**Given** le scheduler
**When** BullMQ RepeatableJob est configure
**Then** le pipeline est declenche automatiquement chaque nuit a l'heure configuree
**And** une source peut etre desactivee dans `source_configs` sans impact sur les autres (FR39, FR40)

---

## Epic 3 : Onboarding Candidat & Profil

Le candidat peut creer son profil en uploadant son CV, definir ses preferences, et ajuster ses criteres a tout moment.

### Story 3.1 : Schema profil & preferences + Upload CV & extraction LLM

En tant que candidat,
Je veux uploader mon CV pour que le systeme extraie automatiquement mon profil,
Afin de ne pas saisir manuellement mes competences et mon experience.

**Acceptance Criteria:**

**Given** le package `packages/db`
**When** les tables de profil sont ajoutees
**Then** les tables `user_profiles` et `user_preferences` sont definies avec les colonnes sensibles chiffrees via `pgcrypto` (NFR8)
**And** les migrations sont generees et applicables

**Given** un candidat connecte sur la page d'onboarding
**When** il uploade un fichier CV au format PDF (FR8)
**Then** le fichier est stocke dans le volume Docker `/data/uploads/` avec un nom unique
**And** le LLM (Vercel AI SDK + Gemini Flash) extrait les competences, l'experience et la localisation (FR9)
**And** l'extraction utilise un structured output Zod pour garantir le format (NFR27)
**And** les donnees extraites sont presentees au candidat pour validation

**Given** un CV uploade
**When** l'extraction LLM echoue (timeout, erreur provider)
**Then** le candidat est informe et peut reessayer ou saisir manuellement
**And** l'erreur est capturee par Sentry

### Story 3.2 : Validation du profil extrait & ecran preferences

En tant que candidat,
Je veux valider et ajuster le profil extrait puis definir mes preferences de recherche,
Afin que le scoring corresponde exactement a mes attentes.

**Acceptance Criteria:**

**Given** un profil extrait par le LLM
**When** le candidat consulte l'ecran de validation (ProfileReview)
**Then** il voit un resume structure : competences, annees d'experience, localisation (FR10)
**And** il peut modifier chaque champ avant de valider
**And** les donnees validees sont chiffrees et sauvegardees dans `user_profiles` (NFR8)

**Given** le profil valide
**When** le candidat accede a l'ecran de preferences (PreferencesForm)
**Then** il peut definir : type de contrat, fourchette salariale, teletravail, secteurs preferes, perimetre geographique (FR11)
**And** les preferences sont validees via Zod (`preferencesSchema`)
**And** les preferences sont sauvegardees dans `user_preferences`
**And** un message confirme la sauvegarde : "Ton premier feed sera pret demain matin"

### Story 3.3 : Modification du profil, preferences & mots-cles negatifs

En tant que candidat,
Je veux modifier mes preferences et ajouter des mots-cles negatifs a tout moment,
Afin d'affiner mon feed quand les resultats ne me conviennent pas.

**Acceptance Criteria:**

**Given** un candidat connecte sur desktop
**When** il accede a `/settings` dans le layout `(desktop)`
**Then** le composant PreferencesEditor affiche les preferences actuelles en mode edition (FR12)
**And** il peut modifier tous les champs (contrat, salaire, teletravail, secteurs, geo)
**And** les modifications sont sauvegardees via tRPC `profile.updatePreferences`

**Given** l'ecran de preferences
**When** le candidat ajoute des mots-cles negatifs (FR13)
**Then** il peut saisir des mots-cles a exclure (ex: "PHP", "stage", "alternance")
**And** les mots-cles sont valides via Zod et sauvegardes dans `user_preferences`
**And** le prochain feed prendra en compte les mots-cles negatifs dans le scoring

**Given** un candidat sur mobile
**When** il accede a ses preferences depuis le feed
**Then** il est redirige vers la page desktop `/settings` (les preferences se gerent sur desktop)

---

## Epic 4 : Scoring, Feed & Experience Mobile

Le candidat peut consulter son feed quotidien d'offres scorees sur mobile et trier par swipe.

### Story 4.1 : Moteur de scoring regles ponderees

En tant que systeme,
Je veux scorer chaque offre par rapport a chaque profil candidat,
Afin de generer un feed pertinent et personnalise.

**Acceptance Criteria:**

**Given** une offre normalisee et un profil utilisateur (competences, preferences)
**When** le scoring engine (`apps/pipeline/src/scoring/rules-engine.ts`) est applique
**Then** un score est calcule selon des regles ponderees : mots-cles (match competences), salaire (dans la fourchette), localisation (perimetre geo), type contrat (match preference), experience (adequation) (FR31)
**And** chaque critere a un poids configurable
**And** les mots-cles negatifs du profil reduisent le score

**Given** un score calcule
**When** la justification (`apps/pipeline/src/scoring/justification.ts`) est generee
**Then** une justification courte est produite au format "87% — React + Lyon + 38-42k" (FR33)
**And** la justification liste les criteres principaux qui ont contribue au score

### Story 4.2 : Generation du feed pre-calcule par profil

En tant que candidat,
Je veux que mon feed quotidien soit pre-calcule chaque nuit,
Afin d'avoir mes offres pretes quand j'ouvre l'app le matin.

**Acceptance Criteria:**

**Given** des offres en base et des profils utilisateur
**When** le feed worker (`apps/pipeline/src/workers/feed.worker.ts`) s'execute apres le scoring
**Then** pour chaque utilisateur actif (essai ou abonnement valide), un feed est genere dans `user_feeds`
**And** chaque entree a le statut `pending`, un score et une justification
**And** les offres sont triees par score decroissant (FR32)

**Given** la table `user_feeds`
**When** le schema est defini
**Then** les colonnes incluent : user_id, offer_id, score, justification, status (`pending` | `saved` | `dismissed`), created_at
**And** un index existe sur `(user_id, status)` pour des requetes rapides

### Story 4.3 : API tRPC feed & swipe

En tant que candidat,
Je veux consulter mon feed et trier les offres par swipe,
Afin de garder les offres interessantes et ecarter les autres.

**Acceptance Criteria:**

**Given** un candidat authentifie avec un feed genere
**When** il appelle `feed.list` via tRPC
**Then** les offres `pending` sont retournees triees par score decroissant
**And** chaque offre contient : titre, entreprise, salaire, localisation, type contrat, score, justification (FR15)
**And** la reponse est scoped par `user_id`

**Given** un candidat qui swipe une offre
**When** il appelle `feed.swipe` avec le statut (`saved`, `dismissed`)
**Then** le statut de l'offre dans `user_feeds` est mis a jour (FR16)
**And** la mutation repond en < 300ms (NFR6)
**And** la query `feed.list` est invalidee dans TanStack Query

### Story 4.4 : Interface swipe mobile (PWA)

En tant que candidat,
Je veux une interface mobile de type swipe pour trier mes offres,
Afin de gerer mon feed rapidement dans les transports.

**Acceptance Criteria:**

**Given** un candidat connecte sur mobile
**When** il accede a `/feed` dans le layout `(mobile)`
**Then** les offres sont affichees sous forme de cartes empilees (SwipeStack)
**And** chaque carte (OfferCard) affiche : titre, entreprise, salaire, localisation, type contrat, score de compatibilite, justification courte (FR15)
**And** le candidat peut swiper a droite (sauvegarder), a gauche (ecarter) (FR16)
**And** les zones de tap font minimum 44x44px (NFR22)
**And** le contraste texte/fond respecte le ratio 4.5:1 (NFR23)

**Given** le feed mobile
**When** la page se charge sur une connexion 4G
**Then** le feed est affiche en < 2s (NFR1)
**And** le First Contentful Paint est < 1.5s (NFR2)
**And** un skeleton loading est affiche pendant le chargement via `loading.tsx`

---

## Epic 5 : Experience Desktop & Archivage

Le candidat peut consulter ses offres sauvegardees sur desktop, acceder aux sources originales, et suivre ses candidatures.

### Story 5.1 : Liste des offres sauvegardees & redirection source

En tant que candidat,
Je veux consulter mes offres sauvegardees sur desktop et acceder aux sites sources,
Afin de postuler depuis mon ordinateur le soir.

**Acceptance Criteria:**

**Given** un candidat connecte sur desktop
**When** il accede a `/offers` dans le layout `(desktop)`
**Then** la page affiche la liste de ses offres avec statut `saved` (FR17)
**And** chaque offre affiche : titre, entreprise, salaire, localisation, type contrat, score, date
**And** le composant OfferTable permet de trier et filtrer les offres

**Given** une offre dans la liste
**When** le candidat clique sur "Voir sur la source" (FR18)
**Then** il est redirige vers l'URL source originale dans un nouvel onglet
**And** la redirection est loggee dans `redirection_logs` avec user_id, offer_id, url, timestamp (FR20, FR41)

**Given** le tRPC router `offers`
**When** `offers.saved` est appele
**Then** seules les offres `saved` du user_id courant sont retournees
**And** `offers.redirect` enregistre le log de redirection

### Story 5.2 : Marquage candidature & landing page marketing

En tant que candidat,
Je veux marquer une offre comme "candidate" et decouvrir JobFindeer via une landing page,
Afin de suivre mes candidatures et que de nouveaux utilisateurs comprennent le produit.

**Acceptance Criteria:**

**Given** une offre sauvegardee dans la liste desktop
**When** le candidat clique sur "Marquer comme candidate" (FR19)
**Then** le statut de l'offre passe a `applied`
**And** la date de candidature est enregistree
**And** l'offre reste visible dans la liste avec un badge "Candidate"

**Given** un visiteur non connecte
**When** il accede a la page d'accueil desktop `/`
**Then** une landing page marketing s'affiche avec : promesse produit, fonctionnalites cles, CTA inscription
**And** les meta tags SEO, Open Graph et structured data sont presents
**And** la navigation clavier est complete (NFR24)

---

## Epic 6 : Abonnement Stripe & RGPD

Le candidat peut souscrire un abonnement, gerer sa facturation, exporter ses donnees et supprimer son compte.

### Story 6.1 : Integration Stripe Checkout & webhooks

En tant que candidat,
Je veux souscrire un abonnement mensuel via Stripe,
Afin de continuer a utiliser JobFindeer apres la periode d'essai.

**Acceptance Criteria:**

**Given** un candidat dont l'essai expire ou qui veut s'abonner
**When** il accede a `/billing` dans le layout `(desktop)`
**Then** les deux plans sont affiches : 9,90 EUR/mois et 19,90 EUR/mois (FR4)
**And** le bouton "S'abonner" redirige vers Stripe Checkout
**And** aucune donnee bancaire n'est stockee par JobFindeer (NFR11)

**Given** un paiement Stripe reussi
**When** le webhook Stripe est recu dans `apps/web/src/app/api/stripe/webhook/route.ts`
**Then** la table `stripe_subscriptions` est mise a jour avec le statut actif
**And** l'utilisateur a acces aux fonctionnalites premium immediatement

**Given** un webhook Stripe
**When** un evenement de type `customer.subscription.updated` ou `customer.subscription.deleted` est recu
**Then** le statut de l'abonnement est synchronise (essai → payant → annule → expire) (NFR26)
**And** l'evenement est enregistre dans `stripe_events` pour tracabilite

### Story 6.2 : Gestion abonnement (upgrade, downgrade, annulation)

En tant que candidat,
Je veux gerer mon abonnement depuis JobFindeer,
Afin de changer de plan ou annuler sans friction.

**Acceptance Criteria:**

**Given** un candidat avec un abonnement actif
**When** il accede a `/billing`
**Then** il voit son plan actuel, la prochaine date de facturation, et l'historique des paiements
**And** il peut upgrader ou downgrader son plan (FR5)
**And** le changement est effectue via l'API Stripe (proration automatique)

**Given** un candidat qui veut annuler
**When** il clique sur "Annuler l'abonnement" (FR5)
**Then** l'abonnement est annule a la fin de la periode en cours (pas de remboursement au prorata)
**And** le candidat conserve l'acces jusqu'a la fin de la periode payee
**And** un message confirme la date de fin d'acces

### Story 6.3 : Export donnees & suppression de compte (RGPD)

En tant que candidat,
Je veux exporter mes donnees ou supprimer mon compte,
Afin d'exercer mes droits RGPD.

**Acceptance Criteria:**

**Given** un candidat connecte
**When** il demande l'export de ses donnees (FR6)
**Then** un fichier JSON est genere contenant : profil, preferences, offres sauvegardees, historique de swipes, logs de redirection
**And** le fichier est telechargeable immediatement
**And** les colonnes chiffrees (pgcrypto) sont dechiffrees pour l'export

**Given** un candidat connecte
**When** il demande la suppression de son compte (FR7)
**Then** une confirmation est demandee (action irreversible)
**And** toutes ses donnees sont supprimees : user, profil, preferences, feeds, logs, CV uploade
**And** l'abonnement Stripe est annule si actif
**And** la session est detruite et l'utilisateur est redirige vers la page d'accueil
**And** la suppression est effective immediatement (pas de delai de grace)

---

## Epic 7 : Dashboard Ops, Notifications & Observabilite

L'administrateur peut monitorer le pipeline et les sources. Le candidat recoit ses notifications email quotidiennes.

### Story 7.1 : Dashboard monitoring sources & metriques

En tant qu'administrateur,
Je veux un dashboard affichant l'etat des sources et les metriques globales,
Afin de detecter et resoudre les problemes du pipeline rapidement.

**Acceptance Criteria:**

**Given** un administrateur connecte (role `admin`)
**When** il accede a `/admin` dans le layout admin
**Then** la page affiche une carte par source avec : nom, statut (actif/inactif), taux de succes sur les dernieres 24h, nombre d'offres collectees (FR34)
**And** les metriques globales sont affichees : offres collectees/jour, taux de dedup, utilisateurs servis (FR38)
**And** le composant MetricsCharts affiche les tendances sur 7/30 jours

**Given** le dashboard
**When** les donnees sont chargees
**Then** les metriques proviennent de la table `pipeline_runs` via tRPC `admin.sources` et `admin.metrics`
**And** la page est protegee par le middleware `adminProcedure`

### Story 7.2 : Logs erreur, alertes automatiques & run de test

En tant qu'administrateur,
Je veux consulter les logs d'erreur, recevoir des alertes et relancer un test sur une source,
Afin de diagnostiquer et corriger les problemes rapidement.

**Acceptance Criteria:**

**Given** un administrateur sur `/admin/sources`
**When** il consulte les logs d'une source
**Then** les erreurs sont affichees avec contexte : selecteur CSS, URL, code HTTP, timestamp (FR36)
**And** le composant PipelineRunsTable affiche l'historique des runs avec statut et metriques

**Given** un administrateur
**When** il clique sur "Relancer un test" sur une source (FR37)
**Then** un job BullMQ est cree via tRPC `admin.testRun`
**And** le pipeline execute cette source uniquement
**And** le resultat est affiche dans le dashboard

**Given** un pipeline run termine
**When** le taux de succes d'une source est < 50% (NFR30)
**Then** une alerte automatique est envoyee par email a l'administrateur via Resend (FR35)
**And** le job `check-source-health` BullMQ est execute apres chaque run

### Story 7.3 : Notifications email quotidiennes

En tant que candidat,
Je veux recevoir un email quotidien avec le nombre de nouvelles offres a fort match,
Afin de ne pas rater les meilleures opportunites.

**Acceptance Criteria:**

**Given** un candidat avec notifications activees et un feed genere
**When** le email worker (`apps/pipeline/src/workers/email.worker.ts`) s'execute apres la generation du feed
**Then** un email est envoye via Resend avec le template `DailyRecap.tsx` (React Email) (FR21)
**And** l'email contient : nombre de nouvelles offres, top 3 offres par score, lien vers le feed
**And** le rate limiting Resend (3000/mois tier gratuit) est respecte

**Given** un candidat
**When** il accede aux parametres de notification
**Then** il peut activer ou desactiver les emails quotidiens (FR22)
**And** la preference est sauvegardee dans `user_preferences`
**And** le email worker respecte cette preference avant l'envoi
