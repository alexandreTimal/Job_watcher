---
title: 'Onboarding multi-étapes avec questionnaire conversationnel'
type: 'feature'
created: '2026-04-10'
status: 'needs-rewrite'
rewriteReason: 'Sprint Change Proposal 2026-04-10 — ChatQuestionnaire remplacé par flow branche (FreeTextInput → IntentValidation → BranchCalibration → CommonQuestions). Contradiction directe avec FR42 (texte libre).'
baseline_commit: 'df335ea'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'onboarding actuel est un flux linéaire sans retour arrière possible. L'étape PreferencesForm (formulaire classique) ne permet pas une collecte engageante des attentes candidat pour affiner les recherches d'emploi.

**Approach:** Remplacer PreferencesForm par un questionnaire conversationnel style messagerie (bulles de chat avec réponses prédéfinies en chips), ajouter une navigation bidirectionnelle Retour/Suivant entre les 3 étapes, et préserver l'état de chaque étape lors de la navigation. Front-end only, pas de persistance DB.

## Boundaries & Constraints

**Always:**
- Préserver les composants CvUpload et ProfileReview existants sans modification de leur logique interne
- Typer toutes les structures de données (questions, réponses, progression) pour un branchement DB futur trivial
- Conserver l'état de chaque étape quand l'utilisateur navigue entre elles
- Les questions de démo sont en dur (placeholder), facilement remplaçables

**Ask First:**
- Choix du jeu de questions de démonstration (contenu des questions/réponses)
- Modification de la barre de progression visuelle existante

**Never:**
- Créer de schéma DB ou d'endpoint API de persistance
- Ajouter de champ de texte libre dans le questionnaire (chips/boutons uniquement)
- Supprimer le composant PreferencesForm (le laisser en place, juste ne plus l'utiliser dans le flow)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Navigation retour depuis étape 2 | Clic "Retour" sur ProfileReview | Retour à CvUpload, extraction et metrics conservées | N/A |
| Navigation retour depuis étape 3 | Clic "Retour" sur questionnaire | Retour à ProfileReview, profil et réponses questionnaire conservés | N/A |
| Réponse à une question | Clic sur un chip de réponse | Réponse enregistrée, question suivante affichée, scroll vers le bas | N/A |
| Modification réponse précédente | Clic sur une réponse déjà donnée dans le fil | Retour à cette question, réponses suivantes supprimées | N/A |
| Complétion du questionnaire | Dernière question répondue | Bouton "Suivant" activé / flow terminé (redirection feed) | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/app/(mobile)/onboarding/page.tsx` -- Orchestrateur du flux, gestion de l'étape courante et navigation
- `apps/web/src/app/(mobile)/onboarding/_components/CvUpload.tsx` -- Étape 1, inchangée
- `apps/web/src/app/(mobile)/onboarding/_components/ProfileReview.tsx` -- Étape 2, inchangée
- `apps/web/src/app/(mobile)/onboarding/_components/ChatQuestionnaire.tsx` -- NOUVEAU : étape 3, UI conversationnelle
- `apps/web/src/app/(mobile)/onboarding/_components/StepNavigation.tsx` -- NOUVEAU : barre Retour/Suivant réutilisable
- `apps/web/src/app/(mobile)/onboarding/_lib/questionnaire-types.ts` -- NOUVEAU : types TS pour questions/réponses/progression
- `apps/web/src/app/(mobile)/onboarding/_lib/demo-questions.ts` -- NOUVEAU : jeu de questions placeholder

## Tasks & Acceptance

**Execution:**
- [x] `_lib/questionnaire-types.ts` -- Créer les types `Question`, `QuestionOption`, `QuestionnaireAnswer`, `QuestionnaireState` -- Fondation typée pour tout le questionnaire
- [x] `_lib/demo-questions.ts` -- Créer un jeu de 4-5 questions de démo avec options prédéfinies -- Données placeholder remplaçables
- [x] `_components/StepNavigation.tsx` -- Créer composant avec boutons Retour/Suivant, props `onBack`/`onNext`/`canGoBack`/`canGoNext` -- Navigation réutilisable
- [x] `_components/ChatQuestionnaire.tsx` -- Créer l'interface conversationnelle : bulles système, chips de réponse, scroll auto, modification de réponse précédente -- Cœur de la feature
- [x] `page.tsx` -- Refactorer : remplacer PreferencesForm par ChatQuestionnaire, intégrer StepNavigation, préserver l'état de toutes les étapes via useState -- Orchestration du flux complet

**Acceptance Criteria:**
- Given l'utilisateur est sur l'étape 2, when il clique "Retour", then il revoit l'étape 1 avec son CV déjà uploadé et l'extraction conservée
- Given l'utilisateur a répondu à 3 questions sur 5, when il navigue vers l'étape 2 puis revient à l'étape 3, then ses 3 réponses sont toujours visibles dans le fil de conversation
- Given l'utilisateur a répondu à la question 4, when il clique sur sa réponse à la question 2, then les réponses 3 et 4 sont supprimées et la question 2 redevient active
- Given toutes les questions sont répondues, when l'utilisateur clique "Suivant" ou le CTA final, then il est redirigé vers /feed

## Design Notes

L'interface du ChatQuestionnaire s'inspire du pattern Stripe onboarding : messages système alignés à gauche avec fond neutre, réponses utilisateur alignées à droite avec fond primaire. Les chips de réponse apparaissent sous la dernière question non répondue. Le scroll suit automatiquement le bas de la conversation. Une réponse déjà donnée reste cliquable pour permettre la modification (ce qui tronque le fil à partir de ce point).

## Verification

**Commands:**
- `pnpm --filter @jobfindeer/web build` -- expected: build sans erreur TypeScript
- `pnpm --filter @jobfindeer/web dev` -- expected: navigation bidirectionnelle fonctionnelle, questionnaire interactif

**Manual checks:**
- Vérifier la préservation d'état en naviguant entre les 3 étapes
- Vérifier le scroll automatique lors de l'ajout de nouvelles questions
- Vérifier la modification de réponse (tronque correctement le fil)

## Suggested Review Order

**Orchestration du flux multi-étapes**

- Point d'entrée : navigation bidirectionnelle, gestion d'état levée, guard anti double-clic
  [`page.tsx:16`](../../apps/web/src/app/(mobile)/onboarding/page.tsx#L16)

**Questionnaire conversationnel**

- Cœur de la feature : bulles, chips, rewind, gestion multi/single-select, fix dernière question
  [`ChatQuestionnaire.tsx:17`](../../apps/web/src/app/(mobile)/onboarding/_components/ChatQuestionnaire.tsx#L17)

**Navigation**

- Composant Retour/Suivant réutilisable avec rendu conditionnel pour accessibilité
  [`StepNavigation.tsx:1`](../../apps/web/src/app/(mobile)/onboarding/_components/StepNavigation.tsx#L1)

**Types et données**

- Structure de données typée pour branchement DB futur
  [`questionnaire-types.ts:1`](../../apps/web/src/app/(mobile)/onboarding/_lib/questionnaire-types.ts#L1)

- Questions de démo placeholder (5 questions, 2 multi-select)
  [`demo-questions.ts:1`](../../apps/web/src/app/(mobile)/onboarding/_lib/demo-questions.ts#L1)
