---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete', 'step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit']
inputDocuments: ['user-provided-brief-jobfindeer', 'sprint-change-proposal-2026-04-10', 'JobFindeer_Onboarding_Structure_v3']
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  domain: general
  complexity: high
  projectContext: greenfield
lastEdited: '2026-04-10'
editHistory:
  - date: '2026-04-10'
    changes: 'Intégration onboarding v3 & scoring par branche — 2 parcours réécrits, FR11/FR13/FR29/FR31 modifiées, FR42-48 ajoutées'
---

# Product Requirements Document - JobFindeer

**Author:** Alexandre
**Date:** 2026-04-09

## Résumé Exécutif

JobFindeer est un assistant mobile-first de recherche d'emploi qui agrège quotidiennement les offres des principaux job boards français, les score par pertinence pour chaque profil candidat, et les présente sous forme d'un feed personnalisé. Le produit s'arrête au tri : la candidature se fait toujours sur la source d'origine.

Le problème résolu : la recherche d'emploi en France impose de surveiller 5 à 10 plateformes, de filtrer manuellement des centaines d'offres non pertinentes, et de repérer les doublons cross-sources. Ce bruit consume le temps et l'énergie qui devraient aller à la candidature elle-même.

L'utilisateur cible est un chercheur d'emploi français, mobile-first, qui veut investir son temps à postuler, pas à chercher. JobFindeer traduit son profil (CV + préférences) en un feed quotidien d'offres scorées. L'intelligence est côté demande : la qualité du produit dépend de sa capacité à comprendre ce que l'utilisateur cherche et à le refléter dans le scoring.

Le concept est validé par un prototype fonctionnel (Job_watcher, CLI personnel) et confirmé par des retours d'entourage sur l'universalité du problème de bruit. Le modèle freemium (9,90 € / 19,90 €/mois) est contraint par un plafond de coût opérationnel dur de 5 €/client/mois.

**Promesse :** Moins de temps à chercher, plus de temps à postuler.

### Ce qui rend ce projet spécial

Le différenciateur n'est pas la quantité d'offres ou la couverture des sources — c'est la qualité de la traduction entre le profil candidat et les offres remontées. L'onboarding (extraction CV par LLM + ciblage métier/secteur/géo + préférences salaire/contrat/télétravail) est le moment critique qui conditionne toute la valeur en aval. Un feed parfaitement scoré est invisible : l'utilisateur voit simplement "des offres qui lui correspondent". Un feed mal scoré rend le produit inutile.

