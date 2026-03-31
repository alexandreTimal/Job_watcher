---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: []
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: cli_tool
  domain: general
  complexity: medium
  projectContext: greenfield
  notifications: notion_only
---

# Product Requirements Document - Job_watcher

**Author:** Alexandre
**Date:** 2026-03-30

## Résumé Exécutif

Job_watcher est un outil CLI TypeScript exécuté en cron qui automatise la veille d'offres d'emploi (alternance et stage de fin d'études) pour un profil technique spécifique. Il agrège les offres depuis une dizaine de sources hétérogènes (flux RSS, APIs publiques, scraping web, parsing d'emails), les filtre par un système de scoring pondéré par mots-clés, dédoublonne les résultats via SQLite, et centralise les offres pertinentes dans une base Notion consultable quotidiennement.

Le problème résolu : la veille emploi manuelle sur de multiples plateformes est chronophage, sujette aux oublis, et génère du bruit (doublons, offres hors profil). Chaque jour sans automatisation est une offre potentiellement ratée.

L'utilisateur cible est Alexandre, étudiant Bac+5 Epitech Lyon (diplôme 2027), avec un profil TypeScript/React/Next.js, cherchant activement dès maintenant.

### Ce qui rend ce projet spécial

Contrairement aux alertes email génériques des plateformes d'emploi, Job_watcher est un pipeline sur-mesure calibré sur un profil exact : mots-clés pondérés par catégorie (poste, stack technique, type de contrat, contexte startup), scoring de pertinence avec 3 niveaux de priorité, et dédoublonnage cross-sources. Le résultat : ouvrir Notion une fois par jour et trouver uniquement du signal, zéro bruit.

L'insight clé : le problème n'est pas le manque d'offres, c'est le ratio signal/bruit. Le scoring transforme des centaines d'entrées brutes en une liste actionnable triée par pertinence.

## Classification du Projet

- **Type :** CLI Tool / Script d'automatisation cron
- **Domaine :** General (productivité personnelle / automatisation de veille)
- **Complexité :** Moyenne — intégration multi-sources (RSS, scraping, APIs), gestion d'état SQLite, dédoublonnage cross-plateformes
- **Contexte :** Greenfield — projet neuf, aucun code existant
- **Sortie :** Notion uniquement (pas de notifications push)

## Critères de Succès

### Succès Utilisateur

