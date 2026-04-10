# Sprint Change Proposal — Intégration Onboarding v3 & Scoring par branche

**Date :** 2026-04-10
**Auteur :** Alexandre (avec facilitation Scrum Master)
**Scope :** Modéré — Ajustement direct des epics existants
**Document source :** `JobFindeer_Onboarding_Structure_v3.md`

---

## 1. Résumé du Problème

Le document de conception produit « Onboarding candidat & calibrage de l'intention v3 » redéfinit en profondeur l'onboarding et le scoring de JobFindeer par rapport aux artefacts actuels (PRD, architecture, epics). Ce document est le résultat d'un travail itératif d'arbitrage UX/scoring (v1 → v2 → v3) qui approfondit la vision du produit sans la pivoter.

### Déclencheur

Document de conception produit issu d'un travail de cadrage hors cycle sprint. Pas de story déclencheuse — le changement vient d'un approfondissement de la réflexion produit.

### Écarts majeurs identifiés

| Domaine | PRD/Archi actuel | v3 |
|---|---|---|
| **Flow onboarding** | Upload CV → extraction → écran préférences (linéaire) | Texte libre → analyse LLM → 5 branches → questions conditionnelles |
| **Scoring** | "Règles pondérées (mots-clés, salaire, localisation, contrat, expérience)" | Filtres durs 60-70% + critères mous 30-40%, pondérations par branche, approche lexicale plafonnée 5-8% |
| **Préférences** | Formulaire unique (contrat, salaire, télétravail, secteurs, géo) | Socle commun S1-S3 + calibrage conditionnel par branche |
| **Localisation** | Non détaillée | Multi-villes + "Partout en France" + "Télétravail uniquement" + rayon par ville |
| **Mots-clés négatifs** | Champ libre (FR13) | Exclusion automatique employeur actuel uniquement au MVP |
| **Signaux interaction** | Non mentionnés | Stocker impressions, clics, sauvegardes dès le MVP |
| **Enrichissement offres** | Métadonnées basiques | + required_experience_years, taille entreprise (SIRENE), géocodage, remote_type structuré, description_raw (purgée 30j) |

---

## 2. Analyse d'Impact

### Impact sur les Epics

| Epic | Impact | Détail |
|---|---|---|
| Epic 0 (Fondation) | Aucun | Infra inchangée |
| Epic 1 (Auth) | Aucun | Auth inchangée |
| Epic 2 (Pipeline) | Enrichissement | Champs enrichis au scraping (géocodage, remote_type, experience_years, description_raw, SIRENE optionnel), geocoding batch via API BAN |
| **Epic 3 (Onboarding)** | **Refonte majeure** | 3 stories → 5 stories. Flow complètement restructuré |
| Epic 4 (Scoring/Feed) | Enrichissement significatif | Story 4.1 scoring engine reécrite (filtres durs/mous, branches, pondérations) |
| Epic 5 (Desktop) | Mineur | Mots-clés négatifs supprimés dans /settings |
| Epic 6 (Stripe/RGPD) | Aucun | Pricing reporté à plus tard |
| Epic 7 (Dashboard/Notifs) | Aucun | — |

### Impact sur les artefacts

| Artefact | Sévérité | Actions |
|---|---|---|
| PRD | Élevée | 2 parcours réécrits, 2 FRs modifiées (FR11, FR13), FR31 scindé, 7 nouvelles FRs (FR42-48), FR29 révisé |
| Architecture | Élevée | Schémas DB enrichis (profil, offres, interactions), pipeline scoring séparé, appels LLM onboarding, structure fichiers |
| Epics & Stories | Élevée | Epic 3 refonte (3→5 stories), Epic 4.1 réécrit, Epic 2.1-2.5 enrichis, descriptions et FR coverage map |
| Specs implémentation | À revalider | 3 specs existantes (onboarding-multi-step, preferences-form-ux, cv-extraction-schema) à vérifier contre les changements |
| Schemas Zod | Modérée | 2 schemas enrichis, 2 nouveaux fichiers |

### Pas d'impact sur

