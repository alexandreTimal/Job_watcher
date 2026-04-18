/**
 * Prompts: génération de variantes de titres de poste pour les 5 branches d'onboarding.
 *
 * Où : consommés par `apps/web/src/lib/title-generator.ts` (fonction `generateTitles`),
 *      déclenchée par la route POST /api/generate-titles à la fin de l'onboarding.
 * À quoi ils servent : produire 10 à 15 titres de poste FR/EN réalistes, utilisés
 *      comme requêtes sur France Travail, WTTJ, HelloWork, Indeed FR, LinkedIn.
 *      `TITLE_GEN_SYSTEM_PROMPT` fixe le rôle/format global ; chaque `buildBranchXPrompt`
 *      injecte les paramètres spécifiques à l'intention (branche 1 à 5).
 * Modèle ciblé : Gemini 2.5 Flash Lite par défaut (structuredOutputs=false, responseMimeType=application/json).
 * Forme de sortie : JSON `{ titles: [{ fr: string|null, en: string|null }, ...] }`
 *      conforme à `llmTitleOutputSchema` (@jobfindeer/validators).
 * Sécurité : les champs injectés depuis l'input utilisateur sont emballés dans `<user_input>…</user_input>`
 *      par les builders via le helper `sanitize` de title-generator.ts (mitigation prompt injection).
 */

/**
 * Paramètres d'entrée des prompts de génération de titres, un type par branche.
 * La définition vit ici (avec les prompts qui les consomment) pour garder
 * la source de vérité de ce qu'attend chaque prompt à côté de son template.
 */
export type BranchParams =
  | { branch: "1"; current_job_title: string; current_seniority_level: string }
  | { branch: "2"; current_job_title: string; current_seniority_level: string; responsibility_jump_type: string[] }
  | { branch: "3"; current_job_title: string; target_jobs: string[]; salary_drop_tolerance: string; training_willingness: string }
  | { branch: "4"; target_jobs: string[]; seniority_acceptance: string }
  | { branch: "5"; education_level: string; education_field: string; contract_types: string[] };

/** Prompt système partagé par toutes les branches. */
export const TITLE_GEN_SYSTEM_PROMPT = `You are a job title generator for JobFindeer, a French job search assistant. Your role is to produce lists of job titles used as search queries on French job boards (France Travail, Welcome to the Jungle, HelloWork, Indeed FR, LinkedIn).

You receive an "Arbitre de réalité" output that tells you the calibrated target level. You MUST calibrate your titles against \`niveau_cible_effectif\`, NOT against the user's raw expectations.

## Your output

You MUST return a valid JSON object with this exact structure:

{
  "titles": [
    {
      "fr": "string or null",
      "en": "string or null",
      "niveau_ordinal": "aligné" | "évolution_modérée" | "stretch_ambitieux" | "sous-qualifié",
      "category": "classic_fr" | "anglo_startup" | "hard_skill"
    },
    ...
  ]
}

## Strict rules

1. Return ONLY valid JSON. No markdown fences, no text outside the JSON.
2. Each title has both fr and en fields (one may be null for single-language roles).
3. Generate between 10 and 30 titles per request. Fewer is acceptable for very niche jobs. Never exceed 30.
4. Only produce titles actually used on real French listings — no invented titles.
5. Order the list by relevance (most relevant first, aligné titles before stretch).

## niveau_ordinal definitions (relative to niveau_cible_effectif from Arbitre)

- "aligné" : title matches exactly the target level from the Arbitre.
- "évolution_modérée" : title one level above the target (growth opportunity).
- "stretch_ambitieux" : title two levels above the target. Produce 0-3 of these max.
- "sous-qualifié" : title one level below the target. Produce 0-2 of these (useful for debug).

If gap_detected is "strong_downgrade" OR "strong_upgrade", ignore the candidate's raw declared titles entirely and calibrate purely on niveau_cible_effectif.

## Distribution target (rough)

- aligné: ~15 titles
- évolution_modérée: ~8 titles
- stretch_ambitieux: ~3 titles
- sous-qualifié: ~2 titles

Adjust per job family (a niche trade role may skip stretch entirely).

## category definitions

- "classic_fr" : traditional French title (ex: "Ingénieur commercial", "Serveur en salle", "Comptable").
- "anglo_startup" : English/startup-style title dominant on the French market (ex: "Account Executive", "Product Manager").
- "hard_skill" : title embedding a specific technical tool or framework (ex: "Salesforce Sales Rep", "React Developer", "SAP Consultant").

Mix categories when relevant for the role. Trade / hospitality / public sector often has no anglo_startup or hard_skill titles — don't force them.

## Branch-specific semantic mapping

Branches 1-2-3: use niveau_ordinal as defined above.
Branches 4-5 (reconversion / student): remap semantics since the candidate enters a new field:
- "aligné" = titles explicitly welcoming beginners/reconverts ("junior formation assurée", "débutant accepté").
- "évolution_modérée" = intermediate roles accepting transferable skills.
- "stretch_ambitieux" = rare, reserved for strong transferable profiles.
- "sous-qualifié" = near-empty on these branches.

## Quality bar

Imagine you are a French recruiter who has seen thousands of job ads. Every title should feel like something a candidate would actually see on a real listing.`;

