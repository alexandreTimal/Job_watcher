---
title: 'Refacto préférences : multi-select contrats, autocomplete localisation Google Places avec rayon par ville'
type: 'feature'
created: '2026-04-10'
status: 'done'
baseline_commit: 'a4c6418'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les champs "Types de contrat" et "Ville préférée" du formulaire de préférences sont des inputs texte libres, source d'erreurs de saisie. La localisation ne supporte qu'une seule ville et aucun rayon de recherche.

**Approach:** Remplacer le champ contrats par un multi-select avec options prédéfinies et pills. Remplacer "Ville préférée" par "Localisation" avec autocomplete Google Places, support multi-villes (pills avec ×), et un slider de rayon optionnel par localisation (ex: "Lyon — 50 km", "Paris — 10 km").

## Boundaries & Constraints

**Always:**
- Utiliser l'API Google Places Autocomplete (free tier $200/mois suffisant)
- Pills avec × pour chaque valeur sélectionnée (contrats et localisations)
- Rayon optionnel et individuel par localisation (slider 5-200km sous chaque pill)
- Stocker les localisations comme JSONB `Array<{label: string, radius: number | null}>`
- Supprimer les anciens champs `preferredLocation` et `locationRadius`
- 21 types de contrat prédéfinis (liste fournie par l'utilisateur)

**Ask First:**
- Modification de la liste des types de contrat

**Never:**
- Modifier les champs salaire, télétravail, mots-clés négatifs, ou secteurs (secteurs reportés)
- Stocker des coordonnées GPS
- Géolocalisation côté serveur

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ajout contrat | Clic "CDI" dans le dropdown | Pill "CDI" ajoutée, option cochée | N/A |
| Suppression contrat | Clic × sur pill | Pill retirée, option décochée | N/A |
| Recherche location | Tape "Ly" | Suggestions Google Places | "Aucun résultat" si vide |
| Ajout location | Sélectionne "Lyon, France" | Pill ajoutée avec slider rayon | Doublon ignoré |
| Slider rayon | Glisse à 50km sur pill Lyon | Pill affiche "Lyon, France — 50 km" | Min 5, max 200, step 5 |
| Pas de rayon | Slider laissé à 0 ou non touché | Localisation sans rayon (null) | N/A |
| Sauvegarde | Clic Sauvegarder | Données persistées en DB | Toast erreur si échec |

</frozen-after-approval>

## Code Map

- `packages/validators/src/profile.ts` -- Schéma Zod : remplacer `preferredLocation`+`locationRadius` par `locations`
- `packages/db/src/schema/profile.ts` -- Table `userPreferences` : remplacer colonnes par `locations` jsonb
- `apps/web/src/app/(desktop)/settings/_components/constants.ts` -- Liste des 21 types de contrat
- `apps/web/src/app/(desktop)/settings/_components/MultiSelect.tsx` -- Composant dropdown multi-select + pills
- `apps/web/src/app/(desktop)/settings/_components/LocationPicker.tsx` -- Autocomplete Google Places + pills + slider rayon par ville
- `apps/web/src/app/(desktop)/settings/_components/PreferencesEditor.tsx` -- Intégration des nouveaux composants
- `apps/web/src/app/(desktop)/settings/page.tsx` -- Mapping données locations

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/app/(desktop)/settings/_components/constants.ts` -- Créer la liste des 21 types de contrat
- [x] `packages/validators/src/profile.ts` -- Remplacer `preferredLocation`+`locationRadius` par `locations: Array<{label, radius}>`
- [x] `packages/db/src/schema/profile.ts` -- Remplacer colonnes `preferred_location`+`location_radius` par `locations` jsonb
- [x] `apps/web/src/app/(desktop)/settings/_components/MultiSelect.tsx` -- Dropdown avec checkboxes, pills avec ×
- [x] `apps/web/src/app/(desktop)/settings/_components/LocationPicker.tsx` -- Autocomplete + pills + slider rayon par localisation
- [x] `apps/web/src/app/(desktop)/settings/_components/PreferencesEditor.tsx` -- Remplacer inputs texte par MultiSelect et LocationPicker
- [x] `apps/web/src/app/(desktop)/settings/page.tsx` -- Adapter le mapping des données
- [x] `apps/web/.env.example` -- Ajouter `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY`

**Acceptance Criteria:**
- Given le formulaire, when je clique "Types de contrat", then un dropdown multi-select avec 21 options apparaît
- Given un contrat sélectionné, when je clique ×, then la pill disparaît
- Given le champ localisation, when je tape 3+ caractères, then des suggestions Google Places apparaissent
- Given une localisation ajoutée, when je glisse le slider, then le rayon s'affiche sur la pill
- Given les préférences modifiées, when je sauvegarde, then les données sont persistées en DB

## Verification

**Commands:**
- `pnpm build` -- expected: build réussi sans erreurs TypeScript

**Manual checks:**
- Naviguer vers /settings, vérifier multi-select contrats et autocomplete localisation
- Sauvegarder, recharger, vérifier la persistance des données

## Suggested Review Order

**Schema (fondation du changement)**

- Nouveau type `locations` avec label + radius nullable, remplace 2 champs
  [`profile.ts:47`](../../packages/validators/src/profile.ts#L47)

- Colonne JSONB `locations` remplace `preferred_location` + `location_radius`
  [`profile.ts:43`](../../packages/db/src/schema/profile.ts#L43)

**Composants UI (cœur de la feature)**

- Multi-select dropdown avec recherche, checkboxes et pills
  [`MultiSelect.tsx:1`](../../apps/web/src/app/(desktop)/settings/_components/MultiSelect.tsx#L1)

- Autocomplete Google Places + pills avec slider rayon individuel
  [`LocationPicker.tsx:1`](../../apps/web/src/app/(desktop)/settings/_components/LocationPicker.tsx#L1)

- Intégration des nouveaux composants dans le formulaire
  [`PreferencesEditor.tsx:10`](../../apps/web/src/app/(desktop)/settings/_components/PreferencesEditor.tsx#L10)

**Mapping données**

- Adaptation du mapping `locations` au lieu de `preferredLocation`
  [`page.tsx:31`](../../apps/web/src/app/(desktop)/settings/page.tsx#L31)

**Pipeline (cohérence scoring)**

- Scoring multi-locations : match sur n'importe quelle localisation
  [`rules-engine.ts:74`](../../apps/pipeline/src/scoring/rules-engine.ts#L74)

- Feed worker : nouveau champ `locations` dans la query
  [`feed.worker.ts:28`](../../apps/pipeline/src/workers/feed.worker.ts#L28)

**Périphériques**

- 21 types de contrat prédéfinis
  [`constants.ts:1`](../../apps/web/src/app/(desktop)/settings/_components/constants.ts#L1)

- Seed data adaptée au nouveau format
  [`dev-seed.ts:66`](../../packages/db/src/seed/dev-seed.ts#L66)

- Clé API Google Places ajoutée
  [`.env.example:30`](../../.env.example#L30)
