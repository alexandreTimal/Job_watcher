/**
 * Barrel d'export des prompts LLM de l'application.
 *
 * Toute interaction avec un LLM dans `apps/web` DOIT importer son prompt depuis ce module.
 * Voir `/CLAUDE.md` → section "Gestion des prompts LLM".
 */

export { buildCvExtractionPrompt } from "./cv-extraction";
export {
  INTENT_BRANCHES_DESCRIPTION,
  buildIntentAnalysisPrompt,
} from "./intent-analysis";
export {
  TITLE_GEN_SYSTEM_PROMPT,
  buildTitleGenUserPrompt,
  type BranchParams,
} from "./title-generation";
