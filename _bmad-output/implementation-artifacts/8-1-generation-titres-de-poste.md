# Story 8.1 : Generation des titres de poste

Status: review

## Story

En tant que candidat ayant termine l'onboarding,
je veux que le systeme genere une liste de titres de poste adaptes a ma branche d'intention et a mon profil,
afin de pouvoir valider et ajuster les termes exacts qui seront recherches sur les job boards.

## Contexte metier

Cette feature est le chainon manquant entre l'onboarding (epic 3) et le scoring/feed (epic 4). Actuellement, apres l'onboarding, le systeme n'a aucun moyen de traduire le profil structure en requetes concretes pour les job boards. Les titres de poste sont la brique qui rend le profil exploitable.

Approche retenue : **100% LLM, un appel par candidat, sans optimisation prematuree.** Pas de base de mappings metier, pas de taxonomie ROME, pas de cache, pas de normalisation. Le LLM connait deja les variantes de titres dans tous les metiers et toutes les langues — c'est exactement son cas d'usage.

## Criteres d'acceptation

### AC1 — Generation LLM par branche
- GIVEN un profil onboarde avec une branche validee (1-5)
- WHEN le systeme appelle le LLM avec le prompt dedie a cette branche
- THEN le LLM retourne un JSON valide contenant 10-15 titres avec champs `fr` et `en` (l'un ou l'autre peut etre `null`)
- AND les titres sont des intitules reellement utilises sur le marche francais
- AND le modele utilise est Gemini Flash Lite 2.5 en mode JSON strict

### AC2 — Ecran de validation utilisateur
- GIVEN la liste de titres generee
- WHEN l'utilisateur arrive sur l'ecran de validation (nouvelle etape onboarding apres "common")
- THEN chaque titre est affiche comme un chip/ligne cochee par defaut
- AND la version francaise est affichee en priorite, avec la version anglaise en sous-texte discret
- AND un champ "+ ajouter un titre" est disponible en bas de liste
- AND un bouton "Lancer la recherche" est le CTA principal

### AC3 — Interactions de validation
- GIVEN l'ecran de validation affiche
- WHEN l'utilisateur decoche un titre THEN il reste visible mais grise (active=false)
- WHEN l'utilisateur ajoute un titre THEN il apparait immediatement en liste, coche par defaut
- WHEN l'utilisateur clique "Lancer la recherche" THEN seuls les titres coches sont sauvegardes comme actifs

### AC4 — Stockage dans le profil
- GIVEN l'utilisateur valide sa liste de titres
- WHEN la sauvegarde s'execute
- THEN le champ `searchTitles` (JSONB) de `user_profiles` contient : `generated_at` (ISO 8601), `branch_used` (string "1"-"5"), `titles` (array de `{fr, en, active}`)
- AND les titres decoches ont `active: false` et restent stockes

### AC5 — Gestion d'erreur LLM
- GIVEN un appel LLM qui echoue ou retourne du JSON invalide
- WHEN le systeme detecte l'echec
- THEN il relance **une seule fois** automatiquement
- AND si la relance echoue aussi, il genere un fallback minimal : le `currentTitle` du CV + 2-3 variantes evidentes
- AND l'ecran de validation s'affiche normalement avec la liste de fallback

### AC6 — Regeneration manuelle (settings)
- GIVEN un utilisateur avec des titres deja valides
- WHEN il clique "Modifier mes titres de recherche" depuis la page settings
- THEN le systeme relance le prompt LLM avec les parametres actuels du profil
- AND presente un nouvel ecran de validation

### AC7 — Regeneration sur changement de profil
- GIVEN un utilisateur qui modifie sa branche ou ses parametres de calibrage significatifs
- WHEN la modification est sauvegardee
- THEN le systeme affiche un message : "Tes nouveaux choix vont changer les postes recherches. Veux-tu que je regenere la liste ?"
- AND si oui, relance du prompt et nouvel ecran de validation
- AND jamais de regeneration silencieuse

## Taches / Sous-taches