- L'ordre des epics (0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 reste cohérent)
- Les choix d'infrastructure (Drizzle, tRPC, BullMQ, Vercel AI SDK, Docker, VPS)
- Le scope MVP global (le v3 enrichit mais supprime aussi : pas de mots-clés négatifs libres, pas de secteurs préférés, un seul mode actif)

---

## 3. Approche Recommandée : Ajustement Direct

### Justification

1. **Timing idéal** — Sprint au tout début (Epic 0, story 0-1 en review). Aucun code n'a été écrit dans les domaines impactés (onboarding, scoring, scraping enrichi). Coût du changement minimal.

2. **Structure epic préservée** — Les 7 epics restent pertinents. Pas de replan fondamental nécessaire. Les domaines fonctionnels (onboarding, scoring, pipeline) sont déjà dans les bons epics.

3. **Le v3 est auto-suffisant** — Document mature avec journal des décisions, principes directeurs, éléments abandonnés avec justification. Traductible directement en stories.

4. **Risque technique bas** — Pas de changement d'architecture fondamental. Le changement porte sur les schémas de données et la logique métier, pas sur l'infrastructure.

5. **Compensation** — Le v3 ajoute de la complexité (branches, calibrage) mais en supprime aussi (mots-clés négatifs, secteurs préférés, horizon temporel, double mode actif/veille).

### Alternatives évaluées

| Option | Verdict | Raison |
|---|---|---|
| Ajustement direct | **Retenu** | Viable, timing idéal, risque bas |
| Rollback | Non pertinent | Rien à rollback |
| Revue MVP | Non nécessaire | Le scope tient avec le v3 |

---

## 4. Propositions de Changement Détaillées

### 4.1 PRD — Modifications

#### Parcours utilisateur Onboarding (Léa, §2)

**OLD :** Flow linéaire upload CV → extraction → écran préférences plat.

**NEW :** Flow en 3 étapes : upload CV → texte libre conversationnel → analyse LLM avec reformulation validée ("Si je comprends bien...") → routage branche → 3-6 questions de calibrage ciblées (branche + socle commun). Le "moment waouh" de la reformulation LLM devient le climax du parcours.

#### Parcours Scoring déçoit (Léa, §3)

**OLD :** Ajout de "PHP" en mot-clé négatif.

**NEW :** Ajustement du salaire minimum et du niveau de télétravail souhaité via les critères de calibrage existants.

#### Tableau des capacités révélées

Ligne Onboarding enrichie avec : texte libre conversationnel, analyse LLM, routage branche, calibrage conditionnel, socle commun multi-mode.
Ligne Scoring déçoit : suppression mention mots-clés négatifs.

#### FR11 (Préférences) — Réécrite

**OLD :** définir ses préférences : type de contrat, fourchette salariale, télétravail, secteurs préférés, périmètre géographique

**NEW :** définir ses préférences via un socle commun : localisation multi-mode (villes avec rayon, « Partout en France », ou « Télétravail uniquement »), type de contrat, et rythme de travail — complété par des questions de calibrage spécifiques à sa branche d'intention

#### FR13 (Mots-clés négatifs) — Réécrite

**OLD :** Le candidat peut ajouter des mots-clés négatifs pour exclure certaines offres

**NEW :** Le système exclut automatiquement l'employeur actuel du candidat (identifié via le CV) lorsque celui-ci sélectionne « Une entreprise différente de la mienne » dans ses axes d'amélioration (branche 1). Pas de champ d'exclusion libre au MVP.

#### FR29 (Stockage métadonnées) — Révisée

**OLD :** Le système stocke uniquement les métadonnées des offres, jamais la description complète

**NEW :** Le système stocke les métadonnées des offres et conserve temporairement la description brute pour le scoring lexical (purgée automatiquement après 30 jours). La description n'est jamais affichée à l'utilisateur.

#### FR31 (Scoring) — Scindée en 3

**NEW FR31 :** Le système score chaque offre via deux catégories de critères : des filtres durs (localisation + distance, type de contrat, salaire minimum déclaré, télétravail strict) pesant collectivement 60-70% du score, et des critères mous à pondération variable selon la branche d'intention du candidat pesant 30-40%.

