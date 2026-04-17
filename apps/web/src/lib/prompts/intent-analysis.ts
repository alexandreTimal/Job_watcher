/**
 * Prompt: analyse d'intention du texte libre d'onboarding.
 *
 * Où : consommé par `apps/web/src/lib/intent-analyzer.ts` (fonction `analyzeIntent`),
 *      déclenchée par la route POST /api/intent pendant l'onboarding mobile.
 * À quoi il sert : classer le récit libre du candidat dans une des 5 branches
 *      d'intention (même poste / évolution / changement métier / reconversion / alternance-stage),
 *      avec score de confiance et signaux (contraintes, tonalité, mots-clés)
 *      pour router ensuite vers le bon formulaire de calibration.
 * Modèle ciblé : Gemini 2.5 Flash (structuredOutputs=false, responseMimeType=application/json).
 * Forme de sortie : JSON conforme à `intentSchema` dans intent-analyzer.ts
 *      { branch, confidence, summary, signals:{constraints,tone,keywords} }.
 */

/** Description des 5 branches injectée dans le prompt d'analyse d'intention. */
export const INTENT_BRANCHES_DESCRIPTION = `
Branche 1 — Même poste, en mieux : cherche un poste similaire mais avec de meilleures conditions (salaire, télétravail, management, environnement).
Branche 2 — Monter en responsabilités : veut évoluer vers plus de responsabilités, management, lead technique, etc.
Branche 3 — Changer de métier : souhaite pivoter vers un autre métier tout en valorisant son expérience.
Branche 4 — Reconversion : en reconversion profonde, change complètement de domaine.
Branche 5 — Alternance/Stage : étudiant ou en formation, cherche un contrat en alternance ou un stage.
`;

export function buildIntentAnalysisPrompt(params: {
  freeText: string;
  profileContext: string;
}): string {
  return `Tu es un conseiller emploi bienveillant. Analyse le texte libre d'un candidat et classe-le dans une des 5 branches d'intention.

${INTENT_BRANCHES_DESCRIPTION}

${params.profileContext}

Texte du candidat :
"${params.freeText}"

Retourne un JSON avec :
- "branch": "1"|"2"|"3"|"4"|"5"
- "confidence": nombre entre 0 et 1
- "summary": reformulation empathique en 1-2 phrases
- "signals": { "constraints": [...], "tone": "...", "keywords": [...] }`;
}