- Zéro doublon dans Notion : une offre identique trouvée sur plusieurs sources n'apparaît qu'une seule fois
- Zéro faux positif : aucune offre non pertinente ne passe le filtre (score < 3 = ignoré, pas d'exception)
- Consultation quotidienne de Notion suffit comme unique point de veille — plus besoin de visiter aucune plateforme manuellement
- Chaque entrée Notion contient toutes les infos nécessaires pour décider de postuler ou non (entreprise, poste, localisation, type contrat, lien direct, score, priorité)

### Succès Business

- Gain de temps : élimination complète de la veille manuelle multi-plateformes
- Couverture exhaustive : 8+ sources actives couvrant l'écosystème emploi français (job boards, APIs, pages carrières, alertes)
- Détection d'opportunités qui seraient passées inaperçues en veille manuelle (pages carrières, Google Alerts)

### Succès Technique

- Toutes les sources opérationnelles : Indeed RSS, Google Alerts RSS, WTTJ, France Travail API, HelloWork RSS, Station F, pages carrières, LinkedIn emails (Gmail API)
- Résilience : si une source échoue, les autres continuent normalement (isolation par try/catch)
- Exécution cron 4x/jour en semaine (9h, 13h, 17h, 21h heure FR)
- Logs structurés : timestamp, source, nombre d'offres trouvées/filtrées/ajoutées par run

### Résultats Mesurables

- 0% de doublons cross-sources dans Notion
- 0% de faux positifs (offres hors profil)
- 8 sources de données actives et fonctionnelles
- Exécution complète en < 2 minutes par run
- 100% des offres pertinentes stockées dans Notion avec scoring et métadonnées complètes

## Périmètre Produit

### Livraison Complète (pas de MVP — projet entier)

- **Sources RSS :** Indeed, Google Alerts, HelloWork (3 parsers RSS)
- **Sources API :** France Travail API REST (OAuth2 client_credentials)
- **Sources Scraping :** WTTJ (API interne ou Playwright), Station F (Cheerio)
- **Monitoring :** Pages carrières de 14+ entreprises (hash diff SHA-256)
- **Email Parsing :** Alertes LinkedIn via Gmail API
- **Filtrage :** Scoring pondéré par mots-clés (4 catégories + négatifs), seuil à 3 points, 3 niveaux de priorité
- **Dédoublonnage :** Hash titre+entreprise normalisés, fenêtre 30 jours, SQLite
- **Output :** Base Notion avec propriétés complètes (entreprise, poste, contrat, localisation, source, lien, score, priorité, statut, date relance, notes)
- **Déploiement :** GitHub Actions cron (4x/jour semaine) avec persistance SQLite via cache
- **Logs :** Logger structuré console + fichier

### Évolutions Futures (hors périmètre actuel)

- Notifications Telegram (temps réel + digest)
- Résumé IA des offres via API Claude
- Détection automatique de nouvelles sources pertinentes

## Parcours Utilisateur

### 1. Consultation quotidienne (parcours principal)

**Scène d'ouverture :** Chaque matin, Alexandre ouvre Notion avec son café. Avant Job_watcher, il passait 30-45 minutes à checker Indeed, WTTJ, LinkedIn, France Travail, des pages carrières... Maintenant il a une seule base Notion.

**Action :** Il ouvre sa database Notion, triée par date. Les nouvelles offres de la veille sont là, chacune avec un score de pertinence et une priorité (⭐ à ⭐⭐⭐). Il scanne les ⭐⭐⭐ d'abord, clique sur le lien direct, lit l'offre, et change le statut en "🟡 Postulée" s'il candidate. Pour les ⭐⭐, il fait un tri rapide. Les ⭐ il les ignore sauf si le titre l'intrigue.

**Climax :** Il tombe sur une offre Product Manager Alternance chez Finary, détectée via le monitoring de leur page carrières — une offre qu'il n'aurait jamais vue manuellement.

**Résolution :** En 5 minutes sa veille est faite. Il passe le reste de son temps à postuler au lieu de chercher.

### 2. Setup initial

**Scène d'ouverture :** Alexandre clone le repo, lit le README. Il doit connecter ses comptes et configurer ses préférences.

**Action :** Il copie `.env.example` en `.env`, renseigne ses tokens (Notion API, Gmail, France Travail). Il crée ses Google Alerts et récupère les URLs RSS. Il ajuste `config.ts` : ses mots-clés, les URLs de pages carrières à surveiller, les poids de scoring. Il lance `npx tsx src/index.ts` une première fois en local pour vérifier que tout tourne.

**Climax :** Le premier run détecte 47 offres brutes, en filtre 12 pertinentes, les pousse dans Notion. Ça marche.

**Résolution :** Il configure le cron GitHub Actions, push, et l'outil tourne en autonomie.

### 3. Maintenance et debug

**Scène d'ouverture :** Un matin, aucune offre WTTJ dans Notion depuis 3 jours. Quelque chose a cassé.

**Action :** Il consulte les logs du dernier run GitHub Actions. Il voit `[WTTJ] ERROR: Selector .job-card not found — page structure may have changed`. Les autres sources ont tourné normalement (résilience OK). Il inspecte le site WTTJ, constate un changement de HTML, met à jour le sélecteur CSS dans `wttj.ts`, teste en local, push.

**Résolution :** Le run suivant récupère les offres WTTJ normalement. Les offres des 3 jours manqués sont rattrapées.

### 4. Ajustement du scoring et des sources

**Scène d'ouverture :** Après 2 semaines d'utilisation, Alexandre constate trop d'offres "comptable" ou "juridique" qui passent avec un score de 3.

**Action :** Il ouvre `config.ts`, ajoute des mots-clés négatifs ("comptable", "juridique", "RH") et ajuste le seuil minimum. Il veut aussi surveiller une nouvelle startup qui vient de lever — il ajoute l'URL de leur page carrières dans la config.

**Résolution :** Les runs suivants sont plus propres. Plus tard, quand il cherchera un CDI au lieu d'une alternance, il modifiera les mots-clés `contract_match` et les URLs de recherche.

### 5. Ajout d'une nouvelle source

**Scène d'ouverture :** Un nouveau job board spécialisé tech apparaît. Alexandre veut l'intégrer.

**Action :** Il crée un nouveau fichier dans `src/sources/`, implémente l'interface `Source` (fetch + parse → `JobOffer[]`), l'ajoute à la liste des sources dans `config.ts`, teste en local.

**Résolution :** La nouvelle source est active au prochain run cron, intégrée dans le pipeline existant (filtrage, dédoublonnage, Notion).

### Synthèse des Capacités Révélées

| Parcours | Capacités requises |
|---|---|
| Consultation quotidienne | Notion avec métadonnées complètes, scoring, priorité, lien direct |
| Setup initial | Config centralisée, .env, documentation claire, exécution locale |
| Maintenance/debug | Logs structurés par source, isolation des erreurs, messages d'erreur explicites |
| Ajustement scoring/sources | Config modifiable (mots-clés, poids, URLs), hot-reload sans redéployer le cron |
| Ajout nouvelle source | Architecture modulaire, interface Source commune, ajout plug-and-play |

## Exigences Spécifiques CLI Tool

### Vue d'ensemble

Job_watcher est un script cron scriptable (non interactif) avec deux modes d'exécution : le mode normal (cron) qui écrit dans Notion + SQLite, et un mode dry-run pour tester sans effets de bord. Un tableau de bord local (accessible via navigateur, non hébergé) permet de visualiser les statistiques et l'historique.

### Structure des Commandes

- `npx tsx src/index.ts` — Exécution standard (cron), toutes sources actives
- `npx tsx src/index.ts --dry-run` — Simulation : affiche les résultats en console sans écrire dans Notion ni SQLite
- `npx tsx src/index.ts --verbose` — Logs détaillés pour debug
- Pas de shell completion nécessaire
- Pas de mode interactif

### Formats de Sortie

- **Notion API** — Output principal, base de données avec propriétés complètes
- **SQLite** — Stockage local pour dédoublonnage et historique
- **Console/logs** — Résumé par run (offres scannées, filtrées, ajoutées, erreurs)
- **Tableau de bord local** — Interface web servie en localhost pour visualiser les stats, l'historique des runs, les offres par source/score/date

### Schéma de Configuration

- **`.env`** — Secrets uniquement (tokens API Notion, Gmail, France Travail)
- **`config.ts`** — Configuration métier exportée : mots-clés par catégorie avec poids, URLs RSS, URLs pages carrières à surveiller, seuil de score minimum, fenêtre de dédoublonnage (jours)
- Pas de fichier de config externe (YAML/JSON) — tout en TypeScript pour le typage et l'autocomplétion

### Support Scripting

- Exécutable via GitHub Actions cron (process one-shot, code retour 0/1)
- Exécutable en local via `npx tsx`
- Compatible avec tout scheduler (cron unix, node-cron, Railway)
- Code retour non-zéro si erreur critique (toutes les sources échouent)

### Considérations d'Implémentation

- Architecture modulaire : chaque source implémente une interface `Source` commune (`fetch() → JobOffer[]`)
- Rate limiting intégré : délai configurable entre requêtes HTTP (1-2s par défaut)
- Résilience : `Promise.allSettled` pour l'exécution parallèle des sources, une source en erreur n'affecte pas les autres
- Tableau de bord : serveur HTTP local léger (pas de framework lourd), lecture seule sur la base SQLite

## Scoping du Projet & Stratégie de Développement

### Approche : Livraison Complète (sans phasage MVP)

Le projet est livré en une seule itération complète. Pas de MVP intermédiaire — toutes les sources, le filtrage, le dédoublonnage, Notion, le tableau de bord local et le déploiement sont inclus. L'utilisateur unique (Alexandre) et le périmètre borné rendent cette approche viable.

### Ordre d'Implémentation

1. Types, config, infrastructure (SQLite, logger)
2. Module RSS générique → Indeed, Google Alerts, HelloWork
3. Filtrage par scoring + dédoublonnage
4. Intégration Notion API
5. France Travail API (OAuth2)
6. WTTJ (API interne ou Playwright)
7. Station F (Cheerio)
8. Monitoring pages carrières (hash diff)
9. LinkedIn emails (Gmail API)
10. Mode dry-run + flags CLI (--dry-run, --verbose)
11. Tableau de bord local (serveur HTTP localhost, lecture SQLite)
12. Déploiement GitHub Actions cron

### Stratégie de Mitigation des Risques

**Risques techniques :**
- Sources scraping fragiles (WTTJ, Station F, pages carrières) → sélecteurs CSS configurables dans `config.ts`, logs explicites par source, isolation des erreurs via `Promise.allSettled`
- APIs non documentées (WTTJ) → fallback Playwright si l'API interne change

**Risques d'accès :**
- Blocage IP par les sites (Indeed, WTTJ) → user-agent réaliste, rate limiting 1-2s entre requêtes, dégradation gracieuse (source désactivée si inaccessible, les autres continuent)
- OAuth complexe (Gmail API, France Travail) → tokens refresh dans `.env`, documentation setup dans README

**Risques de qualité des résultats :**
- Faux positifs → mots-clés négatifs agressifs, seuil de score ajustable, itération sur les poids après les premiers runs réels
- Doublons non détectés → normalisation stricte (lowercase, trim, suppression suffixes H/F), fenêtre 30 jours configurable

## Exigences Fonctionnelles

### Collecte de Données

- FR1 : Le système peut collecter des offres d'emploi depuis des flux RSS (Indeed, Google Alerts, HelloWork)
- FR2 : Le système peut collecter des offres via l'API REST France Travail (OAuth2 client_credentials)
- FR3 : Le système peut collecter des offres depuis WTTJ (API interne ou scraping avec rendu JS)
- FR4 : Le système peut collecter des offres depuis Station F (scraping HTML statique)
- FR5 : Le système peut détecter des changements sur les pages carrières d'entreprises configurées (hash diff)
- FR6 : Le système peut extraire des offres depuis les emails d'alertes LinkedIn reçus dans Gmail
- FR7 : Le système peut parser des flux RSS 2.0 et Atom de manière générique
- FR8 : Le système peut respecter un délai configurable entre requêtes HTTP pour éviter les bans

### Filtrage et Scoring

- FR9 : Le système peut scorer chaque offre selon des mots-clés pondérés par catégorie (poste, tech, contrat, contexte)
- FR10 : Le système peut appliquer des mots-clés négatifs pour exclure les offres non pertinentes
- FR11 : Le système peut classifier les offres en 3 niveaux de priorité selon le score (⭐, ⭐⭐, ⭐⭐⭐)
- FR12 : Le système peut ignorer les offres dont le score est inférieur au seuil configurable

### Dédoublonnage

- FR13 : Le système peut normaliser les titres et noms d'entreprise (lowercase, trim, suppression suffixes H/F)
- FR14 : Le système peut identifier les doublons cross-sources via hash titre+entreprise
- FR15 : Le système peut appliquer une fenêtre temporelle configurable de dédoublonnage (défaut : 30 jours)

### Stockage

- FR16 : Le système peut stocker l'historique des offres vues dans une base SQLite locale
- FR17 : Le système peut stocker les hashs de pages carrières pour la détection de changements
- FR18 : Le système peut créer automatiquement la base de données et les tables au premier lancement

### Intégration Notion

- FR19 : Le système peut créer une entrée dans la base Notion pour chaque offre pertinente
- FR20 : Le système peut renseigner toutes les propriétés Notion (entreprise, poste, contrat, localisation, source, lien, score, priorité, statut par défaut, date relance)
- FR21 : Le système peut éviter de créer des doublons dans Notion

### Configuration

- FR22 : L'utilisateur peut configurer les mots-clés, poids et seuils de scoring dans `config.ts`
- FR23 : L'utilisateur peut configurer les URLs RSS et pages carrières à surveiller
- FR24 : L'utilisateur peut configurer les secrets (tokens API) via variables d'environnement `.env`
- FR25 : L'utilisateur peut activer/désactiver des sources individuellement

### Exécution et Modes

- FR26 : Le système peut s'exécuter en mode cron (one-shot, toutes sources, code retour 0/1)
- FR27 : Le système peut s'exécuter en mode dry-run (affichage console sans écriture Notion/SQLite)
- FR28 : Le système peut s'exécuter en mode verbose (logs détaillés)
- FR29 : Le système peut exécuter toutes les sources en parallèle avec isolation des erreurs

### Observabilité

- FR30 : Le système peut logger un résumé par run (offres scannées, filtrées, ajoutées, erreurs par source)
- FR31 : Le système peut logger les erreurs avec contexte suffisant pour diagnostic (source, sélecteur, URL, code HTTP)
- FR32 : Le système peut continuer l'exécution même si une ou plusieurs sources échouent

### Tableau de Bord Local

- FR33 : L'utilisateur peut consulter les statistiques des runs (offres par source, par score, par date) via une interface web locale
- FR34 : L'utilisateur peut visualiser l'historique des offres collectées dans le tableau de bord
- FR35 : Le tableau de bord peut fonctionner en lecture seule sur la base SQLite existante

## Exigences Non-Fonctionnelles

### Performance

- NFR1 : Un run complet (toutes sources) doit s'exécuter en moins de 2 minutes
- NFR2 : Le délai entre requêtes HTTP doit être configurable (défaut : 1-2s) pour respecter le rate limiting sans ralentir excessivement le run
- NFR3 : Les sources sont exécutées en parallèle pour minimiser le temps total
- NFR4 : Le tableau de bord local doit se charger en moins de 3 secondes

### Sécurité

- NFR5 : Aucun secret (token, clé API) ne doit être commité dans le code source
- NFR6 : Les secrets sont stockés exclusivement dans `.env` (local) ou GitHub Secrets (CI)
- NFR7 : Le fichier `.env` est listé dans `.gitignore`
- NFR8 : Le tableau de bord local est accessible uniquement sur localhost (pas d'exposition réseau)

### Intégration

- NFR9 : Chaque intégration externe (Notion, Gmail, France Travail) doit gérer les erreurs réseau et les réponses inattendues sans crasher le process
- NFR10 : Les tokens OAuth (France Travail, Gmail) doivent être rafraîchissables sans redéploiement
- NFR11 : Le rate limiting de l'API Notion (3 req/s) doit être respecté pour éviter les erreurs 429
- NFR12 : La base SQLite doit supporter les accès concurrents lecture (tableau de bord) / écriture (run cron) sans corruption