**NEW FR47 :** Le système applique une approche lexicale déterministe (mots-clés dans le titre, sac de mots-clés descriptif, comparaison de séniorité) pour les critères flous, avec une pondération plafonnée à 5-8% du score global et sans filtre dur.

**NEW FR48 :** Le système applique automatiquement un filtre required_experience_years = 0 pour les candidats en branche reconversion (branche 4), excluant les offres qui exigent de l'expérience sur le métier cible.

#### Nouvelles FRs (FR42-46)

- **FR42 :** Le candidat peut saisir un texte libre conversationnel (100-500 caractères) décrivant sa situation et ce qu'il recherche
- **FR43 :** Le système analyse le texte libre via LLM pour classifier le candidat dans l'une des 5 branches d'intention avec un score de confiance
- **FR44 :** Le système affiche une reformulation de l'intention détectée que le candidat peut valider, corriger ou rejeter. Si score de confiance < 0.7, choix manuel de branche
- **FR45 :** Le système adapte les questions de calibrage en fonction de la branche retenue (1 à 3 questions spécifiques + socle commun S1-S3)
- **FR46 :** Le système stocke les signaux d'interaction utilisateur dès le MVP : impressions, clics détail, sauvegardes, ignorées, redirections candidature

### 4.2 Architecture — Modifications

#### Schéma user_profiles / user_preferences enrichi

- `user_profiles` : ajout `branch` (enum 1-5), `free_text_raw`, `calibration_answers` (JSONB)
- `user_preferences` : ajout `location_mode` (enum cities|france|remote_only), `cities` (JSONB array avec radius_km par ville), `default_radius_km`, `remote_friendly` (boolean transverse)
- Structure extensible pour mode europe Phase 3

#### Schéma raw_offers enrichi

Ajout : `location_lat`, `location_lng`, `remote_type` (enum on_site|hybrid|full_remote), `required_experience_years` (integer nullable), `company_size` (enum nullable, SIRENE optionnel), `description_raw` (purgée après 30 jours)

#### Nouvelle table user_interactions

user_id, offer_id, event_type (enum impression|click|save|dismiss|apply), created_at. Pas d'exploitation algorithmique V1, stockage uniquement.

#### Pipeline scoring séparé et différencié

Séparation en deux pipelines :
1. Collecte : sources → validation Zod → dédup → DB
2. Scoring : pour chaque utilisateur actif → filtres durs → critères mous par branche → tri → insertion user_feeds

#### Appels LLM onboarding

2-3 appels par onboarding via Vercel AI SDK : extraction CV (existant), analyse texte libre (nouveau), suggestions métiers pivots branche 3 (nouveau). Modèle par appel à déterminer après benchmark.

#### Structure fichiers onboarding

Composants : CvUploader, FreeTextInput, IntentValidation, BranchCalibration, CommonQuestions, LocationPicker. Settings : PreferencesEditor + LocationEditor (rayon par ville).

#### Schemas Zod enrichis

- `preferences.ts` : suppression keywordsSchema, ajout locationSchema + calibrationSchema
- `onboarding.ts` (nouveau) : freeTextSchema, intentAnalysisOutputSchema, branchEnum, calibrationByBranchSchemas
- `offer.ts` : rawJobOfferSchema enrichi
- `interactions.ts` (nouveau) : eventTypeEnum, userInteractionSchema

### 4.3 Epics & Stories — Modifications

#### Epic 3 — Refonte complète (3 → 5 stories)

| Story | Titre | Contenu |
|---|---|---|
| 3.1 | Schéma profil enrichi, localisation multi-mode & table interactions | Fondations DB : branches, location_mode, calibration_answers, user_interactions, schemas Zod |
| 3.2 | Upload CV & extraction LLM | Upload PDF, extraction via Vercel AI SDK (compétences, expérience, localisation, employeur actuel, statut étudiant) |
| 3.3 | Texte libre conversationnel & analyse d'intention LLM | Champ texte libre, analyse LLM (branche + confiance + signaux), reformulation validée, fallback si confiance < 0.7 |
| 3.4 | Socle commun & calibrage par branche | Questions conditionnelles par branche (1.1-1.3, 2.1, 3.1-3.2, 4.1-4.2, 5.0-5.1) + socle S1-S3, fallback gracieux branche 4 |
| 3.5 | Modification des préférences post-onboarding | Edition socle commun + calibrage sur /settings desktop, override rayon par ville |