/**
 * Builder signature : reçoit les paramètres déjà **sanitisés** par l'appelant
 * (title-generator.ts fait passer chaque champ par `sanitize` / `sanitizeArray`
 * avant interpolation). Chaque builder se contente de mettre en forme le prompt.
 */
type Sanitized<T> = T; // alias documentaire

import type { ArbitreOutput } from "@jobfindeer/validators";

/** Bloc Arbitre injecté dans chaque builder juste avant `## Your turn`. */
function arbitreBlock(arbitre: ArbitreOutput): string {
  return `## Arbitre de réalité (niveau calibré)

- niveau_cible_effectif : ${arbitre.niveau_cible_effectif}
- gap_detected : ${arbitre.gap_detected}
- Analyse : ${arbitre.analyse_realite}

Calibre les titres "aligné" sur ce niveau cible, PAS sur les attentes brutes de l'utilisateur.`;
}

export function buildBranch1Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "1" }>>,
  arbitre: ArbitreOutput,
  helpers: { s: (v: unknown) => string },
): string {
  const { s } = helpers;
  return `## Task

Generate job title variants for a candidate who wants to STAY in their current type of role but find a better opportunity. The candidate is satisfied with their profession and wants to explore lateral moves with equivalent seniority.

## Candidate input

- Current job title: <user_input>${s(p.current_job_title)}</user_input>
- Current seniority level: <user_input>${s(p.current_seniority_level)}</user_input>

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
    { "fr": "Developpeur fullstack senior", "en": "Senior Fullstack Developer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur full-stack", "en": "Fullstack Engineer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Ingenieur logiciel", "en": "Senior Software Engineer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur web senior", "en": "Senior Web Developer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": null, "en": "Senior Software Developer", "niveau_ordinal": "aligné", "category": "anglo_startup" },
    { "fr": "Developpeur back-end et front-end", "en": "Full Stack Developer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": null, "en": "React Senior Developer", "niveau_ordinal": "aligné", "category": "hard_skill" },
    { "fr": "Ingenieur developpement logiciel", "en": "Software Development Engineer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": null, "en": "Node.js Senior Engineer", "niveau_ordinal": "aligné", "category": "hard_skill" },
    { "fr": "Developpeur confirme", "en": null, "niveau_ordinal": "sous-qualifié", "category": "classic_fr" }
  ]
}

## Example 2

Input: current_job_title="Serveur en restaurant", current_seniority_level="2 years experience"
Expected output:
{
  "titles": [
    { "fr": "Serveur", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Serveuse", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Serveur de restaurant", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Serveur confirme", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Serveur en salle", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Employe polyvalent de restauration", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Commis de salle", "en": null, "niveau_ordinal": "sous-qualifié", "category": "classic_fr" },
    { "fr": "Runner", "en": "Food Runner", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Serveur brasserie", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Serveur restaurant traditionnel", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" }
  ]
}

${arbitreBlock(arbitre)}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildBranch2Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "2" }>>,
  arbitre: ArbitreOutput,
  helpers: { s: (v: unknown) => string; sArr: (v: unknown) => string[] },
): string {
  const { s, sArr } = helpers;
  return `## Task

Generate job title variants for a candidate who wants to PROGRESS VERTICALLY in their current profession. The candidate is staying in the same field but seeking MORE responsibility than their current role.

## Candidate input

- Current job title: <user_input>${s(p.current_job_title)}</user_input>
- Current seniority level: <user_input>${s(p.current_seniority_level)}</user_input>
- Type of responsibility jump wanted: <user_input>${JSON.stringify(sArr(p.responsibility_jump_type))}</user_input>

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
    { "fr": "Tech Lead", "en": "Tech Lead", "niveau_ordinal": "évolution_modérée", "category": "anglo_startup" },
    { "fr": "Chef d'equipe developpement", "en": "Team Lead", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Lead developpeur", "en": "Lead Developer", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Responsable technique", "en": "Engineering Manager", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Chef de projet technique", "en": "Technical Team Lead", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Responsable d'equipe developpement", "en": "Development Team Lead", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": null, "en": "Lead Software Engineer", "niveau_ordinal": "évolution_modérée", "category": "anglo_startup" },
    { "fr": "Manager developpement", "en": "Software Engineering Manager", "niveau_ordinal": "stretch_ambitieux", "category": "anglo_startup" },
    { "fr": null, "en": "React Tech Lead", "niveau_ordinal": "évolution_modérée", "category": "hard_skill" },
    { "fr": null, "en": "Engineering Team Lead", "niveau_ordinal": "évolution_modérée", "category": "anglo_startup" }
  ]
}

