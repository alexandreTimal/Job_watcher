import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { SearchTitle } from "@jobfindeer/validators";
import { llmTitleOutputSchema } from "@jobfindeer/validators";
import type { ModelId } from "./model-config";
import { MODEL_CONFIG, isAvailableModel } from "./model-config";

const DEFAULT_MODEL: ModelId = "gemini-2.5-flash-lite";
const LLM_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TitleGenMetrics {
  model: string;
  modelLabel: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  tokensTotal: number;
  costUsd: number;
  rawOutput: unknown;
}

export interface TitleGenResult {
  titles: SearchTitle[];
  metrics: TitleGenMetrics;
}

export type BranchParams =
  | { branch: "1"; current_job_title: string; current_seniority_level: string }
  | { branch: "2"; current_job_title: string; current_seniority_level: string; responsibility_jump_type: string[] }
  | { branch: "3"; current_job_title: string; target_jobs: string[]; salary_drop_tolerance: string; training_willingness: string }
  | { branch: "4"; target_jobs: string[]; seniority_acceptance: string }
  | { branch: "5"; education_level: string; education_field: string; contract_type: string };

// ---------------------------------------------------------------------------
// System prompt (shared across all branches)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a job title generator for JobFindeer, a French job search assistant. Your role is to produce lists of job titles that will be used as search queries on French job boards (France Travail, Welcome to the Jungle, HelloWork, Indeed FR, LinkedIn).

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

// ---------------------------------------------------------------------------
// Input sanitization (prompt injection mitigation)
// ---------------------------------------------------------------------------

function sanitize(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/<\s*\/?\s*user_input\s*>/gi, "")
    .replace(/[<>]/g, "")
    .slice(0, 200)
    .trim();
}

