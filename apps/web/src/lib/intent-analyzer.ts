import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod/v4";
import type { ExtractedProfile } from "@jobfindeer/validators";

const BRANCHES = `
Branche 1 — Même poste, en mieux : cherche un poste similaire mais avec de meilleures conditions (salaire, télétravail, management, environnement).
Branche 2 — Monter en responsabilités : veut évoluer vers plus de responsabilités, management, lead technique, etc.
Branche 3 — Changer de métier : souhaite pivoter vers un autre métier tout en valorisant son expérience.
Branche 4 — Reconversion : en reconversion profonde, change complètement de domaine.
Branche 5 — Alternance/Stage : étudiant ou en formation, cherche un contrat en alternance ou un stage.
`;

const intentSchema = z.object({
  branch: z.enum(["1", "2", "3", "4", "5"]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  signals: z.object({
    constraints: z.array(z.string()),
    tone: z.string(),
    keywords: z.array(z.string()),
  }),
});

export type IntentResult = z.infer<typeof intentSchema>;

export async function analyzeIntent(
  freeText: string,
  profile: ExtractedProfile | null,
): Promise<IntentResult> {
  const profileContext = profile
    ? `Résumé CV : ${profile.currentTitle ?? "inconnu"}, ${profile.experienceYears ?? "?"} ans d'expérience, compétences : ${[...profile.hardSkills, ...profile.softSkills].slice(0, 10).join(", ")}.`
    : "Pas de CV fourni.";

  const result = await generateText({
    model: google("gemini-2.5-flash"),
    providerOptions: {
      google: {
        structuredOutputs: false,
        responseMimeType: "application/json",
      },
    },
    prompt: `Tu es un conseiller emploi bienveillant. Analyse le texte libre d'un candidat et classe-le dans une des 5 branches d'intention.

${BRANCHES}

${profileContext}

Texte du candidat :
"${freeText}"

Retourne un JSON avec :
- "branch": "1"|"2"|"3"|"4"|"5"
- "confidence": nombre entre 0 et 1
- "summary": reformulation empathique en 1-2 phrases
- "signals": { "constraints": [...], "tone": "...", "keywords": [...] }`,
  });

  const parsed = intentSchema.parse(JSON.parse(result.text));
  return parsed;
}
