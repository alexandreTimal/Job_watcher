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
export const TITLE_GEN_SYSTEM_PROMPT = `You are a job title generator for JobFindeer, a French job search assistant. Your role is to produce lists of job titles that will be used as search queries on French job boards (France Travail, Welcome to the Jungle, HelloWork, Indeed FR, LinkedIn).

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

Imagine you are a recruiter who has seen thousands of French job ads. Your list should feel natural, realistic, and comprehensive. A candidate looking at this list should recognize every title as something they have seen on real job postings.`;

/**
 * Builder signature : reçoit les paramètres déjà **sanitisés** par l'appelant
 * (title-generator.ts fait passer chaque champ par `sanitize` / `sanitizeArray`
 * avant interpolation). Chaque builder se contente de mettre en forme le prompt.
 */
type Sanitized<T> = T; // alias documentaire

export function buildBranch1Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "1" }>>,
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

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildBranch2Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "2" }>>,
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

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildBranch3Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "3" }>>,
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

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildBranch4Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "4" }>>,
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

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildBranch5Prompt(
  p: Sanitized<Extract<BranchParams, { branch: "5" }>>,
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

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

export function buildTitleGenUserPrompt(
  params: BranchParams,
  helpers: { s: (v: unknown) => string; sArr: (v: unknown) => string[] },
): string {
  switch (params.branch) {
    case "1":
      return buildBranch1Prompt(params, helpers);
    case "2":
      return buildBranch2Prompt(params, helpers);
    case "3":
      return buildBranch3Prompt(params, helpers);
    case "4":
      return buildBranch4Prompt(params, helpers);
    case "5":
      return buildBranch5Prompt(params, helpers);
  }
}