function sanitizeArray(inputs: unknown): string[] {
  if (!Array.isArray(inputs)) return [];
  return inputs
    .filter((v): v is string => typeof v === "string")
    .map(sanitize)
    .filter((v) => v.length > 0)
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Branch prompts
// ---------------------------------------------------------------------------

function buildBranch1Prompt(p: Extract<BranchParams, { branch: "1" }>): string {
  return `## Task

Generate job title variants for a candidate who wants to STAY in their current type of role but find a better opportunity. The candidate is satisfied with their profession and wants to explore lateral moves with equivalent seniority.

## Candidate input

- Current job title: <user_input>${sanitize(p.current_job_title)}</user_input>
- Current seniority level: <user_input>${sanitize(p.current_seniority_level)}</user_input>

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

function buildBranch2Prompt(p: Extract<BranchParams, { branch: "2" }>): string {
  return `## Task

Generate job title variants for a candidate who wants to PROGRESS VERTICALLY in their current profession. The candidate is staying in the same field but seeking MORE responsibility than their current role.

## Candidate input

- Current job title: <user_input>${sanitize(p.current_job_title)}</user_input>
- Current seniority level: <user_input>${sanitize(p.current_seniority_level)}</user_input>
- Type of responsibility jump wanted: <user_input>${JSON.stringify(sanitizeArray(p.responsibility_jump_type))}</user_input>

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

function buildBranch3Prompt(p: Extract<BranchParams, { branch: "3" }>): string {
  return `## Task

Generate job title variants for a candidate who wants to CHANGE PROFESSION while staying in the same sector. The candidate has declared target jobs they are interested in pivoting to.

## Candidate input

- Current job title: <user_input>${sanitize(p.current_job_title)}</user_input>
- Target jobs (user-provided): <user_input>${JSON.stringify(sanitizeArray(p.target_jobs))}</user_input>
- Salary drop tolerance: ${sanitize(p.salary_drop_tolerance)}
- Training willingness: ${sanitize(p.training_willingness)}

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

function buildBranch4Prompt(p: Extract<BranchParams, { branch: "4" }>): string {
  return `## Task

Generate job title variants for a candidate in a COMPLETE CAREER CHANGE. The candidate is entering a new profession and their past experience is only partially transferable.

## Candidate input

- Target jobs (user-provided): <user_input>${JSON.stringify(sanitizeArray(p.target_jobs))}</user_input>
- Seniority acceptance: ${sanitize(p.seniority_acceptance)}

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

function buildBranch5Prompt(p: Extract<BranchParams, { branch: "5" }>): string {
  return `## Task

Generate job title variants for a STUDENT or RECENT GRADUATE looking for an apprenticeship, internship, or first job. The candidate has no significant professional experience and the generation is based on their education level and field of study.

## Candidate input

- Education level: <user_input>${sanitize(p.education_level)}</user_input>
- Education field: <user_input>${sanitize(p.education_field)}</user_input>
- Contract type: ${sanitize(p.contract_type)}

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

Now generate the JSON output for the candidate input above. Return only the JSON object, nothing else.`;
}

// ---------------------------------------------------------------------------
// Prompt builder dispatcher
// ---------------------------------------------------------------------------

function buildUserPrompt(params: BranchParams): string {
  switch (params.branch) {
    case "1": return buildBranch1Prompt(params);
    case "2": return buildBranch2Prompt(params);
    case "3": return buildBranch3Prompt(params);
    case "4": return buildBranch4Prompt(params);
    case "5": return buildBranch5Prompt(params);
  }
}

// ---------------------------------------------------------------------------
// Fallback generation
// ---------------------------------------------------------------------------

function buildFallbackTitles(params: BranchParams): SearchTitle[] {
  const titles: SearchTitle[] = [];
  const seen = new Set<string>();
  const push = (fr: string | null, en: string | null) => {
    const frNorm = fr ? fr.trim() : null;
    const enNorm = en ? en.trim() : null;
    if (!frNorm && !enNorm) return;
    const key = `${(frNorm ?? "").toLowerCase()}|${(enNorm ?? "").toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    titles.push({ fr: frNorm, en: enNorm });
  };

  const addWithVariants = (base: string) => {
    const b = sanitize(base);
    if (!b) return;
    push(b, null);
    const lower = b.toLowerCase();
    const already = ["senior", "junior", "confirme", "débutant", "debutant"].some((k) =>
      lower.includes(k),
    );
    if (already) {
      push(`${b} confirmé`, null);
      push(b, b);
    } else {
      push(`${b} senior`, null);
      push(`${b} confirmé`, null);
      push(`${b} junior`, null);
    }
  };

  if ("current_job_title" in params && params.current_job_title) {
    addWithVariants(params.current_job_title);
  }

  if ("target_jobs" in params && Array.isArray(params.target_jobs)) {
    for (const job of params.target_jobs) {
      addWithVariants(job);
    }
  }

  if (params.branch === "5") {
    const prefix =
      params.contract_type === "apprenticeship"
        ? "Alternant"
        : params.contract_type === "internship"
          ? "Stagiaire"
          : "Junior";
    const field = sanitize(params.education_field);
    if (field) push(`${prefix} ${field}`, null);
  }

  if (titles.length === 0) {
    push("Emploi", "Job");
  }
  return titles;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const maybeMsg = (err as { message?: unknown }).message;
    if (typeof maybeMsg === "string") return maybeMsg;
  }
  return "Unknown error";
}

function isRetryableError(err: unknown): boolean {
  if (err === null || err === undefined) return false;
  const msg = errorMessage(err);
  const statusMatch = /\b([45]\d\d)\b/.exec(msg);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  if (status !== null) {
    if (status === 429) return true;
    if (status >= 500) return true;
    return false;
  }
  if (err instanceof SyntaxError) return true;
  const name = err instanceof Error ? err.name : undefined;
  if (name === "AbortError") return true;
  return true;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function generateTitles(
  params: BranchParams,
  modelId?: string,
): Promise<TitleGenResult> {
  const resolvedModel: ModelId = isAvailableModel(modelId) ? modelId : DEFAULT_MODEL;
  const config = MODEL_CONFIG[resolvedModel];

  const userPrompt = buildUserPrompt(params);

  async function callLLM() {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
    try {
      const result = await generateText({
        model: google(resolvedModel),
        system: SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.3,
        maxOutputTokens: 2000,
        abortSignal: controller.signal,
        providerOptions: {
          google: {
            structuredOutputs: false,
            responseMimeType: "application/json",
          },
        },
      });
      const durationMs = Date.now() - start;

      const cleaned = result.text
        .replace(/^\s*```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      if (!cleaned) {
        throw new Error(`Empty response from model (finishReason: ${String(result.finishReason)})`);
      }
      if (cleaned.length > 200_000) {
        throw new Error("Response too large");
      }
      const rawJson: unknown = JSON.parse(cleaned);
      const parsed = llmTitleOutputSchema.parse(rawJson);

      const usage = result.usage as Record<string, unknown> | undefined;
      const tokensIn = toNumber(usage?.promptTokens ?? usage?.input_tokens ?? usage?.inputTokens);
      const tokensOut = toNumber(usage?.completionTokens ?? usage?.output_tokens ?? usage?.outputTokens);

      return { titles: parsed.titles, rawJson, durationMs, tokensIn, tokensOut };
    } finally {
      clearTimeout(timeout);
    }
  }

  let lastError: unknown;
  const maxAttempts = 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const { titles, rawJson, durationMs, tokensIn, tokensOut } = await callLLM();
      const costUsd =
        (tokensIn / 1_000_000) * config.pricing.input +
        (tokensOut / 1_000_000) * config.pricing.output;

      return {
        titles,
        metrics: {
          model: resolvedModel,
          modelLabel: config.label,
          durationMs,
          tokensIn,
          tokensOut,
          tokensTotal: tokensIn + tokensOut,
          costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
          rawOutput: rawJson,
        },
      };
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts - 1) break;
      if (!isRetryableError(err)) break;
      const backoff = 300 + Math.floor(Math.random() * 400);
      await sleep(backoff);
    }
  }

  const fallbackTitles = buildFallbackTitles(params);
  return {
    titles: fallbackTitles,
    metrics: {
      model: resolvedModel,
      modelLabel: config.label + " (fallback)",
      durationMs: 0,
      tokensIn: 0,
      tokensOut: 0,
      tokensTotal: 0,
      costUsd: 0,
      rawOutput: { error: errorMessage(lastError), fallback: true },
    },
  };
}
