import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { extractedProfileSchema } from "@jobfindeer/validators";

export async function extractProfileFromCV(cvText: string) {
  const result = await generateText({
    model: google("gemini-2.0-flash"),
    output: Output.object({ schema: extractedProfileSchema }),
    prompt: `Tu es un assistant RH expert. Extrais les informations suivantes du CV ci-dessous.
Retourne les compétences techniques et soft skills, les années d'expérience, la localisation actuelle et le titre actuel du poste.

CV:
${cvText}`,
  });

  return result.output;
}