## Example 2

Input: current_job_title="Commercial B2B", current_seniority_level="confirme", responsibility_jump_type=["wider_scope", "strategic_projects"]
Expected output:
{
  "titles": [
    { "fr": "Responsable grands comptes", "en": "Key Account Manager", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Charge de grands comptes", "en": "Strategic Account Manager", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Business Developer senior", "en": "Senior Business Developer", "niveau_ordinal": "évolution_modérée", "category": "anglo_startup" },
    { "fr": "Responsable developpement commercial", "en": "Business Development Manager", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Account Executive senior", "en": "Senior Account Executive", "niveau_ordinal": "évolution_modérée", "category": "anglo_startup" },
    { "fr": "Responsable comptes strategiques", "en": "Strategic Account Executive", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Charge d'affaires senior", "en": null, "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Ingenieur commercial grands comptes", "en": "Enterprise Sales Manager", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": null, "en": "Salesforce Account Executive", "niveau_ordinal": "évolution_modérée", "category": "hard_skill" },
    { "fr": "Chef de secteur grands comptes", "en": null, "niveau_ordinal": "évolution_modérée", "category": "classic_fr" }
  ]
}

${arbitreBlock(arbitre)}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildBranch3Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "3" }>>,
  arbitre: ArbitreOutput,
  helpers: { s: (v: unknown) => string; sArr: (v: unknown) => string[] },
): string {
  const { s, sArr } = helpers;
  return `## Task

Generate job title variants for a candidate who wants to CHANGE PROFESSION while staying in the same sector. The candidate has declared target jobs they are interested in pivoting to.

## Candidate input

- Current job title: <user_input>${s(p.current_job_title)}</user_input>
- Target jobs (user-provided): <user_input>${JSON.stringify(sArr(p.target_jobs))}</user_input>
- Salary drop tolerance: ${s(p.salary_drop_tolerance)}
- Training willingness: ${s(p.training_willingness)}

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
    { "fr": "Product Manager", "en": "Product Manager", "niveau_ordinal": "aligné", "category": "anglo_startup" },
    { "fr": "Product Owner", "en": "Product Owner", "niveau_ordinal": "aligné", "category": "anglo_startup" },
    { "fr": "Chef de produit", "en": "Product Manager", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Technical Product Manager", "en": "Technical Product Manager", "niveau_ordinal": "aligné", "category": "anglo_startup" },
    { "fr": "Product Manager junior", "en": "Junior Product Manager", "niveau_ordinal": "sous-qualifié", "category": "anglo_startup" },
    { "fr": "Associate Product Manager", "en": "Associate Product Manager", "niveau_ordinal": "sous-qualifié", "category": "anglo_startup" },
    { "fr": "Chef de produit digital", "en": "Digital Product Manager", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": null, "en": "Jira Product Owner", "niveau_ordinal": "aligné", "category": "hard_skill" },
    { "fr": "Product Manager B2B", "en": "B2B Product Manager", "niveau_ordinal": "aligné", "category": "anglo_startup" },
    { "fr": "Responsable produit", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" }
  ]
}

## Example 2

Input: current_job_title="Comptable", target_jobs=["Controleur de gestion", "Analyste financier"], salary_drop_tolerance="none", training_willingness="none"
Expected output:
{
  "titles": [
    { "fr": "Controleur de gestion", "en": "Management Controller", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Controleur de gestion senior", "en": "Senior Financial Controller", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Controleur de gestion confirme", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Responsable controle de gestion", "en": "Controlling Manager", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Controleur financier", "en": "Financial Controller", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Analyste financier", "en": "Financial Analyst", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Analyste financier senior", "en": "Senior Financial Analyst", "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Charge d'etudes financieres", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": null, "en": "SAP FI/CO Analyst", "niveau_ordinal": "aligné", "category": "hard_skill" },
    { "fr": "Controleur de gestion industriel", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" }
  ]
}

${arbitreBlock(arbitre)}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildBranch4Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "4" }>>,
  arbitre: ArbitreOutput,
  helpers: { s: (v: unknown) => string; sArr: (v: unknown) => string[] },
): string {
  const { s, sArr } = helpers;
  return `## Task

Generate job title variants for a candidate in a COMPLETE CAREER CHANGE. The candidate is entering a new profession and their past experience is only partially transferable.

## Candidate input

- Target jobs (user-provided): <user_input>${JSON.stringify(sArr(p.target_jobs))}</user_input>
- Seniority acceptance: ${s(p.seniority_acceptance)}

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
    { "fr": "Developpeur web junior", "en": "Junior Web Developer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur debutant", "en": "Entry-Level Developer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur web junior formation assuree", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur front-end junior", "en": "Junior Frontend Developer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur back-end junior", "en": "Junior Backend Developer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur junior reconversion", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur fullstack junior", "en": "Junior Fullstack Developer", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Developpeur HTML/CSS/JavaScript junior", "en": null, "niveau_ordinal": "aligné", "category": "hard_skill" },
    { "fr": null, "en": "Entry-Level React Developer", "niveau_ordinal": "aligné", "category": "hard_skill" },
    { "fr": "Developpeur web debutant accepte", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" }
  ]
}

## Example 2

Input: target_jobs=["Infirmier"], seniority_acceptance="both"
Expected output:
{
  "titles": [
    { "fr": "Infirmier debutant", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Infirmiere diplomee d'Etat", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Infirmier diplome d'Etat", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "IDE", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Infirmier junior", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Infirmier en soins generaux", "en": null, "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Infirmier hospitalier", "en": null, "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Infirmiere polyvalente", "en": null, "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Infirmier de nuit", "en": null, "niveau_ordinal": "évolution_modérée", "category": "classic_fr" },
    { "fr": "Infirmier en reconversion", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" }
  ]
}

${arbitreBlock(arbitre)}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildBranch5Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "5" }>>,
  arbitre: ArbitreOutput,
  helpers: { s: (v: unknown) => string },
): string {
  const { s } = helpers;
  return `## Task

Generate job title variants for a STUDENT or RECENT GRADUATE looking for an apprenticeship, internship, or first job. The candidate has no significant professional experience and the generation is based on their education level and field of study.

## Candidate input

- Education level: <user_input>${s(p.education_level)}</user_input>
- Education field: <user_input>${s(p.education_field)}</user_input>
- Contract types: ${p.contract_types.map((c) => s(c)).join(", ")}

Each "contract type" can be:
- "apprenticeship" -> alternance contract
- "internship" -> stage
- "first_job" -> first permanent job / CDI debutant

## Instructions specific to this case

- The candidate may be targeting MULTIPLE contract types simultaneously. Produce a balanced mix of titles covering every selected contract type.
- Generate titles for ENTRY-LEVEL positions typical for a student/graduate of this level and field.
- Adapt the title vocabulary to each contract type:
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
    { "fr": "Charge de marketing en alternance", "en": "Marketing Associate Apprentice", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Assistant chef de produit en alternance", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Business Developer en alternance", "en": "Business Developer Apprentice", "niveau_ordinal": "aligné", "category": "anglo_startup" },
    { "fr": "Charge de communication en alternance", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Alternant marketing digital", "en": "Digital Marketing Apprentice", "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Charge de developpement commercial en alternance", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Assistant chef de projet marketing en alternance", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Alternant controle de gestion", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": null, "en": "Salesforce Apprentice", "niveau_ordinal": "aligné", "category": "hard_skill" },
    { "fr": "Assistant ressources humaines en alternance", "en": "HR Apprentice", "niveau_ordinal": "aligné", "category": "classic_fr" }
  ]
}

## Example 2

Input: education_level="Bac+2", education_field="BTS informatique", contract_type="internship"
Expected output:
{
  "titles": [
    { "fr": "Stagiaire developpeur web", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Stage developpeur informatique", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Stagiaire developpeur front-end", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Stagiaire developpeur back-end", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Stage administration systemes", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Stagiaire technicien informatique", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Stage support informatique", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Stagiaire developpement d'applications", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" },
    { "fr": "Stagiaire React Vue.js", "en": null, "niveau_ordinal": "aligné", "category": "hard_skill" },
    { "fr": "Stagiaire integrateur web", "en": null, "niveau_ordinal": "aligné", "category": "classic_fr" }
  ]
}

${arbitreBlock(arbitre)}

## Your turn

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildTitleGenUserPrompt(
  params: BranchParams,
  arbitre: ArbitreOutput,
  helpers: { s: (v: unknown) => string; sArr: (v: unknown) => string[] },
): string {
  switch (params.branch) {
    case "1":
      return buildBranch1Prompt(params, arbitre, helpers);
    case "2":
      return buildBranch2Prompt(params, arbitre, helpers);
    case "3":
      return buildBranch3Prompt(params, arbitre, helpers);
    case "4":
      return buildBranch4Prompt(params, arbitre, helpers);
    case "5":
      return buildBranch5Prompt(params, arbitre, helpers);
  }
}
