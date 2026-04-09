# Sprint Change Proposal — Pivot Job_watcher → JobFindeer

**Date :** 2026-04-08
**Auteur :** Alexandre (avec facilitation Scrum Master)
**Scope :** Major — Replan fondamental

---

## 1. Résumé du Problème

Le projet Job_watcher, actuellement un outil CLI personnel de veille emploi (script cron TypeScript, SQLite, Notion), fait l'objet d'un pivot stratégique vers **JobFindeer** : un produit SaaS multi-utilisateurs mobile-first qui agrège les offres des principaux job boards français, les score par pertinence pour chaque profil candidat, et les présente sous forme d'un feed personnalisé.

### Déclencheur

Décision stratégique de transformer un outil personnel fonctionnel en produit commercial. Le brief complet définit :

- **Positionnement** : assistant de tri, pas un job board, pas d'auto-apply (contrainte juridique structurante)
- **Cible** : 100 000 MAU, chercheurs d'emploi français mobile-first
- **Modèle économique** : freemium 9,90€ / 19,90€ par mois, plafond 5€/client/mois de coût opérationnel
- **Phases** : MVP PWA → app native React Native → expansion européenne

### Évidence

- Le brief est complet et structuré (13 sections, principes directeurs, économie unitaire chiffrée)
- Job_watcher valide le concept de base : le pipeline scraping → scoring → dédup fonctionne
- Le plafond de 5€/client/mois est une contrainte dure qui invalide la stack actuelle (mais pas le concept)

---

## 2. Analyse d'Impact

### Impact sur les Epics

| Epic actuel | Verdict | Détail |
|-------------|---------|--------|
| Epic 1 — Fondation & Pipeline | **Redéfini** | Concept pipeline conservé, mais multi-tenant, Postgres, workers async |
| Epic 2 — Intégration Notion | **Supprimé** | Remplacé par feed intégré dans le produit |
| Epic 3 — Sources API & Scraping | **Réécrit** | Industrialisation : Playwright stealth, proxies, anti-CAPTCHA, monitoring |
| Epic 4 — Parsing Emails LinkedIn | **Supprimé** | LinkedIn via agrégateur tiers (Mantiks.io) ou partenariat |
| Epic 5 — Tableau de Bord Local | **Transformé** | Produit web mobile-first + back-office admin |

### Nouveaux Epics nécessaires

| Epic | Description |
|------|-------------|
| Auth & Comptes | Inscription, login (magic link/OAuth), gestion profil, RGPD |
| Onboarding candidat | Upload CV, extraction LLM, ciblage métier/secteur/géo, préférences |
| Paiement & Facturation | Stripe, essai 7j, abonnements, TVA UE |
| Feed personnalisé | API feed scoré par profil, tri/triage, aperçu court, handoff source |
| Infra & Déploiement | Postgres, Redis, Docker Compose, VPS Hetzner, CI/CD |
| Pipeline scoring multi-tenant | Scoring V1 par profil, batch nocturne, préparation V2 LLM |
| Notifications | Push quotidien, email récap, rappels |
| Scraping industriel | Workers Playwright, proxies, CAPTCHA, monitoring par source |
| Conformité juridique | Logs redirection, purge auto, process cessation, CGU |

### Impact sur les artefacts

| Artefact | Impact |
|----------|--------|
| PRD | Réécriture complète depuis le brief |
| Architecture | Réécriture complète (7 décisions ouvertes à trancher) |
| Epics & Stories | Réécriture complète |
| UX Design | À créer (inexistant) |
| 11 stories d'implémentation | Toutes invalidées |
| GitHub Actions workflow | Supprimé (CI/CD classique) |
| .env.example, README, package.json | Réécriture |

### Code existant réutilisable comme référence

| Module | Valeur pour JobFindeer |
|--------|----------------------|
| `src/sources/france-travail.ts` | OAuth2 client_credentials, mapping API → JobOffer |
| `src/sources/wttj.ts` | Connaissance de la structure WTTJ |
| `src/sources/indeed-rss.ts` | Pattern RSS (Indeed passe en partenariat/Mantiks) |
| `src/filters/keyword-filter.ts` | Logique de scoring pondéré, base du V1 multi-tenant |
| `src/filters/dedup.ts` | Normalisation + hash, réutilisable quasi tel quel |
| `src/store/sqlite.ts` | Schéma de référence pour migration Postgres |
| `dashboard/` (shadcn/ui) | Composants UI pour le back-office |

---

## 3. Approche Recommandée : Replan Fondamental

### Justification

L'ampleur du changement (nature du produit, échelle, stack, modèle économique) rend tout ajustement incrémental non viable. Les alternatives évaluées :

- **Ajustement direct** — rejeté : reviendrait à réécrire 90%+ en gardant une structure inadaptée
- **Rollback** — rejeté : le code existant a de la valeur de référence, le problème n'est pas un bug
- **Replan fondamental** — retenu : seule option honnête, et le brief fournit une base solide

### Pourquoi garder le même repo