- [x] **Tache 1 — Schema DB + migration** (AC: #4)
  - [x] Ajouter colonne `search_titles` (JSONB, nullable) a `userProfiles` dans `packages/db/src/schema/profile.ts`
  - [x] Typer la colonne avec `$type<SearchTitlesData>()` (interface definie dans validators)
  - [x] Generer et appliquer la migration Drizzle

- [x] **Tache 2 — Schemas Zod** (AC: #1, #4)
  - [x] Ajouter dans `packages/validators/src/onboarding.ts` :
    - `searchTitleSchema` : `{ fr: string | null, en: string | null }`
    - `searchTitleWithActiveSchema` : extends avec `active: boolean`
    - `searchTitlesDataSchema` : `{ generated_at: string, branch_used: branchEnum, titles: searchTitleWithActiveSchema[] }`
    - `llmTitleOutputSchema` : `{ titles: searchTitleSchema[] }` (pour valider la sortie LLM brute)

- [x] **Tache 3 — Service LLM title-generator** (AC: #1, #5)
  - [x] Creer `apps/web/src/lib/title-generator.ts` en suivant le pattern exact de `intent-analyzer.ts`
  - [x] Implementer `generateTitles(branch, profileParams, modelId?)` retournant `{ titles: SearchTitle[], metrics: TitleGenMetrics }`
  - [x] Integrer le system prompt commun et les 5 user prompts par branche (voir section "Contenu des prompts LLM" ci-dessous)
  - [x] Utiliser `generateText()` + `google()` avec `providerOptions.google.responseMimeType: "application/json"` et `temperature: 0.3`, `maxTokens: 2000`
  - [x] Implementer la logique de retry (1 relance) + fallback minimal (currentTitle + variantes evidentes)
  - [x] Valider la sortie avec `llmTitleOutputSchema.parse()`
  - [x] Separer system prompt (const stable) et user prompt (template avec injection de variables)

- [x] **Tache 4 — Route API** (AC: #1)
  - [x] Creer `apps/web/src/app/api/generate-titles/route.ts`
  - [x] POST : recoit `{ params: BranchParams, model? }`, appelle `generateTitles()`, retourne `{ titles, metrics }`
  - [x] Proteger par session Auth.js (pattern identique a `/api/intent/route.ts`)

- [x] **Tache 5 — Mutation tRPC saveSearchTitles** (AC: #4)
  - [x] Ajouter `saveSearchTitles` dans `packages/api/src/router/profile.ts`
  - [x] Input : `searchTitlesDataSchema`
  - [x] Upsert dans `userProfiles.searchTitles` pour l'utilisateur courant

- [x] **Tache 6 — Composant TitleValidation.tsx** (AC: #2, #3)
  - [x] Creer `apps/web/src/app/(mobile)/onboarding/_components/TitleValidation.tsx`
  - [x] Props : `titles: SearchTitle[]`, `onComplete: (validatedTitles: SearchTitleWithActive[]) => void`, `loading: boolean`
  - [x] Titre : "Voici les postes que je vais chercher pour toi"
  - [x] Sous-titre : "Tu peux ajuster la liste avant de lancer la recherche"
  - [x] Chips/lignes cochables, FR prioritaire + EN discret
  - [x] Champ "+ ajouter un titre" en bas
  - [x] Bouton "Lancer la recherche"
  - [x] Mention legere : "Tu pourras revenir modifier ces choix plus tard depuis ton profil"
  - [x] Utiliser les composants shadcn/ui existants (Checkbox, Input, Button, Badge)

- [x] **Tache 7 — Integration dans le flow onboarding** (AC: #2, #3, #4)
  - [x] Ajouter l'etape `"titles"` dans STEPS de `page.tsx` (apres `"common"`, avant la redirection vers `/feed`)
  - [x] Apres `handleCommonComplete` : appeler `/api/generate-titles` avec les params de la branche
  - [x] Afficher `TitleValidation` a l'etape titles
  - [x] Au clic "Lancer la recherche" : appeler `saveSearchTitles` puis `router.push("/feed")`

- [x] **Tache 8 — Regeneration dans settings** (AC: #6)
  - [x] Ajouter section "Titres de recherche" dans `apps/web/src/app/(desktop)/settings/page.tsx`
  - [x] Bouton "Modifier mes titres de recherche" → appel API → affichage ecran validation inline

- [x] **Tache 9 — Alerte regeneration sur changement profil** (AC: #7)
  - [x] Dans la page settings, detecter si `searchTitles.branch_used !== profile.branch`
  - [x] Afficher bandeau d'alerte avec bouton "Regenerer mes titres"
  - [x] Si confirme : relancer generation + afficher ecran validation inline

- [x] **Tache 10 — Extraction des parametres par branche** (AC: #1)
  - [x] Fonction `buildTitleGenParams()` dans `page.tsx` et `buildSettingsParams()` dans `settings/page.tsx`
  - [x] Mapping complet pour les 5 branches avec conversion des valeurs DB → prompt

- [x] **Tache 11 — Ajout champ `trainingWillingness` au calibrage branche 3** (AC: #1)
  - [x] Ajouter `trainingWillingness: z.enum(["self_learning", "employer_paid", "none"]).default("none")` a `branch3CalibrationSchema`
  - [x] Ajouter la question "Formation pour ce nouveau metier" dans `BranchCalibration.tsx` (3 options radio)
  - [x] Migration non necessaire : `calibrationAnswers` est un JSONB libre en DB

- [x] **Tache 12 — Ajout `first_job` au schema branche 5** (AC: #1)
  - [x] Modifier `branch5CalibrationSchema.contractType` de `z.enum(["alternance", "stage"])` a `z.enum(["alternance", "stage", "first_job"])`
  - [x] Ajouter l'option "Premier emploi / CDI" dans `BranchCalibration.tsx` branche 5
  - [x] Migration non necessaire : `calibrationAnswers` est un JSONB libre en DB

## Dev Notes

### Patterns existants a suivre IMPERATIVEMENT

**Service LLM — copier le pattern de `apps/web/src/lib/intent-analyzer.ts` :**
- Import `generateText` de `ai`, `google` de `@ai-sdk/google`
- `MODEL_CONFIG` avec pricing par modele (input/output par 1M tokens)
- `providerOptions.google.responseMimeType: "application/json"` pour le mode JSON strict
- Nettoyage du JSON retourne (strip markdown code fences) : `result.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim()`
- Validation Zod de la sortie
- Extraction usage tokens avec fallback multi-format : `usage?.promptTokens ?? usage?.input_tokens ?? usage?.inputTokens`
- Calcul cout USD
- Retour `{ titles, metrics }` (meme structure que `IntentAnalysisResult`)

**Route API — copier le pattern de `apps/web/src/app/api/intent/route.ts` :**
- Export `POST` (Next.js App Router route handler)
- Proteger par session Auth.js
- JSON body parsing, appel service, retour JSON

**Mutation tRPC — copier le pattern de `saveBranch` dans `packages/api/src/router/profile.ts` :**
- `protectedProcedure.input(schema).mutation()`
- Update `userProfiles` avec `.set()` + `where(eq(userProfiles.userId, ctx.session.user.id))`
- Retour `{ success: true }`

**Composant UI — copier le pattern des composants dans `apps/web/src/app/(mobile)/onboarding/_components/` :**
- Composants shadcn/ui (pas de styles inline ou CSS custom)
- Tailwind uniquement
- Pattern `onComplete` callback vers le parent
- `loading` prop pour l'etat de soumission

### Modele LLM

Modele par defaut : `gemini-2.5-flash-lite` (deja dans `MODEL_CONFIG` de `intent-analyzer.ts`).
Pricing : input $0.075/1M, output $0.30/1M — cout negligeable pour 10-15 titres.

Note : la spec originale mentionne "Gemini Flash-Lite 2.5" mais le code existant utilise l'identifiant `gemini-2.5-flash-lite`. Utiliser cet identifiant.

### Parametres d'entree par branche

Les parametres sont extraits de :
- `userProfiles.currentTitle` → `current_job_title`
- `userProfiles.experienceYears` → derive `current_seniority_level` (junior < 3, mid 3-7, senior > 7)
- `userProfiles.calibrationAnswers` → contient les reponses specifiques par branche :
  - Branche 2 : `responsibilityTypes` (array de strings)
  - Branche 3 : `pivotJobs` (array), `salaryDropTolerance` (enum)
  - Branche 4 : `acceptedLevel` (enum)
  - Branche 5 : `contractType`, `studyField`
- `userProfiles.educationLevel` → `education_level` (branche 5)

Attention : `calibrationAnswers` est un JSONB non type en DB. Le mapping vers les schemas Zod par branche est dans `packages/validators/src/onboarding.ts` (`calibrationByBranchSchemas`).

### Format de sortie JSON LLM

```json
{
  "titles": [
    { "fr": "Developpeur fullstack", "en": "Fullstack Developer" },
    { "fr": null, "en": "DevOps Engineer" },
    { "fr": "Developpeur back-end", "en": null }
  ]
}
```

### Structure de stockage DB

Nouvelle colonne `search_titles` (JSONB) dans `user_profiles` :
```json
{
  "generated_at": "2026-04-11T14:32:00Z",
  "branch_used": "2",
  "titles": [
    { "fr": "Tech Lead", "en": "Tech Lead", "active": true },
    { "fr": "Lead Developer", "en": "Lead Developer", "active": false }
  ]
}
```

### Integration dans le flow onboarding

Le flow actuel dans `page.tsx` :
```
STEPS = ["upload", "review", "freetext", "intent", "calibration", "common"]
```

Devient :
```
STEPS = ["upload", "review", "freetext", "intent", "calibration", "common", "titles"]
```

Apres `handleCommonComplete` :
1. Sauvegarder les preferences (existant)
2. Appeler `/api/generate-titles` avec les params de la branche
3. Afficher `TitleValidation` avec les titres retournes
4. Au clic "Lancer la recherche" : sauvegarder via `saveSearchTitles`, puis `router.push("/feed")`

### Principes UX

- **Pas de friction** : 3 interactions uniquement (decocher, ajouter, lancer)
- **Pas de machinerie exposee** : l'utilisateur ne voit pas qu'un LLM a genere la liste. Formulation : "Voici les postes que je vais chercher pour toi"
- **Transparence sans verbosite** : l'utilisateur voit ce qui va etre fait, sans surcharge technique

### ECART SCHEMA A CORRIGER (Tache 11)

Le prompt branche 3 utilise `training_willingness` (3 valeurs : `self_learning`, `employer_paid`, `none`) mais le schema actuel `branch3CalibrationSchema` ne contient que `pivotJobs` et `salaryDropTolerance`. Il manque ce champ.

De plus, les valeurs de `salaryDropTolerance` dans le schema Zod (`"none" | "up_to_10" | "up_to_20" | "more_than_20"`) different des labels dans le prompt (`"up_to_10_percent"` etc.). Le service `title-generator.ts` doit mapper les valeurs DB vers les labels prompt :
- `"up_to_10"` → `"up_to_10_percent"`
- `"up_to_20"` → `"up_to_20_percent"`
- `"more_than_20"` → `"not_priority"`

### Decisions techniques prompts

| Element | Choix | Justification |
|---|---|---|
| Langue des prompts | Anglais | Les LLM performent mieux en anglais sur l'instruction-following, tout en produisant du FR/EN en sortie |
| Temperature | 0.3 | Assez bas pour coherence, pas zero pour garder de la variete |
| Max output tokens | 2000 | Largement suffisant pour 15 titres |
| Exemples few-shot | 2 par prompt | Un cas standard + un cas tordu pour ancrer le comportement |
| Separation prompts | System (stable) + User (dynamique) | Permet le cache systeme cote API si besoin futur |

### Contenu des prompts LLM

Les prompts ci-dessous sont FINAUX et doivent etre integres tels quels dans `title-generator.ts`.

#### System prompt commun (identique pour les 5 branches)

```
You are a job title generator for JobFindeer, a French job search assistant. Your role is to produce lists of job titles that will be used as search queries on French job boards (France Travail, Welcome to the Jungle, HelloWork, Indeed FR, LinkedIn).

## Your output

You MUST return a valid JSON object with the following structure:

{
  "titles": [
    { "fr": "string or null", "en": "string or null" },
    ...
  ]
}

## Strict rules

1. Return ONLY valid JSON. No markdown, no code fences, no explanatory text before or after.
2. Each title entry must have both "fr" and "en" fields. One of them MAY be null if the title only exists in one language on the French market.
3. Generate between 10 and 15 titles per request. Fewer is acceptable if the job is very niche. Never generate more than 18.
4. Only return titles that are ACTUALLY used on French job listings. Do NOT invent creative or unusual titles.
5. Order the list by relevance, most relevant first.
6. Do NOT include the company name, seniority qualifier, or location in the titles unless explicitly requested.
7. For tech, marketing, data, finance, consulting, and startup roles: ALWAYS include English equivalents, as they are dominant on the French market.
8. For trades, hospitality, retail, healthcare, administration, and public sector roles: French titles are usually sufficient, English equivalents are optional.
9. Avoid overly generic titles like "employe", "collaborateur", "salarie", or "staff member".
10. Respect the seniority level requested. If "senior" is requested, do not return junior titles.

## Quality bar

Imagine you are a recruiter who has seen thousands of French job ads. Your list should feel natural, realistic, and comprehensive. A candidate looking at this list should recognize every title as something they have seen on real job postings.
```

#### Prompt branche 1 — Meme type de poste, en mieux

```
## Task

Generate job title variants for a candidate who wants to STAY in their current type of role but find a better opportunity. The candidate is satisfied with their profession and wants to explore lateral moves with equivalent seniority.

## Candidate input

- Current job title: {{current_job_title}}
- Current seniority level: {{current_seniority_level}}

## Instructions specific to this case

- Generate variants and synonyms of the current job title, at the SAME seniority level.
- Include common French formulations AND English equivalents when the role is typically bilingual on the French market.
- Cover different naming conventions that recruiters use for the same role.
- Do NOT escalate to management or senior variants unless the current level is already there.
- Do NOT propose adjacent or pivot roles. Stay within the same job family.

## Example 1

Input: current_job_title="Developpeur fullstack", current_seniority_level="senior"
Expected output:
{
  "titles": [
    { "fr": "Developpeur fullstack senior", "en": "Senior Fullstack Developer" },
    { "fr": "Developpeur full-stack", "en": "Fullstack Engineer" },
    { "fr": "Ingenieur logiciel", "en": "Senior Software Engineer" },
    { "fr": "Developpeur web senior", "en": "Senior Web Developer" },
    { "fr": null, "en": "Senior Software Developer" },
    { "fr": "Developpeur back-end et front-end", "en": "Full Stack Developer" },
    { "fr": "Developpeur applicatif senior", "en": null },
    { "fr": "Ingenieur developpement logiciel", "en": "Software Development Engineer" },
    { "fr": null, "en": "Senior Web Engineer" },
    { "fr": "Developpeur confirme", "en": null }
  ]
}

## Example 2

Input: current_job_title="Serveur en restaurant", current_seniority_level="2 years experience"
Expected output:
{
  "titles": [
    { "fr": "Serveur", "en": null },
    { "fr": "Serveuse", "en": null },
    { "fr": "Serveur de restaurant", "en": null },
    { "fr": "Serveur confirme", "en": null },
    { "fr": "Serveur en salle", "en": null },
    { "fr": "Employe polyvalent de restauration", "en": null },
    { "fr": "Commis de salle", "en": null },
    { "fr": "Runner", "en": "Food Runner" },
    { "fr": "Serveur brasserie", "en": null },
    { "fr": "Serveur restaurant traditionnel", "en": null }
  ]
}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.
```

#### Prompt branche 2 — Monter en responsabilites

```
## Task

Generate job title variants for a candidate who wants to PROGRESS VERTICALLY in their current profession. The candidate is staying in the same field but seeking MORE responsibility than their current role.

## Candidate input

- Current job title: {{current_job_title}}
- Current seniority level: {{current_seniority_level}}
- Type of responsibility jump wanted: {{responsibility_jump_type}}

The "responsibility jump type" can be one or more of:
- "first_time_management" -> moving into people management for the first time
- "larger_team" -> managing a bigger team than currently
- "wider_scope" -> broader functional scope, more autonomy, more topics
- "strategic_projects" -> more strategic, visible, high-impact projects
- "hierarchy_title" -> formal promotion to a higher title

## Instructions specific to this case

- Generate titles at the LEVEL ABOVE the current seniority, tailored to the jump type.
- If "first_time_management" or "larger_team": prioritize titles with explicit management component (Team Lead, Manager, Responsable).
- If "wider_scope": prioritize Senior, Staff, Principal, or Expert titles that imply breadth without necessarily managing people.
- If "strategic_projects": prioritize Lead, Architect, Principal, or transversal titles.
- If "hierarchy_title": mix all of the above, prioritizing titles that are clearly one notch above the current level.
- If multiple jump types are selected, generate a mix that covers all of them.
- Do NOT generate titles that are at the same level as the current role.
- Do NOT skip more than one level up (a junior should not be offered Director roles).

## Example 1

Input: current_job_title="Developpeur senior", current_seniority_level="senior", responsibility_jump_type=["first_time_management"]
Expected output:
{
  "titles": [
    { "fr": "Tech Lead", "en": "Tech Lead" },
    { "fr": "Chef d'equipe developpement", "en": "Team Lead" },
    { "fr": "Lead developpeur", "en": "Lead Developer" },
    { "fr": "Responsable technique", "en": "Engineering Manager" },
    { "fr": "Chef de projet technique", "en": "Technical Team Lead" },
    { "fr": "Responsable d'equipe developpement", "en": "Development Team Lead" },
    { "fr": null, "en": "Lead Software Engineer" },
    { "fr": "Manager developpement", "en": "Software Engineering Manager" },
    { "fr": "Responsable pole developpement", "en": null },
    { "fr": null, "en": "Engineering Team Lead" }
  ]
}

## Example 2

Input: current_job_title="Commercial B2B", current_seniority_level="confirme", responsibility_jump_type=["wider_scope", "strategic_projects"]
Expected output:
{
  "titles": [
    { "fr": "Responsable grands comptes", "en": "Key Account Manager" },
    { "fr": "Charge de grands comptes", "en": "Strategic Account Manager" },
    { "fr": "Business Developer senior", "en": "Senior Business Developer" },
    { "fr": "Responsable developpement commercial", "en": "Business Development Manager" },
    { "fr": "Account Executive senior", "en": "Senior Account Executive" },
    { "fr": "Responsable comptes strategiques", "en": "Strategic Account Executive" },
    { "fr": "Charge d'affaires senior", "en": null },
    { "fr": "Ingenieur commercial grands comptes", "en": "Enterprise Sales Manager" },
    { "fr": null, "en": "Senior Account Manager" },
    { "fr": "Chef de secteur grands comptes", "en": null }
  ]
}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.
```

#### Prompt branche 3 — Pivot metier

```
## Task

Generate job title variants for a candidate who wants to CHANGE PROFESSION while staying in the same sector. The candidate has declared target jobs they are interested in pivoting to.

## Candidate input

- Current job title: {{current_job_title}}
- Target jobs (user-provided): {{target_jobs}}
- Salary drop tolerance: {{salary_drop_tolerance}}
- Training willingness: {{training_willingness}}

The "salary drop tolerance" can be:
- "none" -> no salary reduction accepted
- "up_to_10_percent" -> up to 10% reduction accepted
- "up_to_20_percent" -> up to 20% reduction accepted
- "not_priority" -> salary is not a priority

The "training willingness" can be:
- "self_learning" -> already self-training
- "employer_paid" -> willing if employer provides training
- "none" -> wants to be hired on existing skills only

## Instructions specific to this case

- For EACH target job in the list, generate titles used on the French market.
- Seniority level rule:
  * If salary_drop_tolerance is "none" AND training_willingness is "none" -> prioritize INTERMEDIATE titles that value prior experience, no pure junior titles.
  * If salary_drop_tolerance allows any drop OR training_willingness is not "none" -> propose a MIX of intermediate AND junior titles to cover both entry points.
- Do not propose titles above the intermediate level.
- Include English equivalents for roles where they are standard on the French market.
- If the candidate provided multiple target jobs, distribute the 10-15 titles roughly evenly across them, slightly favoring the first one.

## Example 1

Input: current_job_title="Developpeur senior", target_jobs=["Product Manager"], salary_drop_tolerance="up_to_10_percent", training_willingness="employer_paid"
Expected output:
{
  "titles": [
    { "fr": "Product Manager", "en": "Product Manager" },
    { "fr": "Product Owner", "en": "Product Owner" },
    { "fr": "Chef de produit", "en": "Product Manager" },
    { "fr": "Technical Product Manager", "en": "Technical Product Manager" },
    { "fr": "Product Manager junior", "en": "Junior Product Manager" },
    { "fr": "Associate Product Manager", "en": "Associate Product Manager" },
    { "fr": "Chef de produit digital", "en": "Digital Product Manager" },
    { "fr": null, "en": "Product Owner Junior" },
    { "fr": "Product Manager B2B", "en": "B2B Product Manager" },
    { "fr": "Responsable produit", "en": null }
  ]
}

## Example 2

Input: current_job_title="Comptable", target_jobs=["Controleur de gestion", "Analyste financier"], salary_drop_tolerance="none", training_willingness="none"
Expected output:
{
  "titles": [
    { "fr": "Controleur de gestion", "en": "Management Controller" },
    { "fr": "Controleur de gestion senior", "en": "Senior Financial Controller" },
    { "fr": "Controleur de gestion confirme", "en": null },
    { "fr": "Responsable controle de gestion", "en": "Controlling Manager" },
    { "fr": "Controleur financier", "en": "Financial Controller" },
    { "fr": "Analyste financier", "en": "Financial Analyst" },
    { "fr": "Analyste financier senior", "en": "Senior Financial Analyst" },
    { "fr": "Charge d'etudes financieres", "en": null },
    { "fr": "Analyste de gestion", "en": "Business Analyst - Finance" },
    { "fr": "Controleur de gestion industriel", "en": null }
  ]
}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.
```

#### Prompt branche 4 — Reconversion complete

```
## Task

Generate job title variants for a candidate in a COMPLETE CAREER CHANGE. The candidate is entering a new profession and their past experience is only partially transferable.

## Candidate input

- Target jobs (user-provided): {{target_jobs}}
- Seniority acceptance: {{seniority_acceptance}}

The "seniority acceptance" can be:
- "junior_only" -> the candidate accepts to restart as a junior
- "intermediate_valorizing_past" -> the candidate wants an intermediate role that values their past experience
- "both" -> the candidate is open to both options

## Instructions specific to this case

- For EACH target job, generate titles adapted to ENTERING the profession.
- If seniority_acceptance is "junior_only": generate ONLY junior, debutant, entry-level, or unqualified-level titles.
- If seniority_acceptance is "intermediate_valorizing_past": generate titles that do NOT require specific experience in the new field but accept career changers, reconversions, or transferable skills.
- If seniority_acceptance is "both": generate a balanced mix (roughly 60% junior, 40% intermediate-reconversion).
- Ignore the candidate's past profession entirely.
- Include English equivalents when standard on the French market.
- Explicitly include titles containing words like "debutant", "junior", "formation assuree", "reconversion bienvenue" when they exist as real listings.

## Example 1

Input: target_jobs=["Developpeur web"], seniority_acceptance="junior_only"
Expected output:
{
  "titles": [
    { "fr": "Developpeur web junior", "en": "Junior Web Developer" },
    { "fr": "Developpeur debutant", "en": "Entry-Level Developer" },
    { "fr": "Developpeur web junior formation assuree", "en": null },
    { "fr": "Developpeur front-end junior", "en": "Junior Frontend Developer" },
    { "fr": "Developpeur back-end junior", "en": "Junior Backend Developer" },
    { "fr": "Developpeur junior reconversion", "en": null },
    { "fr": "Developpeur fullstack junior", "en": "Junior Fullstack Developer" },
    { "fr": "Developpeur HTML/CSS/JavaScript junior", "en": null },
    { "fr": null, "en": "Entry-Level Software Developer" },
    { "fr": "Developpeur web debutant accepte", "en": null }
  ]
}

## Example 2

Input: target_jobs=["Infirmier"], seniority_acceptance="both"
Expected output:
{
  "titles": [
    { "fr": "Infirmier debutant", "en": null },
    { "fr": "Infirmiere diplomee d'Etat", "en": null },
    { "fr": "Infirmier diplome d'Etat", "en": null },
    { "fr": "IDE", "en": null },
    { "fr": "Infirmier junior", "en": null },
    { "fr": "Infirmier en soins generaux", "en": null },
    { "fr": "Infirmier hospitalier", "en": null },
    { "fr": "Infirmiere polyvalente", "en": null },
    { "fr": "Infirmier de nuit", "en": null },
    { "fr": "Infirmier en reconversion", "en": null }
  ]
}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.
```

#### Prompt branche 5 — Debutant / alternance / stage

```
## Task

Generate job title variants for a STUDENT or RECENT GRADUATE looking for an apprenticeship, internship, or first job. The candidate has no significant professional experience and the generation is based on their education level and field of study.

## Candidate input

- Education level: {{education_level}}
- Education field: {{education_field}}
- Contract type: {{contract_type}}

The "contract type" can be:
- "apprenticeship" -> alternance contract
- "internship" -> stage
- "first_job" -> first permanent job / CDI debutant

## Instructions specific to this case

- Generate titles for ENTRY-LEVEL positions typical for a student/graduate of this level and field.
- Adapt the title vocabulary to the contract type:
  * For "apprenticeship": include "en alternance", "apprenti", "alternant" when natural.
  * For "internship": include "stagiaire", "stage", "en stage" when natural.
  * For "first_job": use clean entry-level titles without stage/alternance mentions. Include "junior" or "debutant" when appropriate.
- Match the titles to the education field. A business school graduate should not receive engineering titles, and vice versa.
- Match the titles to the education level. A Bac+2 BTS does not qualify for positions that require Bac+5.
- Include English equivalents when the sector commonly uses them on the French market (tech, marketing, consulting, finance, startups).

## Example 1

Input: education_level="Bac+5", education_field="Ecole de commerce", contract_type="apprenticeship"
Expected output:
{
  "titles": [
    { "fr": "Charge de marketing en alternance", "en": "Marketing Associate Apprentice" },
    { "fr": "Assistant chef de produit en alternance", "en": null },
    { "fr": "Business Developer en alternance", "en": "Business Developer Apprentice" },
    { "fr": "Charge de communication en alternance", "en": null },
    { "fr": "Alternant marketing digital", "en": "Digital Marketing Apprentice" },
    { "fr": "Charge de developpement commercial en alternance", "en": null },
    { "fr": "Assistant chef de projet marketing en alternance", "en": null },
    { "fr": "Alternant controle de gestion", "en": null },
    { "fr": null, "en": "Sales Development Representative Apprentice" },
    { "fr": "Assistant ressources humaines en alternance", "en": "HR Apprentice" }
  ]
}

## Example 2

Input: education_level="Bac+2", education_field="BTS informatique", contract_type="internship"
Expected output:
{
  "titles": [
    { "fr": "Stagiaire developpeur web", "en": null },
    { "fr": "Stage developpeur informatique", "en": null },
    { "fr": "Stagiaire developpeur front-end", "en": null },
    { "fr": "Stagiaire developpeur back-end", "en": null },
    { "fr": "Stage administration systemes", "en": null },
    { "fr": "Stagiaire technicien informatique", "en": null },
    { "fr": "Stage support informatique", "en": null },
    { "fr": "Stagiaire developpement d'applications", "en": null },
    { "fr": "Stage webmaster", "en": null },
    { "fr": "Stagiaire integrateur web", "en": null }
  ]
}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.
```

### Mapping des valeurs calibration → prompt (branche 3)

Le schema Zod `branch3CalibrationSchema` utilise des valeurs courtes, le prompt attend des labels explicites. Mapper dans `extractTitleGenParams` :

| Champ DB (`calibrationAnswers`) | Valeur prompt |
|---|---|
| `salaryDropTolerance: "none"` | `"none"` |
| `salaryDropTolerance: "up_to_10"` | `"up_to_10_percent"` |
| `salaryDropTolerance: "up_to_20"` | `"up_to_20_percent"` |
| `salaryDropTolerance: "more_than_20"` | `"not_priority"` |
| `trainingWillingness: "self_learning"` | `"self_learning"` |
| `trainingWillingness: "employer_paid"` | `"employer_paid"` |
| `trainingWillingness: "none"` | `"none"` |

### Mapping des valeurs calibration → prompt (branche 4)

Le schema Zod `branch4CalibrationSchema` utilise `acceptedLevel`, le prompt attend `seniority_acceptance` :

| Champ DB (`calibrationAnswers.acceptedLevel`) | Valeur prompt |
|---|---|
| `"junior"` | `"junior_only"` |
| `"intermediate"` | `"intermediate_valorizing_past"` |
| `"both"` | `"both"` |

### Mapping des valeurs calibration → prompt (branche 5)

Le schema Zod `branch5CalibrationSchema` utilise `contractType` avec `"alternance" | "stage"`, le prompt attend `"apprenticeship" | "internship" | "first_job"` :

| Champ DB (`calibrationAnswers.contractType`) | Valeur prompt |
|---|---|
| `"alternance"` | `"apprenticeship"` |
| `"stage"` | `"internship"` |

Le champ `first_job` est ajoute au schema branche 5 (Tache 12). Mapping : `"first_job"` → `"first_job"` (identique).

### Ce qui est explicitement HORS PERIMETRE

- Traduction des titres en requetes job boards (couche separee, future story)
- Cache des resultats LLM
- Normalisation des entrees
- Filtrage post-generation
- Metriques de performance (instrumentation future)
- Internationalisation (marche FR uniquement)

### Project Structure Notes

Fichiers a creer :
- `apps/web/src/lib/title-generator.ts` — service LLM (a cote de `intent-analyzer.ts`)
- `apps/web/src/app/api/generate-titles/route.ts` — route API
- `apps/web/src/app/(mobile)/onboarding/_components/TitleValidation.tsx` — composant validation

Fichiers a modifier :
- `packages/db/src/schema/profile.ts` — ajout colonne `search_titles`
- `packages/validators/src/onboarding.ts` — ajout schemas Zod titres
- `packages/api/src/router/profile.ts` — ajout mutation `saveSearchTitles`
- `apps/web/src/app/(mobile)/onboarding/page.tsx` — ajout etape "titles" dans STEPS + handlers
- `apps/web/src/app/(desktop)/settings/page.tsx` — section regeneration titres

### References

- [Source: apps/web/src/lib/intent-analyzer.ts] — pattern LLM complet (generateText, google, MODEL_CONFIG, metrics, JSON cleanup)
- [Source: packages/validators/src/onboarding.ts] — branchEnum, calibrationByBranchSchemas, intentAnalysisOutputSchema
- [Source: packages/db/src/schema/profile.ts] — schema userProfiles (branch, calibrationAnswers, currentTitle, educationLevel)
- [Source: packages/api/src/router/profile.ts] — pattern saveBranch (protectedProcedure, upsert userProfiles)
- [Source: apps/web/src/app/(mobile)/onboarding/page.tsx] — flow STEPS, handlers, integration composants
- [Source: apps/web/src/app/api/intent/route.ts] — pattern route API (POST, session, JSON)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- TypeCheck : 2 erreurs corrigees (`maxTokens` → `maxOutputTokens` dans AI SDK v6, cast `Boolean()` pour ReactNode dans settings)
- 3 erreurs TS pre-existantes non liees a cette story (stripe module manquant, branch type narrowing dans handleIntentCorrect)

### Completion Notes List

- Tache 1 : colonne `search_titles` JSONB ajoutee a `user_profiles`, migration Drizzle 0003 generee et appliquee
- Tache 2 : 4 schemas Zod ajoutes dans `packages/validators/src/onboarding.ts` (searchTitleSchema, searchTitleWithActiveSchema, searchTitlesDataSchema, llmTitleOutputSchema)
- Tache 3 : service `title-generator.ts` cree avec system prompt commun + 5 user prompts par branche, retry+fallback, metriques
- Tache 4 : route API POST `/api/generate-titles` avec validation discriminatedUnion par branche
- Tache 5 : mutation tRPC `saveSearchTitles` dans profile router
- Tache 6 : composant `TitleValidation.tsx` — lignes cochables, ajout titre, bouton lancer
- Tache 7 : etape "titles" integree dans le flow onboarding (7eme step), generation LLM apres common, sauvegarde avant /feed
- Tache 8 : section "Titres de recherche" dans settings desktop avec regeneration inline
- Tache 9 : bandeau d'alerte dans settings si branche profil != branche titres generes
- Tache 10 : fonctions `buildTitleGenParams` et `buildSettingsParams` avec mapping complet DB → prompt pour les 5 branches
- Tache 11 : champ `trainingWillingness` ajoute au schema branche 3 + question radio dans BranchCalibration
- Tache 12 : option `first_job` ajoutee au schema branche 5 + option "Premier emploi / CDI" dans BranchCalibration

### File List

Fichiers crees :
- `apps/web/src/lib/title-generator.ts`
- `apps/web/src/app/api/generate-titles/route.ts`
- `apps/web/src/app/(mobile)/onboarding/_components/TitleValidation.tsx`
- `packages/db/drizzle/0003_freezing_invaders.sql`

Fichiers modifies :
- `packages/db/src/schema/profile.ts` — ajout colonne searchTitles
- `packages/validators/src/onboarding.ts` — schemas titres + trainingWillingness branche 3 + first_job branche 5
- `packages/api/src/router/profile.ts` — mutation saveSearchTitles
- `apps/web/src/app/(mobile)/onboarding/page.tsx` — etape titles, handlers generation/sauvegarde
- `apps/web/src/app/(mobile)/onboarding/_components/BranchCalibration.tsx` — question training branche 3, option first_job branche 5
- `apps/web/src/app/(desktop)/settings/page.tsx` — section titres + alerte regeneration
