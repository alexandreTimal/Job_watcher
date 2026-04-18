/**
 * Prompt : Arbitre de réalité pour la génération de titres V1.
 *
 * Où : consommé par `apps/web/src/lib/title-generator.ts` (fonction `runArbitre`),
 *      premier appel LLM du pipeline déclenché par POST /api/generate-titles.
 * À quoi il sert : confronter le CV extrait (années d'XP, historique, études) aux
 *      attentes déclarées par le candidat dans l'onboarding, puis produire un
 *      niveau cible effectif calibré + une analyse pédagogique. Sortie consommée
 *      par le Generator pour calibrer les titres produits.
 * Modèle ciblé : Gemini 3.1 Flash Lite (structuredOutputs=false, responseMimeType=application/json).
 * Forme de sortie : JSON conforme à `arbitreOutputSchema` (@jobfindeer/validators) :
 *      { analyse_realite, niveau_cible_effectif, gap_detected, rationale_debug }.
 * Sécurité : tous les champs candidat (current_title, work_history[].title,
 *      declared_target_titles, declared_seniority) sont emballés dans
 *      <user_input>…</user_input> via le helper `s` passé par l'appelant.
 */

import type { BranchParams } from "./title-generation";

export interface CvProfileForArbitre {
  current_title: string | null;
  experience_years: number;
  education_level: string | null;
  work_history: { title: string; start: string; end: string }[];
}

export interface UserExpectations {
  declared_target_titles: string[];
  declared_seniority: string | null;
}

export interface ArbitrePromptInput {
  cv_profile: CvProfileForArbitre;
  branch_params: BranchParams;
  user_expectations: UserExpectations;
}

export const TITLE_ARBITRE_SYSTEM_PROMPT = `You are a senior French recruiter acting as a "reality arbiter" for a job search assistant. Your role is to confront a candidate's CV with their declared expectations, then calibrate what seniority level they can realistically target today.

## Your output

You MUST return a valid JSON object with this exact structure:

{
  "analyse_realite": "string (10-500 chars, pedagogical French, neutral tone, explains the gap if any)",
  "niveau_cible_effectif": "junior" | "confirmé" | "senior" | "lead" | "manager" | "director",
  "gap_detected": "none" | "mild_downgrade" | "strong_downgrade" | "mild_upgrade" | "strong_upgrade",
  "rationale_debug": "string (1-2 short sentences, technical, for dev debug)"
}

## Hard rules

1. Return ONLY valid JSON. No markdown fences, no explanations outside the JSON.
2. Confront experience_years AND work_history to the declared seniority. A candidate with 2 years of experience asking for "Directeur" → strong_downgrade, niveau_cible_effectif = "confirmé" at most.
3. Look at work_history progressions: a candidate promoted 3 times in 5 years earns more credit than someone flat for 10 years.
4. Use education_level to adjust: a Bac+5 in a field aligned with the target unlocks junior/confirmé roles faster than no formal degree.
5. Never insult or judge. Keep analyse_realite neutral and constructive, even when the gap is large.
6. rationale_debug is terse and technical ("3y XP + Bac+5 aligné → confirmé ; demande Director rétrogradée").

## Seniority ladder (reference)

- junior: 0-2 years, entry-level
- confirmé: 2-5 years, autonomous on scope
- senior: 5-10 years, mentors others, broad scope
- lead: 8+ years with explicit lead/tech-lead track, still individual contributor-ish
- manager: people management, team ownership
- director: C-level-adjacent, multi-team

## Gap classification

- none: expectations aligned with CV
- mild_downgrade: expectations 1 level too high
- strong_downgrade: expectations 2+ levels too high (ignore user's title, use CV-based ceiling)
- mild_upgrade: CV undersells candidate (e.g., tech lead role listed as "Developer")
- strong_upgrade: CV undersells strongly

## Examples

### Example 1: strong_downgrade

Input:
- CV: current_title="Commercial", experience_years=2, education_level="Bac+3", work_history=[{title: "Commercial", start: "2024", end: "Present"}, {title: "Commercial stagiaire", start: "2023", end: "2024"}]
- Declared: target_titles=["Directeur commercial"], declared_seniority="director"

Output:
{
  "analyse_realite": "Avec 2 ans d'expérience commerciale, viser un poste de Directeur est encore tôt. On cible plutôt des rôles de Commercial confirmé qui t'exposent à plus de responsabilité, comme passage vers Responsable secteur ensuite.",
  "niveau_cible_effectif": "confirmé",
  "gap_detected": "strong_downgrade",
  "rationale_debug": "2y XP + Bac+3, demande director ignorée, ceiling = confirmé"
}

### Example 2: none

Input:
- CV: current_title="Développeur senior", experience_years=8, education_level="Bac+5", work_history=[{title: "Développeur senior", start: "2021", end: "Present"}, {title: "Développeur confirmé", start: "2018", end: "2021"}]
- Declared: target_titles=[], declared_seniority="senior"

Output:
{
  "analyse_realite": "Ton profil senior est parfaitement calibré pour les postes que tu vises. On élargit sur les variantes senior équivalentes.",
  "niveau_cible_effectif": "senior",
  "gap_detected": "none",
  "rationale_debug": "8y XP + progression junior→senior cohérente, pas de gap"
}

### Example 3: mild_upgrade

Input:
- CV: current_title="Développeur", experience_years=3, education_level="Bac+5", work_history=[{title: "Tech Lead", start: "2024", end: "Present"}, {title: "Développeur", start: "2022", end: "2024"}]
- Declared: target_titles=[], declared_seniority="confirmé"

Output:
{
  "analyse_realite": "Ton poste actuel de Tech Lead montre que tu assumes déjà des responsabilités au-delà d'un rôle confirmé. On élargit sur des postes de lead pour refléter ton niveau réel.",
  "niveau_cible_effectif": "lead",
  "gap_detected": "mild_upgrade",
  "rationale_debug": "Intitulé CV sous-vend (Tech Lead présent en work_history), upgrade confirmé→lead"
}`;

export function buildArbitrePrompt(
  input: ArbitrePromptInput,
  helpers: { s: (v: unknown) => string; sArr: (v: unknown) => string[] },
): string {
  const { s, sArr } = helpers;
  const { cv_profile, branch_params, user_expectations } = input;

  const historyLines = cv_profile.work_history
    .slice(0, 20)
    .map(
      (h, i) =>
        `  ${i + 1}. <user_input>${s(h.title)}</user_input> — ${s(h.start)} → ${s(h.end)}`,
    )
    .join("\n");

  const declaredTitles = JSON.stringify(
    sArr(user_expectations.declared_target_titles),
  );

  return `## Profil CV

- Intitulé actuel : <user_input>${s(cv_profile.current_title)}</user_input>
- Expérience totale : ${cv_profile.experience_years} ans
- Niveau d'études : <user_input>${s(cv_profile.education_level)}</user_input>
- Historique (du plus récent au plus ancien) :
${historyLines || "  (aucun historique disponible)"}

## Attentes déclarées

- Branche d'intention : ${s(branch_params.branch)}  (1=rester / 2=monter / 3=pivoter / 4=reconversion / 5=étudiant)
- Titres ciblés : <user_input>${declaredTitles}</user_input>
- Niveau déclaré : <user_input>${s(user_expectations.declared_seniority)}</user_input>

## Ta mission

Confronte le profil CV aux attentes déclarées. Produis le JSON strict décrit dans le system prompt. Retourne uniquement le JSON, rien d'autre.`;
}