- Le code existant a une valeur de référence concrète (sources, scoring, dédup)
- L'historique git documente les apprentissages
- Le brief est une évolution du même domaine

### Effort et risque

- **Effort** : Élevé — nouveau cycle complet PRD → Architecture → Epics → Implémentation
- **Risque** : Moyen — atténué par la qualité du brief (contraintes claires, économie chiffrée, phases définies)
- **Timeline** : Non estimée (dépend des décisions d'architecture et du temps disponible)

---

## 4. Propositions de Changements Détaillées

### 4.1 — PRD

**Action** : Réécriture complète via `bmad-create-prd`

Le nouveau PRD doit intégrer :
- Le positionnement "assistant, pas job board, pas auto-apply" comme contrainte structurante
- Les FRs pour : onboarding LLM, feed personnalisé, tri, handoff, auth, paiement, RGPD
- Les NFRs pour : scale 100k MAU, plafond 5€/client/mois, mobile-first, conformité juridique
- Le scoping Phase 1 MVP : France Travail + WTTJ + 1-2 sources, PWA, scoring V1, freemium

### 4.2 — Architecture

**Action** : Réécriture complète via `bmad-create-architecture`

7 décisions ouvertes à trancher :

1. **Stack backend** — Node (NestJS/Fastify/Hono) vs Python (FastAPI)
2. **Orchestration jobs** — cron vs BullMQ vs Temporal
3. **Architecture scoring V2** — full LLM vs hybride vectoriel + LLM
4. **Auth** — self-hosted (Auth.js/Lucia) vs managé (Clerk/WorkOS) vs contrainte coût
5. **Fournisseurs** — proxies résidentiels, CAPTCHA, email transactionnel, monitoring
6. **Frontière PWA vs native** — critères de bascule
7. **Structure monorepo** — apps/ + packages/ layout

### 4.3 — UX Design

**Action** : Création via `bmad-create-ux-design`

Flows à concevoir :
- Onboarding (upload CV → extraction LLM → ciblage → préférences)
- Feed quotidien (cards scorées, mobile-first)
- Tri / triage (garder, écarter, sauvegarder, marquer candidaté)
- Aperçu court + handoff vers source
- Compte, facturation, paramètres

### 4.4 — Epics & Stories

**Action** : Réécriture complète via `bmad-create-epics-and-stories`

Scopé sur Phase 1 MVP uniquement. Les 9 nouveaux epics identifiés dans l'analyse d'impact servent de point de départ.

---

## 5. Handoff d'Implémentation

### Scope : Major

Replan fondamental nécessitant Product Manager + Architecte.

### Plan d'exécution séquentiel

| Étape | Action | Skill BMad | Dépendance |
|-------|--------|------------|------------|
| 0 | Archiver l'état actuel (tag git `v0-job-watcher-personal`) | — | — |
| 1 | Créer le nouveau PRD | `bmad-create-prd` | Étape 0 |
| 2 | Créer le document UX | `bmad-create-ux-design` | Étape 1 |
| 3 | Créer l'architecture | `bmad-create-architecture` | Étapes 1-2 |
| 4 | Découper en epics & stories | `bmad-create-epics-and-stories` | Étape 3 |
| 5 | Valider la readiness | `bmad-check-implementation-readiness` | Étape 4 |
| 6 | Sprint planning | `bmad-sprint-planning` | Étape 5 |
| 7 | Implémentation | `bmad-dev-story` (en boucle) | Étape 6 |

### Responsabilités

| Rôle | Agent BMad | Responsabilité |
|------|-----------|---------------|
| Product Manager | `bmad-agent-pm` | Transformer le brief en PRD formel |
| UX Designer | `bmad-agent-ux-designer` | Concevoir les flows mobile-first |
| Architecte | `bmad-agent-architect` | Trancher les 7 décisions techniques |
| Scrum Master | `bmad-agent-sm` | Découper en sprints implémentables |
| Dev | `bmad-agent-dev` | Implémenter story par story |

### Critères de succès

- PRD couvre toutes les FRs/NFRs du brief Phase 1
- Architecture tranche les 7 décisions avec rationale documenté
- UX couvre les 5 flows critiques (onboarding, feed, tri, handoff, compte)
- Tous les artefacts passent le check de readiness
- Le plafond de 5€/client/mois est respecté dans les choix d'architecture
- Les contraintes juridiques sont intégrées comme des FRs, pas comme des notes

### Input pour chaque étape

Le brief complet (sections 1-13) doit être fourni en input à chaque skill BMad. Il constitue le document source de référence pour tout le replan.

---

## 6. Annexe — Principes directeurs (du brief)

À garder en tête à chaque étape du replan :

1. Tenir le plafond 5€/client/mois — contrainte dure
2. Le périmètre restreint est une force — pas d'élargissement
3. La défensibilité juridique est une contrainte d'architecture
4. La rétention est le business model — push, fréquence, fraîcheur
5. La maintenance scraping est le coût caché dominant
6. Mobile-first n'est pas un compromis, c'est l'évidence
7. Un seul état serveur, plusieurs surfaces
8. Shipper vite en Phase 1