Le périmètre volontairement restreint (pas d'auto-apply, pas de tracking lourd, pas de messagerie) est à la fois la force produit et la défense juridique. En ne stockant que les métadonnées et en redirigeant systématiquement vers la source, JobFindeer se positionne comme assistant de tri, pas comme job board concurrent.

## Classification du Projet

- **Type :** Web App (PWA mobile-first Phase 1, app native React Native Phase 2)
- **Domaine :** General (recherche d'emploi, avec contraintes juridiques structurantes sur le scraping et la RGPD)
- **Complexité :** Élevée — pipeline de scraping industriel multi-sources, scoring hybride (règles pondérées → LLM sémantique), contrainte de coût dure (< 5 €/client/mois), maintenance scraping comme risque opérationnel permanent
- **Contexte :** Greenfield (nouveau produit SaaS, héritier conceptuel du prototype CLI Job_watcher)

## Critères de Succès

### Succès Utilisateur

- L'utilisateur ouvre JobFindeer **plusieurs fois par semaine** (3+/semaine = utilisateur engagé)
- Sur mobile : taux élevé de **swipes positifs** — signe que le scoring remonte des offres pertinentes
- Sur web : taux élevé d'**archivage des offres** pour candidature ultérieure — signe que le handoff mobile → desktop fonctionne
- L'utilisateur ne ressent plus le besoin de visiter les job boards directement

### Succès Business

- **Conversion essai → payant : 15%** comme cible initiale
- **Coût opérationnel par client payant : < 5 €/mois** (contrainte dure, non négociable)
- **Cible MAU : 100 000** (horizon de dimensionnement, pas objectif immédiat)
- Rétention : les utilisateurs payants restent abonnés au-delà du premier mois (churn à définir post-lancement)

### Succès Technique

- Pipeline de scraping opérationnel sur toutes les sources Phase 1
- Feed quotidien généré et disponible chaque matin pour chaque utilisateur actif
- Observabilité scraping : alerte automatique quand un scraper casse

### Résultats Mesurables

- KPIs de qualité du scoring : **à définir post-MVP** (ratio swipes positifs/négatifs, taux de clic vers source, taux d'archivage)
- Économie unitaire validée en production : coût réel par client mesuré et comparé au plafond de 5 €
- Nombre de sources opérationnelles simultanées

## Parcours Utilisateur

### 1. Léa — Le scroll utile (parcours principal candidat)

**Persona :** Léa, 26 ans, développeuse frontend React en CDI à Lyon, en recherche passive-active. Elle passe 45 min par jour sur son téléphone dans les transports et pendant les pauses. Avant JobFindeer, elle alternait entre Indeed, WTTJ et LinkedIn — 3 apps, beaucoup de bruit, des doublons, et l'impression de rater des offres.

**Scène d'ouverture :** 8h15, métro ligne B. Léa sort son téléphone. Au lieu d'ouvrir Instagram, elle ouvre JobFindeer. Notification : "12 nouvelles offres, 3 à fort match".

**Rising Action :** Elle scrolle son feed. Chaque carte montre le titre, l'entreprise, le salaire, la localisation, et un score de compatibilité avec justification courte ("87% — React + Lyon + 38-42k"). Elle swipe à droite les offres qui l'intéressent, à gauche celles qui ne collent pas. En 4 minutes, elle a trié ses 12 offres. 5 gardées, 7 écartées.

**Climax :** Parmi les 5, une offre Lead Frontend chez une startup healthtech lyonnaise qu'elle ne connaissait pas — détectée via WTTJ, scorée à 92%. Exactement ce qu'elle cherchait sans savoir que ça existait.

**Résolution :** Le soir, 20h30, Léa ouvre son laptop. Elle va sur la version web de JobFindeer, retrouve ses 5 offres archivées. Pour chacune, elle clique "Voir sur la source", atterrit sur le site d'origine, et postule. 5 minutes de scroll utile le matin → 3 candidatures le soir.

### 2. Léa — L'onboarding (premier contact)

**Scène d'ouverture :** Léa découvre JobFindeer via un post LinkedIn. Elle clique, atterrit sur la landing page mobile. "Moins de temps à chercher, plus de temps à postuler." Elle tape "Essai gratuit 7 jours".

**Rising Action :** Création de compte (email + mot de passe ou OAuth Google). Écran suivant : "Upload ton CV pour qu'on comprenne ton profil." Elle uploade son PDF. En quelques secondes, le LLM extrait ses compétences, son expérience, sa localisation, son employeur actuel. L'app lui présente un résumé structuré : "React, TypeScript, 3 ans d'XP, Lyon". Elle valide et ajuste.

Écran suivant — champ texte libre conversationnel : "Raconte-moi ce qui t'amène ici : ce que tu fais, ce que tu cherches, ce que tu veux éviter." Léa tape : "Je suis dev front React en CDI à Lyon, j'aime mon métier mais je veux plus de télétravail et un meilleur salaire, idéalement dans la healthtech." En quelques secondes, le LLM analyse son texte, le croise avec le CV, et la classe en branche 1 (même poste, en mieux) avec un score de confiance de 0.91.

**Climax :** L'app affiche une reformulation : "Si je comprends bien : tu cherches un poste similaire en développement frontend React, avec plus de télétravail, un meilleur salaire, et une préférence pour la healthtech. C'est ça ?" Léa tape "Oui exactement". C'est le moment waouh — l'IA a lu et compris en moins de 60 secondes.

L'app enchaîne avec 3 questions de calibrage ciblées pour sa branche (axes d'amélioration prioritaires, salaire minimum acceptable, niveau de télétravail souhaité) puis le socle commun (localisation : Lyon + 30km, contrat : CDI, rythme : temps plein). 6 questions au total, validées en 2 minutes.

**Résolution :** "Ton premier feed sera prêt demain matin." Le lendemain, notification email. Elle ouvre : 15 offres scorées, classées par compatibilité. Le moment "aha" — c'est exactement ce qu'elle cherche, sans effort.

### 3. Léa — Le scoring déçoit (edge case)

**Scène d'ouverture :** Après 2 semaines, Léa constate que son feed remonte des postes juniors à 28k et des offres 100% présentiel. Le scoring ne filtre pas assez bien ses critères de calibrage.

**Rising Action :** Elle commence à swiper à gauche systématiquement. La lassitude s'installe.

**Climax :** JobFindeer détecte le pattern (trop de swipes négatifs consécutifs) et lui propose : "Tes résultats ne te conviennent pas ? Ajuste tes préférences." Elle remonte son salaire minimum à 35k et passe son niveau de télétravail souhaité de "hybride" à "hybride majoritaire (3-4 jours)".

**Résolution :** Le feed du lendemain est nettement plus pertinent — les filtres durs excluent les offres sous 35k et les critères mous rehaussent le score des offres avec davantage de télétravail. Note : au MVP, l'ajustement est manuel via les critères de calibrage existants. Le volume de swipes (~100/mois) est trop faible pour un apprentissage automatique — piste V2+ si le volume le permet.

### 4. Alexandre — Le dashboard ops (admin/monitoring)

**Persona :** Alexandre, fondateur et opérateur unique au MVP. Il gère le pipeline de scraping et intervient quand un scraper casse.

**Scène d'ouverture :** 9h, Alexandre ouvre le dashboard de monitoring. Vue d'ensemble : 4 sources actives, taux de succès par source sur les dernières 24h.

**Rising Action :** France Travail API : 100% ✅, 342 offres. WTTJ : 87% ⚠️, 12 erreurs timeout. HelloWork : 100% ✅, 156 offres. Source 4 : 0% ❌ — le sélecteur CSS ne matche plus rien depuis 6h.

**Climax :** Il clique sur la source en erreur. Log : "Selector `.job-card-v2` not found — page structure may have changed". Il inspecte le site, met à jour le sélecteur, relance un run de test depuis le dashboard.

**Résolution :** La source repasse au vert. Le dashboard montre les métriques globales : offres collectées/jour, taux de dédup, utilisateurs servis.

### Synthèse des Capacités Révélées

| Parcours | Capacités requises |
|---|---|
| Scroll quotidien (Léa) | Feed scoré mobile, swipe tri, métadonnées + score + justification, notifications push |
| Onboarding (Léa) | Upload CV, extraction LLM, texte libre conversationnel, analyse LLM d'intention, reformulation validée, routage branche, calibrage conditionnel par branche, socle commun multi-mode (localisation, contrat, rythme), OAuth/email auth, essai 7 jours |
| Scoring déçoit (Léa) | Paramètres de calibrage ajustables (salaire, télétravail, localisation), détection d'insatisfaction |
| Archivage web (Léa) | Liste offres sauvegardées sur web, redirection vers source, état partagé mobile↔web |
| Dashboard ops (Alexandre) | Monitoring par source, taux succès, alertes, logs erreurs, run de test manuel, métriques globales |

## Exigences Spécifiques au Domaine

### Conformité & Cadre Juridique

- **RGPD :** registre des traitements, export de données utilisateur, droit à l'oubli implémenté dès le MVP — pas optionnel
- **Scraping — règles non négociables :**
  - Stocker les métadonnées (titre, entreprise, lieu, salaire, type contrat, URL source, date publication, hash contenu). La description brute peut être conservée temporairement pour le scoring lexical, purgée sous 30 jours, jamais affichée à l'utilisateur
  - Toujours rediriger vers la source pour la candidature. Pas de bouton "postuler" interne
  - Ne jamais contourner de protection technique (CAPTCHA, IP bans, fingerprinting). Si une source bloque, on s'arrête
  - Respecter robots.txt comme signal d'opposition
  - Logger le trafic renvoyé aux sources (preuve de loyauté)
  - Canal de réception et traitement immédiat des demandes de cessation
  - Purger les offres expirées rapidement (rétention courte)

### Contraintes Techniques Juridiques

- **Logs de redirection :** conservation des preuves de trafic renvoyé aux sources, à des fins de défense juridique
- **CGU & politique de confidentialité :** positionnement clair "assistant de tri, pas job board, pas d'auto-apply"
- **Process de cessation :** adresse de contact documentée, SLA de réponse, procédure de retrait de source

### Stratégie par Source (risque juridique)

| Source | Risque | Stratégie |
|---|---|---|
| France Travail (API officielle) | Nul | Source prioritaire |
| WTTJ | Faible | Scraping métadonnées + redirection systématique |
| HelloWork | À évaluer | Stratégie similaire WTTJ |
| Indeed | Élevé | Pas de scraping — partenariat ou Mantiks.io |
| LinkedIn | Très élevé | Agrégateur tiers ou partenariat uniquement |

### Risques et Mitigations Juridiques

- **Changement unilatéral des conditions d'un job board** → multi-sources, pas de dépendance critique à une seule source, process de cessation rapide
- **RGPD (stockage CV, profil)** → chiffrement, export/suppression automatisés, minimisation des données conservées
- **Requalification en job board** → contrainte d'architecture (le code ne permet pas l'affichage complet ni l'auto-apply), pas seulement une décision produit

## Exigences Spécifiques Web App

### Deux Surfaces Distinctes

JobFindeer est composé de deux surfaces avec des approches design séparées :

1. **App mobile (swipe & tri)** — PWA mobile-only, conçue pour être portée en app native React Native en Phase 2. Design mobile-only (375px iPhone SE comme référence), pas de version desktop.
2. **Web desktop (récap & candidature)** — Landing page marketing (SEO), offres sauvegardées, paramètres, facturation. Design desktop-first (1024px+).

### Surface Mobile

- Design mobile-only — composants et patterns transposables en React Native (pas de dépendance DOM, pas d'animations CSS complexes, pas de hover states)
- PWA : manifest.json, icône écran d'accueil, mode standalone
- Cibles : Safari iOS, Chrome Android

### Surface Desktop

- Landing page marketing avec SEO (meta tags, Open Graph, sitemap, structured data)
- Liste offres sauvegardées + redirection source, paramètres profil, gestion abonnement
- Cibles : Chrome, Firefox, Edge, Safari desktop

### Synchronisation

- Pas de synchronisation temps réel — un refresh suffit
- État partagé côté serveur : swipes mobile visibles sur desktop après refresh
- Feed recalculé en batch (pipeline nocturne)

### Mode Offline

- **MVP (PWA) :** connexion requise
- **Phase 2 (app native) :** cache local du feed, swipes offline synchronisés au retour réseau

### Considérations d'Implémentation

- `output: 'standalone'` dans next.config.js (déploiement VPS)
- Deux layouts Next.js distincts : `/app/(mobile)` et `/app/(desktop)`
- TanStack Query pour le cache HTTP côté client
- Node.js classique derrière Caddy (pas d'Edge Functions)

## Scoping & Stratégie de Développement

### Stratégie MVP

**Approche :** MVP complet (Phase 1 entière) — pas de sous-découpage. Chaque brique est nécessaire pour délivrer la promesse. Retirer l'onboarding LLM, le scoring, ou le swipe casse la proposition de valeur.

**Développeur unique :** Alexandre. Chaque choix technique doit minimiser la surface de maintenance, pas maximiser les features.

### Phase 1 — MVP

**Parcours supportés :** onboarding candidat, scroll quotidien mobile, archivage desktop, dashboard ops.

**Capacités :**
- Auth (email + OAuth Google) + essai 7 jours + Stripe
- Pipeline scraping : France Travail API + WTTJ + 1-2 sources complémentaires
- Normalisation, dédup cross-sources, scoring V1 règles pondérées
- Feed quotidien pré-calculé par profil
- Interface swipe mobile (PWA) + liste desktop offres sauvegardées
- Notifications push quotidiennes
- Dashboard monitoring scraping
- RGPD : export données, suppression compte
- **Infra :** VPS Hetzner, Postgres, Docker Compose, Next.js PWA

### Phase 2 — Growth

- App native React Native (Expo) — push fiables iOS, offline
- Scoring V2 LLM sémantique (Gemini Flash-Lite, Extract & Match)
- Sources niches sectorielles
- Partenariats sources (Indeed, WTTJ)
- Email récap quotidien

### Phase 3 — Expansion

- Multi-pays européen (directive transparence salariale mi-2026)
- Multi-langue
- Context caching LLM inter-candidats

### Stratégie de Mitigation des Risques

**Risque #1 — Maintenance scraping (temps de monitoring)**
Le risque dominant. En développeur unique, chaque heure passée à réparer un scraper est une heure non investie sur le produit.
- Investir massivement dans l'observabilité dès le MVP — dashboard, alertes automatiques, logs structurés
- Privilégier les sources stables (France Travail API = zéro maintenance) et les données structurées (LD+JSON)
- Limiter à 3-4 sources au MVP. Mieux vaut 3 sources fiables que 6 fragiles
- Scrapers avec sélecteurs configurables et tests de santé automatiques

**Risque #2 — Complexité technique pour un dev solo**
Le MVP combine : LLM, Playwright stealth, Stripe, auth, PWA, pipeline async, Postgres, Docker, VPS ops.
- Briques éprouvées : Auth.js, Stripe Checkout, BullMQ
- Docker Compose sur un seul VPS — pas de microservices, pas de Kubernetes

**Risque #3 — Conversion freemium**
Cible 15% essai → payant. Si < 5%, pivoter le pricing ou le positionnement avant Phase 2.

## Exigences Fonctionnelles

### Gestion de Compte & Authentification

- FR1 : Le candidat peut créer un compte via email/mot de passe ou OAuth Google
- FR2 : Le candidat peut se connecter et se déconnecter depuis mobile et desktop
- FR3 : Le candidat peut démarrer un essai gratuit de 7 jours sans carte bancaire
- FR4 : Le candidat peut souscrire à un abonnement mensuel (9,90 € ou 19,90 €)
- FR5 : Le candidat peut gérer son abonnement (upgrade, downgrade, annulation)
- FR6 : Le candidat peut exporter l'intégralité de ses données personnelles (RGPD)
- FR7 : Le candidat peut supprimer son compte et toutes ses données (droit à l'oubli)

### Onboarding & Profil

- FR8 : Le candidat peut uploader son CV (PDF) lors de l'onboarding
- FR9 : Le système peut extraire les compétences, expérience et localisation du CV via LLM
- FR10 : Le candidat peut valider et ajuster le profil extrait par le LLM
- FR11 : Le candidat peut définir ses préférences via un socle commun : localisation multi-mode (villes avec rayon, « Partout en France », ou « Télétravail uniquement »), type de contrat, et rythme de travail — complété par des questions de calibrage spécifiques à sa branche d'intention
- FR12 : Le candidat peut modifier ses préférences et son profil à tout moment
- FR13 : Le système exclut automatiquement l'employeur actuel du candidat (identifié via le CV) lorsque celui-ci sélectionne « Une entreprise différente de la mienne » dans ses axes d'amélioration (branche 1). Pas de champ d'exclusion libre au MVP
- FR42 : Le candidat peut saisir un texte libre conversationnel (100-500 caractères) décrivant sa situation et ce qu'il recherche
- FR43 : Le système analyse le texte libre via LLM pour classifier le candidat dans l'une des 5 branches d'intention avec un score de confiance
- FR44 : Le système affiche une reformulation de l'intention détectée que le candidat peut valider, corriger ou rejeter. Si score de confiance < 0.7, choix manuel de branche
- FR45 : Le système adapte les questions de calibrage en fonction de la branche retenue (1 à 3 questions spécifiques + socle commun S1-S3)
- FR46 : Le système stocke les signaux d'interaction utilisateur dès le MVP : impressions, clics détail, sauvegardes, ignorées, redirections candidature

### Feed & Découverte d'Offres

- FR14 : Le candidat peut consulter un feed quotidien d'offres scorées par compatibilité avec son profil
- FR15 : Le système affiche pour chaque offre : titre, entreprise, salaire, localisation, type de contrat, score de compatibilité, justification courte du score
- FR16 : Le candidat peut trier les offres par swipe sur mobile (garder, écarter, mettre de côté)
- FR17 : Le candidat peut consulter ses offres sauvegardées sur la version web desktop
- FR18 : Le candidat peut accéder à l'offre originale sur le site source via redirection one-tap
- FR19 : Le candidat peut marquer une offre comme "candidaté"
- FR20 : Le système logge chaque redirection vers une source (preuve de trafic renvoyé)

### Notifications & Communication

- FR21 : Le candidat peut recevoir une notification email quotidienne indiquant le nombre de nouvelles offres à fort match (MVP : email via Resend ; push Web prévu Phase 2)
- FR22 : Le candidat peut activer ou désactiver les notifications

### Pipeline de Collecte

- FR23 : Le système peut collecter des offres via l'API officielle France Travail
- FR24 : Le système peut collecter des métadonnées d'offres depuis WTTJ par scraping
- FR25 : Le système peut collecter des offres depuis 1-2 sources complémentaires (HelloWork ou autre)
- FR26 : Le système peut normaliser les offres collectées (titre, entreprise, localisation, salaire, contrat)
- FR27 : Le système peut dédupliquer les offres cross-sources via hash normalisé
- FR28 : Le système peut purger les offres expirées automatiquement (rétention courte)
- FR29 : Le système stocke les métadonnées des offres et conserve temporairement la description brute pour le scoring lexical (purgée automatiquement après 30 jours). La description n'est jamais affichée à l'utilisateur
- FR30 : Le système respecte robots.txt et s'arrête si une source bloque techniquement

### Scoring & Matching

- FR31 : Le système score chaque offre via deux catégories de critères : des filtres durs (localisation + distance, type de contrat, salaire minimum déclaré, télétravail strict) pesant collectivement 60-70% du score, et des critères mous à pondération variable selon la branche d'intention du candidat pesant 30-40%
- FR32 : Le système génère un feed pré-calculé par profil via pipeline batch nocturne
- FR33 : Le système fournit une justification courte du score pour chaque offre

### Scoring Lexical & Filtres Spécialisés

- FR47 : Le système applique une approche lexicale déterministe (mots-clés dans le titre, sac de mots-clés descriptif, comparaison de séniorité) pour les critères flous, avec une pondération plafonnée à 5-8% du score global et sans filtre dur
- FR48 : Le système applique automatiquement un filtre required_experience_years = 0 pour les candidats en branche reconversion (branche 4), excluant les offres qui exigent de l'expérience sur le métier cible

### Dashboard Ops (Admin)

- FR34 : L'administrateur peut consulter le taux de succès de chaque source de scraping
- FR35 : L'administrateur reçoit une alerte automatique quand un scraper casse
- FR36 : L'administrateur peut consulter les logs d'erreur par source avec contexte (sélecteur, URL, code HTTP)
- FR37 : L'administrateur peut relancer un run de test sur une source depuis le dashboard
- FR38 : L'administrateur peut consulter les métriques globales (offres collectées/jour, taux de dédup, utilisateurs servis)

### Conformité & Juridique

- FR39 : Le système peut traiter une demande de cessation de scraping d'une source dans un délai de 48h ouvrées
- FR40 : Le système peut désactiver une source de collecte sans impact sur les autres sources
- FR41 : Le système conserve les logs de redirection comme preuve de loyauté

## Exigences Non-Fonctionnelles

### Performance

- NFR1 : Le feed mobile se charge en < 2s sur connexion 4G
- NFR2 : First Contentful Paint < 1.5s
- NFR3 : Time to Interactive < 3s
- NFR4 : Bundle JS initial < 200 KB gzippé
- NFR5 : Le pipeline batch nocturne se termine avant 7h
- NFR6 : Le swipe d'une offre répond en < 300ms

### Sécurité

- NFR7 : Données chiffrées en transit (HTTPS/TLS)
- NFR8 : Données sensibles (CV, profil) chiffrées au repos en base de données
- NFR9 : Mots de passe hashés avec un algorithme standard résistant aux attaques par force brute
- NFR10 : Tokens de session expirent après 30 minutes d'inactivité
- NFR11 : Paiements délégués à Stripe — aucune donnée bancaire stockée par JobFindeer
- NFR12 : Secrets (clés API, tokens) jamais exposés côté client ni commités

### Scalabilité

- NFR13 : Architecture supporte une montée à 100 000 MAU sans réécriture fondamentale
- NFR14 : VPS initial suffit pour 100-500 utilisateurs ; scale-up par migration VPS, pas par changement d'architecture
- NFR15 : Pipeline scraping découplé du trafic utilisateur
- NFR16 : Coût opérationnel < 5 €/client/mois payant à toute échelle

### Fiabilité

- NFR17 : Disponibilité > 99% hors maintenance planifiée, mesurée par uptime monitoring mensuel
- NFR18 : Si une source échoue, les autres continuent (isolation des erreurs)
- NFR19 : Backup quotidien de la base de données utilisateur
- NFR20 : Panne du pipeline n'empêche pas la consultation du feed existant

### Accessibilité

- NFR21 : Conformité WCAG 2.1 AA sur les deux surfaces
- NFR22 : Zones de tap minimum 44x44px sur mobile
- NFR23 : Contraste texte/fond ratio 4.5:1 minimum sur les cartes d'offres
- NFR24 : Navigation clavier complète sur desktop

### Intégration

- NFR25 : API France Travail via OAuth2 client_credentials avec refresh automatique
- NFR26 : Stripe webhooks pour synchronisation des états d'abonnement (essai → payant → annulé → expiré)
- NFR27 : LLM via couche d'abstraction permettant de changer de provider sans impact applicatif
- NFR28 : Chaque intégration externe gère les erreurs réseau sans crasher le service

### Observabilité

- NFR29 : Logs structurés par run du pipeline (offres collectées, filtrées, dédupliquées, scorées, par source)
- NFR30 : Alerte automatique si taux de succès d'une source < 50%
- NFR31 : Error tracking centralisé frontend et backend
- NFR32 : Métriques business : utilisateurs actifs, taux de swipe positif, taux de redirection