#### Epic 4, Story 4.1 — Scoring engine réécrit

Filtres durs en premier (localisation+distance, contrat, salaire min, télétravail strict, experience_years branche 4) pesant 60-70%. Puis critères mous conditionnels par branche (30-40%) avec scoring lexical plafonné 5-8% pour critères flous. Exclusion employeur actuel branche 1. Poids configurables. Justification intégrant la branche.

#### Epic 2, Stories 2.1-2.5 — Champs enrichis

- Story 2.1 : schéma raw_offers enrichi (géocodage, remote_type, experience_years, company_size, description_raw)
- Stories 2.2-2.4 : extraction des champs enrichis par source (France Travail structuré, WTTJ/HelloWork par regex + heuristiques)
- Story 2.5 : geocoding batch via API BAN, normalisation remote_type, purge description_raw 30j, enrichissement SIRENE optionnel

#### Descriptions epics et FR Coverage Map

Descriptions Epic 2, 3, 4 mises à jour. FR Coverage Map étendu avec FR42-48.

---

## 5. Handoff d'Implémentation

### Scope : Modéré

Ajustement direct des artefacts existants. Pas de replan fondamental.

### Plan d'exécution

| Étape | Action | Skill BMad | Prérequis |
|---|---|---|---|
| 1 | Éditer le PRD (FRs + parcours) | `bmad-edit-prd` | Ce proposal approuvé |
| 2 | Mettre à jour l'Architecture | `bmad-create-architecture` (édition) | Étape 1 |
| 3 | Réécrire les stories Epic 3 + enrichir Epic 2, 4 | `bmad-create-epics-and-stories` (édition) | Étapes 1-2 |
| 4 | Revalider les 3 specs d'implémentation existantes | Revue manuelle | Étape 3 |
| 5 | Check implementation readiness | `bmad-check-implementation-readiness` | Étape 4 |
| 6 | Mettre à jour le sprint-status.yaml | `bmad-sprint-planning` (mise à jour) | Étape 5 |

### Responsabilités

| Rôle | Action |
|---|---|
| Product Manager | Édition PRD (FRs, parcours, scope) |
| Architecte | Mise à jour architecture (schémas, pipeline, LLM) |
| Scrum Master | Réécriture stories, sprint planning |
| Dev (Alexandre) | Benchmark modèles LLM, implémentation |

### Critères de succès

- PRD reflète le flow onboarding en 3 étapes + 5 branches
- Architecture documente les schémas enrichis et le pipeline scoring séparé
- Epic 3 contient 5 stories couvrant FR8-12, FR42-46
- Epic 4.1 couvre FR31 révisé + FR47 + FR48
- Epic 2 couvre les champs enrichis et le geocoding BAN
- Les 3 specs existantes sont validées ou marquées à réécrire
- Le sprint-status.yaml reflète les nouvelles stories

### Document source de référence

`JobFindeer_Onboarding_Structure_v3.md` — à fournir en input à chaque skill BMad lors de l'exécution du plan. Ce document fait autorité sur l'onboarding et le scoring pour le MVP.

---

## 6. Décisions actées dans ce proposal

| Décision | Choix | Rationale |
|---|---|---|
| description_raw des offres | Stocker puis purger après 30 jours | Compromis scoring lexical vs minimisation données |
| Pricing MVP | Reporté | Non prioritaire, focus kill feature (onboarding + scoring) |
| Modèle LLM par tâche | À benchmarker | Alexandre fera des tests comparatifs qualité/coût |
| Enrichissement SIRENE | Optionnel au MVP | Dépendance externe pour un critère branche 1 uniquement |
| Geocoding | API BAN (Phase 1 FR) | Gratuite, hébergement FR, cohérent RGPD. Google Places Phase 3 Europe |
