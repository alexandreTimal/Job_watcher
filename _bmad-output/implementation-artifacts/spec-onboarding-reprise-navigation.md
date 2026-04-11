---
title: 'Onboarding : reprise intelligente et navigation libre entre sections'
type: 'feature'
created: '2026-04-11'
status: 'done'
baseline_commit: 'd147c1b'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'onboarding redémarre toujours à l'étape "upload" même si le profil, la branche ou les préférences sont déjà renseignés en base. L'utilisateur doit tout relancer à chaque visite.

**Approach:** Au montage, charger le profil existant via `profile.get`, déterminer quelles étapes sont complètes, sauter à la première incomplète, et rendre la barre de progression cliquable pour revisiter les étapes déjà remplies.

## Boundaries & Constraints

**Always:**
- Pré-remplir l'état local (extraction, branch, calibrationData, etc.) depuis les données serveur au chargement
- Permettre de cliquer sur une étape complétée pour y revenir et la re-lancer
- Ne jamais permettre de sauter une étape incomplète en avant (sauf celles déjà remplies)

**Ask First:** Modification du schéma DB ou ajout de nouvelles routes API

**Never:** Modifier la logique métier des composants enfants (CvUpload, BranchCalibration, etc.), ajouter de nouveaux endpoints backend

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Profil complet | Toutes les données existent en DB | Démarre à l'étape "titles", barre 100% remplie | N/A |
| Profil partiel (CV ok, pas de branche) | rawExtraction existe, branch null | Démarre à "freetext", étapes upload/review marquées complètes | N/A |
| Aucune donnée | Profil null | Démarre à "upload" comme avant | N/A |
| Re-lancement d'une étape | Clic sur pastille complétée | Navigation vers cette étape, données pré-remplies visibles | N/A |
| Erreur chargement profil | Requête profile.get échoue | Démarre à "upload" par défaut (fallback gracieux) | Silencieux, pas de blocage |

</frozen-after-approval>

## Code Map

- `apps/web/src/app/(mobile)/onboarding/page.tsx` -- Page principale, orchestration des étapes et état local
- `apps/web/src/app/(mobile)/onboarding/_components/StepNavigation.tsx` -- Barre de navigation bas de page (boutons retour/suivant)
- `packages/api/src/router/profile.ts` -- Route `profile.get` qui retourne profil + préférences

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/app/(mobile)/onboarding/page.tsx` -- Ajouter appel `profile.get` au montage, calculer les étapes complètes, pré-remplir l'état local, démarrer à la première étape incomplète
- [x] `apps/web/src/app/(mobile)/onboarding/page.tsx` -- Rendre les pastilles de la barre de progression cliquables vers les étapes déjà complétées
- [x] `apps/web/src/app/(mobile)/onboarding/_components/StepNavigation.tsx` -- Ajouter prop optionnelle "Passer" pour skip vers l'étape suivante quand l'étape courante est déjà remplie

**Acceptance Criteria:**
- Given un utilisateur avec profil CV existant, when il ouvre /onboarding, then il démarre directement à la première étape non remplie
- Given un utilisateur sur l'étape "calibration", when il clique sur la pastille "upload", then il revient à l'étape upload avec ses données pré-remplies
- Given un utilisateur sans aucune donnée, when il ouvre /onboarding, then le comportement est identique à l'actuel (étape "upload")
- Given un utilisateur sur une étape déjà remplie, when il voit le bouton "Passer", then il peut avancer sans re-soumettre

## Verification

**Commands:**
- `cd apps/web && npx tsc --noEmit` -- expected: pas d'erreurs TypeScript

**Manual checks:**
- Ouvrir /onboarding avec un compte ayant un profil complet → doit sauter aux titles
- Ouvrir /onboarding avec un compte vierge → doit commencer à upload
- Cliquer sur une pastille d'étape complétée → doit naviguer vers cette étape

## Suggested Review Order

**Logique de reprise (coeur de la feature)**

- Calcul séquentiel des étapes complètes depuis les données serveur — exige `freeTextRaw` avant de marquer "freetext"
  [`page.tsx:46`](../../apps/web/src/app/(mobile)/onboarding/page.tsx#L46)

- Hydratation au premier chargement : pré-remplit l'état local et saute à la première étape incomplète
  [`page.tsx:104`](../../apps/web/src/app/(mobile)/onboarding/page.tsx#L104)

- Navigation sûre vers "intent" — force `showBranchSelect` si pas d'`intentResult`
  [`page.tsx:314`](../../apps/web/src/app/(mobile)/onboarding/page.tsx#L314)

**Barre de progression cliquable**

- Pastilles devenues `<button>` cliquables vers les étapes complétées, avec feedback visuel
  [`page.tsx:336`](../../apps/web/src/app/(mobile)/onboarding/page.tsx#L336)

**Bouton "Passer"**

- Skip gardé : désactivé sur le dernier step, utilise `goToStep` pour la sécurité "intent"
  [`page.tsx:464`](../../apps/web/src/app/(mobile)/onboarding/page.tsx#L464)

- StepNavigation étendu avec `canSkip`/`onSkip` — bouton "Passer" en `variant="ghost"`
  [`StepNavigation.tsx:11`](../../apps/web/src/app/(mobile)/onboarding/_components/StepNavigation.tsx#L11)
