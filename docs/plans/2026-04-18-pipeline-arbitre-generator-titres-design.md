# Design — Pipeline Arbitre + Generator pour la génération de titres (V1)

**Date** : 2026-04-18
**Auteur** : alexandreTIMAL
**Statut** : Design validé, prêt pour plan d'implémentation

## Contexte

La génération actuelle de titres de poste (`apps/web/src/lib/title-generator.ts`, 5 branches d'intention, un seul appel LLM) produit des titres peu adaptés en V1. Aucun mécanisme ne confronte les attentes déclarées par le candidat à la réalité de son CV : un candidat de 2 ans d'expérience qui demande "Directeur" obtient ce qu'il demande.

Ce design repense l'architecture pour une V1 robuste, structurée comme un **outil de debug dev** (pas une UX utilisateur final). Objectif : voir ce que le LLM produit étape par étape pour itérer sur les prompts.

Inspirée du document interne "Méthode Safe & Stretch", mais adaptée à une sortie ordinale 4 niveaux (plus honnête techniquement qu'un score 0-100 pseudo-calibré).

## Principes directeurs

1. **Pipeline à 2 appels LLM atomiques** : un Arbitre qui calibre la réalité, un Generator qui produit les titres calibrés.
2. **Tout est retourné et visible** pour le debug (titres sous-qualifiés inclus, analyse Arbitre, metrics détaillées par étape).
3. **Échelle ordinale 4 niveaux** (`aligné` / `évolution_modérée` / `stretch_ambitieux` / `sous-qualifié`) — pas de score numérique affiché (LLM mauvais en calibration absolue).
4. **Modèle unique** `gemini-3.1-flash-lite-preview` pour les deux appels (cohérence projet, coût minimal, bascule facile vers un modèle supérieur sur l'Arbitre si besoin).
5. **Tous les prompts centralisés dans `apps/web/src/lib/prompts/`** conformément à `CLAUDE.md`.

## Décisions de cadrage (trace)

| # | Décision |
|---|---|
| Intention V1 | Repenser l'architecture dès le départ, pas patcher |
| Architecture | Pipeline à 2 appels LLM (Arbitre puis Generator) |
| Input Arbitre | `current_title`, `experience_years`, `education_level`, `work_history` extraits du CV |
| Visibilité | Tout retourné pour debug dev (pas UX user final en V1) |
| Catégorisation | `classic_fr` / `anglo_startup` / `hard_skill` exposée côté Generator uniquement |
| `mots_cles_recherche` | Skip en V1 (à réévaluer quand scraper aura des métriques de recall) |
| Échelle ordinale | 4 niveaux, sémantique remappée sur branches 4-5 |
| Cap titres | 30 (safety technique, pas décision produit) |
| Modèle | `gemini-3.1-flash-lite-preview` sur les deux appels |
| Plumbing CV | Client repasse `cv_profile` dans le body (migration DB en V2) |
| Tests integration LLM | Skip en V1 (ajoutés en V2 avec golden set) |

## Architecture globale

```
[Onboarding finished]
    │ (branch_params, cv_profile)
    ▼
┌───────────────────────────┐
│  generateTitles(          │
│    branch_params,         │
│    cv_profile             │
│  )                        │
└────────────┬──────────────┘
             │
             ▼
      ┌──────────────┐   1er appel LLM (Gemini 3.1 FL)
      │  Arbitre     │   → ArbitreOutput JSON
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐   2ème appel LLM (Gemini 3.1 FL)
      │  Generator   │   → titres ordinaux + catégorisés
      └──────┬───────┘
             │
             ▼
       TitleGenResult
       { arbitre, titles, metrics }
```

### Fichiers impactés

| Fichier | Action |
|---|---|
| `apps/web/src/lib/prompts/title-arbitre.ts` | **Nouveau** — prompt Arbitre (1 seul, générique) |
| `apps/web/src/lib/prompts/title-generation.ts` | **Refactor** — system prompt + 5 builders intègrent `arbitre` en input, ordinal + category en output |
| `apps/web/src/lib/prompts/index.ts` | Barrel : exporter `TITLE_ARBITRE_SYSTEM_PROMPT` + `buildArbitrePrompt` |
| `apps/web/src/lib/title-generator.ts` | **Refactor** — orchestrer 2 appels, accepter `cv_profile`, agréger metrics |
| `packages/validators/src/...` | `arbitreOutputSchema` + refactor `llmTitleOutputSchema` |
| `apps/web/src/app/api/generate-titles/route.ts` | Valider `cv_profile` dans le body |

## Contrats de données

### `CvProfileForArbitre`

```ts
interface CvProfileForArbitre {
  current_title: string | null;
  experience_years: number;
  education_level: string | null;
  work_history: Array<{
    title: string;
    start: string; // YYYY ou MM/YYYY
    end: string;   // YYYY, MM/YYYY ou "Present"
  }>;
}
```

### `ArbitreOutput`

```ts
interface ArbitreOutput {
  analyse_realite: string;          // 10-500 chars, pédagogique
  niveau_cible_effectif:
    | "junior" | "confirmé" | "senior"
    | "lead" | "manager" | "director";
  gap_detected:
    | "none"
    | "mild_downgrade"    // attentes 1 cran trop hautes
    | "strong_downgrade"  // attentes 2+ crans trop hautes
    | "mild_upgrade"      // CV sous-vend
    | "strong_upgrade";
  rationale_debug: string;          // debug-only
}
```

### `SearchTitle` refactoré

```ts
interface SearchTitle {
  fr: string | null;
  en: string | null;
  niveau_ordinal:
    | "aligné" | "évolution_modérée"
    | "stretch_ambitieux" | "sous-qualifié";
  category:
    | "classic_fr" | "anglo_startup" | "hard_skill";
}
```

### `TitleGenResult`

```ts
interface TitleGenResult {
  arbitre: ArbitreOutput;
  titles: SearchTitle[];              // max 30, au moins 1
  metrics: {
    arbitre: TitleGenMetrics & { fallback: boolean };
    generator: TitleGenMetrics & { fallback: boolean };
    total_cost_usd: number;
    total_duration_ms: number;
  };
}
```

## Prompt Arbitre

- **Fichier** : `apps/web/src/lib/prompts/title-arbitre.ts`
- **System prompt** : rôle de recruteur senior, règles de confrontation CV ↔ attentes, format JSON strict, anti-injection `<user_input>`, **3 few-shot examples** couvrant `strong_downgrade` / `none` / `mild_upgrade`.
- **User prompt builder** : `buildArbitrePrompt({ cv_profile, branch_params, user_expectations }, helpers)` — interpole les champs sanitisés, pas d'I/O, pas d'appel LLM.
- **Ton** : pédagogique, pas condescendant (préparation V2 où `analyse_realite` sera affichée utilisateur).
- **Signal `education_level`** utilisé pour raffiner le niveau (Bac+5 → junior cadre plus facile).
- **Dimensionnement** : ~1000 tokens input, ~250 output, coût ~0.00015 $, latence 1.5-2.5s.

## Prompt Generator

- **Fichier** : `apps/web/src/lib/prompts/title-generation.ts` (refactor)
- **System prompt** ajoute :
  - Contrainte `niveau_ordinal` avec définitions des 4 valeurs (référence au `niveau_cible_effectif` reçu de l'Arbitre).
  - Contrainte `category` avec 3 valeurs + 1 exemple chacune.
  - Injection bloc "Arbitre de réalité" dans chaque user prompt de branche.
  - Distribution suggérée : ~15 aligné / ~8 évolution / ~3 stretch / ~2 sous-qualifié (adaptable par métier).
  - Règle dure : si `gap_detected ∈ {strong_downgrade, strong_upgrade}`, ignorer totalement les attentes brutes et se baser sur `niveau_cible_effectif`.
- **5 builders de branche** gardent leur logique d'intention mais :
  - Reçoivent `arbitre: ArbitreOutput` en nouveau paramètre.
  - Injectent un bloc "Arbitre de réalité" dans le user prompt.
  - Few-shot examples mis à jour pour tagger chaque titre exemple avec ordinal + category.
- **Branches 4-5** : sémantique ordinale remappée (aligné = titres débutants/reconvertis explicites, évolution_modérée = intermédiaires tolérants, stretch_ambitieux rare, sous-qualifié quasi-vide).
- **Cap 30** dans le prompt (consigne) **ET** dans le refinement Zod (enforcement).
- **Dimensionnement** : ~1500 tokens input, ~750 output, coût ~0.00034 $, latence 2.5-4s.

## Plumbing CV

**Option retenue pour V1** : le client repasse `cv_profile` dans le body de `/api/generate-titles`. L'upload route reste inchangée (retourne le profil au client sans le persister).

### Modifications route

```ts
const cvProfileSchema = z.object({
  current_title: z.string().max(200).nullable(),
  experience_years: z.number().int().min(0).max(70),
  education_level: z.string().max(100).nullable(),
  work_history: z
    .array(z.object({
      title: z.string().max(200),
      start: z.string().max(20),
      end: z.string().max(20),
    }))
    .max(20),
});

const requestSchema = z.object({
  params: z.discriminatedUnion("branch", [/* ... */]),
  cv_profile: cvProfileSchema, // REQUIS
  model: z.enum(AVAILABLE_MODEL_IDS).optional(),
});
```

**À migrer en V2 (prod user)** : persister `cv_profile` server-side à l'upload, relire via `session.user.id` → plus de trust client.

## Gestion d'erreurs

| Étape | Échec | Stratégie |
|---|---|---|
| Arbitre LLM (réseau, 429, 5xx) | Retry 1× avec backoff 300-700ms |
| Arbitre JSON / Zod invalide | Retry 1× puis `buildArbitreFallback` déterministe |
| Generator LLM (réseau, 429, 5xx) | Retry 1× |
| Generator JSON / Zod invalide | Retry 1× puis `buildFallbackTitles` (existant, enrichi avec ordinal + category par défaut) |

### Fallback Arbitre — heuristique déterministe

```ts
function buildArbitreFallback(cv_profile): ArbitreOutput {
  const y = cv_profile.experience_years;
  const niveau =
    y < 2  ? "junior"
    : y < 5  ? "confirmé"
    : y < 10 ? "senior"
    : "lead";
  return {
    analyse_realite: "Calibration automatique basée sur ton expérience (mode dégradé).",
    niveau_cible_effectif: niveau,
    gap_detected: "none",
    rationale_debug: "FALLBACK: Arbitre LLM indisponible, niveau estimé depuis experience_years",
  };
}
```

### Timeouts

- Arbitre : 12 000 ms (output court)
- Generator : 20 000 ms (existant, output plus long)

### Rate limiting

Inchangé : 10 req/min par user sur `/api/generate-titles`.

## Stratégie de test

### Unit prompts (pur, sans LLM)

- `buildArbitrePrompt` : sanitisation, interpolation, snapshot.
- `buildBranchNPrompt` (1-5) : sanitisation, interpolation du bloc Arbitre, snapshot.
- Fichiers : `apps/web/src/lib/prompts/__tests__/title-arbitre.test.ts` + `title-generation.test.ts`.

### Unit schemas

`arbitreOutputSchema` + `llmTitleOutputSchema` refactoré :
- Accepter JSON valide complet.
- Rejeter champs manquants, enums hors valeurs, tableaux > 30.
- Rejeter `fr=null ET en=null`.
- Rejeter `analyse_realite` > 500 chars.

### Unit orchestration (LLM mocké)

`title-generator.test.ts` :
- Happy path.
- Arbitre fail 2× → fallback, Generator continue.
- Generator fail 2× → fallback titres.
- Les deux fail → résultat toujours valide.
- Timeout + retry sur 429.

### Hors scope V1

- Tests integration LLM (golden set) → V2.
- Tests UI (pas d'UI user en V1).
- Tests de charge.

## Coûts et performance

| | Par appel | Par génération |
|---|---|---|
| Arbitre | ~0.00015 $ | |
| Generator | ~0.00034 $ | |
| **Total** | | **~0.0005 $** |
| **Latence** | | **4-6 s séquentiel** |

Latence acceptable : étape finale d'onboarding, asynchrone, rare par utilisateur.

## Risques et mitigations

| Risque | Mitigation |
|---|---|
| Gemini 3.1 FL sous-calibre le niveau Arbitre sur des CV atypiques | Few-shot examples ancrés ; option d'upgrade sur `gemini-3.1-pro-preview` pour Arbitre uniquement (1 ligne de config) |
| JSON invalide sur prompts plus longs | `responseMimeType: "application/json"` déjà en place + retry + fallback déterministe |
| Client tampering de `cv_profile` (body HTTP) | Accepté en V1 debug ; migration DB en V2 |
| LLM produit des titres inventés | Règle explicite dans system prompt (héritée de l'existant) ; validation manuelle via UI debug |

## Prochaine étape

Invoquer `superpowers:writing-plans` pour produire le plan d'implémentation détaillé, avec découpage en étapes testables et vérifiables.
