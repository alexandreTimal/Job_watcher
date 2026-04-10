---
title: 'Refacto schema extraction CV — enrichissement profil'
type: 'refactor'
created: '2026-04-10'
status: 'done'
baseline_commit: 'a4c6418'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'extraction CV ne capture que 4 champs (skills, experienceYears, currentLocation, currentTitle). Les langues, formations, historique de postes, certifications et niveau d'études sont perdus. Le scoring n'a pas assez de signal pour matcher correctement.

**Approach:** Enrichir le prompt LLM avec le schema validé (10 champs), ajouter les colonnes structurées utiles au scoring dans la table `user_profiles`, stocker le reste en JSONB `raw_extraction`, adapter la transformation Zod et le composant ProfileReview.

## Boundaries & Constraints

**Always:**
- Le schema de sortie LLM est fixé : `current_title`, `location`, `experience_years`, `hard_skills`, `soft_skills`, `languages`, `education_level`, `work_history`, `education`, `certifications`
- Séparer hard_skills et soft_skills dans le profil DB (deux colonnes JSONB distinctes)
- `raw_extraction` stocke le JSON brut complet du LLM en JSONB
- Garder la rétrocompatibilité du scoring (ProfileData interface)

**Ask First:**
- Changements au scoring engine (ajout de nouvelles règles)

**Never:**
- Ne pas toucher au preferencesSchema ni à userPreferences
- Ne pas modifier le flow d'onboarding (étapes upload → review → preferences)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CV complet | PDF avec XP, formations, langues | Tous les champs remplis | N/A |
| CV minimaliste | PDF avec juste un nom et des skills | hard_skills remplis, rest null/[] | Champs manquants = null |
| LLM retourne champs inconnus | JSON avec clés non prévues | Ignorés par Zod, stockés dans raw_extraction | safeParse filtre |

</frozen-after-approval>

## Code Map

- `apps/web/src/lib/extract-cv.ts` -- Prompt LLM + transformation Zod
- `packages/validators/src/profile.ts` -- extractedProfileSchema (Zod)
- `packages/db/src/schema/profile.ts` -- Table userProfiles (Drizzle)
- `apps/web/src/app/(mobile)/onboarding/_components/ProfileReview.tsx` -- UI review profil
- `packages/api/src/router/profile.ts` -- tRPC saveExtraction mutation
- `apps/pipeline/src/scoring/rules-engine.ts` -- ProfileData interface (lecture seule)
- `packages/db/src/seed/dev-seed.ts` -- Seed dev à mettre à jour

## Tasks & Acceptance

**Execution:**
- [x] `packages/validators/src/profile.ts` -- Enrichir extractedProfileSchema avec hard_skills, soft_skills, languages, educationLevel, workHistory, education, certifications
- [x] `packages/db/src/schema/profile.ts` -- Ajouter colonnes : hardSkills, softSkills, languages, educationLevel, rawExtraction (jsonb) à userProfiles
- [x] `apps/web/src/lib/extract-cv.ts` -- Mettre à jour le prompt LLM avec le schema 10 champs, adapter la transformation Zod
- [x] `packages/api/src/router/profile.ts` -- Adapter saveExtraction pour persister les nouveaux champs
- [x] `apps/web/src/app/(mobile)/onboarding/_components/ProfileReview.tsx` -- Afficher hard_skills, soft_skills, langues, formations, certifications
- [x] `packages/db/src/seed/dev-seed.ts` -- Mettre à jour le seed avec les nouveaux champs
- [x] `pnpm db:push` -- Pousser le schema mis à jour

**Acceptance Criteria:**
- Given un CV PDF uploadé, when l'extraction termine, then le profil contient hard_skills, soft_skills, languages, educationLevel séparément
- Given un profil extrait, when l'utilisateur est sur /onboarding review, then il voit et peut éditer skills, langues, formations
- Given le schema DB mis à jour, when `pnpm db:push`, then les nouvelles colonnes existent
- Given le scoring engine, when il lit ProfileData, then il compile sans erreur (rétrocompatibilité)

## Verification

**Commands:**
- `npx turbo run typecheck --force` -- expected: 0 errors
- `pnpm db:push` -- expected: schema pushed
- `pnpm db:seed` -- expected: seed OK avec nouveaux champs

## Suggested Review Order

**Schema & types**

- Nouveaux sub-schemas (Language, WorkHistory, Education) et extractedProfileSchema enrichi
  [`profile.ts:3`](../../packages/validators/src/profile.ts#L3)

- Nouvelles colonnes DB : hardSkills, softSkills, languages, educationLevel, rawExtraction JSONB
  [`profile.ts:14`](../../packages/db/src/schema/profile.ts#L14)

**Extraction LLM**

- Schema Zod de validation du JSON LLM (10 champs snake_case)
  [`extract-cv.ts:72`](../../apps/web/src/lib/extract-cv.ts#L72)

- Prompt enrichi avec 5 regles et schema de sortie complet
  [`extract-cv.ts:109`](../../apps/web/src/lib/extract-cv.ts#L109)

- Transformation LLM output → ExtractedProfile
  [`extract-cv.ts:152`](../../apps/web/src/lib/extract-cv.ts#L152)

**API & persistance**

- saveExtraction : peuple hardSkills, softSkills, skills (compat), languages, rawExtraction
  [`profile.ts:32`](../../packages/api/src/router/profile.ts#L32)

**UI**

- ProfileReview : champs editables pour hard/soft skills, langues, education, certifs + display workHistory/education
  [`ProfileReview.tsx:16`](../../apps/web/src/app/(mobile)/onboarding/_components/ProfileReview.tsx#L16)

**Seed**

- Dev seed mis a jour avec hardSkills, softSkills, languages, educationLevel
  [`dev-seed.ts:37`](../../packages/db/src/seed/dev-seed.ts#L37)
