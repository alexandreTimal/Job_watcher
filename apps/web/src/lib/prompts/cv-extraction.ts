/**
 * Prompt: extraction structurée de CV.
 *
 * Où : consommé par `apps/web/src/lib/extract-cv.ts` (fonction `extractProfileFromCV`),
 *      déclenchée par la route d'upload CV pendant l'onboarding.
 * À quoi il sert : convertir le texte brut d'un CV en JSON normalisé
 *      (current_title, experience_years, skills, work_history, education…)
 *      pour alimenter le matching et les prompts de génération de titres.
 * Modèle ciblé : Gemini 2.5 Flash (structuredOutputs=false, responseMimeType=application/json).
 * Forme de sortie : JSON conforme à `llmOutputSchema` dans extract-cv.ts
 *      (clés snake_case en anglais, null/[] pour les données manquantes).
 */
export function buildCvExtractionPrompt(cvText: string): string {
  return `Ton objectif est d'extraire des informations structurées à partir d'un CV brut pour alimenter un algorithme de matching de recrutement.

RÈGLES D'EXTRACTION OBLIGATOIRES :
1. Langue des clés : Utilise STRICTEMENT les clés JSON en anglais définies dans le format attendu.
2. current_title : Isole uniquement l'intitulé du poste actuel le plus récent (ex: "Fondateur & CEO"). Supprime impérativement le nom de l'entreprise de ce champ.
3. experience_years : Calcule le total cumulé des années d'expérience professionnelle. Analyse les dates de début et de fin. Ne compte pas en double les expériences qui se chevauchent. Renvoie uniquement un entier.
4. education_level : Déduis le niveau d'études global standardisé (ex: "Bac+2", "Bac+3", "Bac+5") en te basant sur le diplôme le plus élevé trouvé.
5. Gestion du vide : Si une donnée textuelle est introuvable, renvoie 'null'. Si une liste (langues, expériences, diplômes, certifications) est vide, renvoie un tableau vide '[]'. N'invente aucune information.

FORMAT DE SORTIE ATTENDU :
Renvoie un objet JSON valide respectant strictement cette structure :
{
  "current_title": "string | null",
  "location": "string | null",
  "experience_years": integer,
  "hard_skills": ["string", "string"],
  "soft_skills": ["string", "string"],
  "languages": [
    {
      "name": "string",
      "level": "string"
    }
  ],
  "education_level": "string | null",
  "work_history": [
    {
      "title": "string",
      "company": "string",
      "start": "string (YYYY ou MM/YYYY)",
      "end": "string (YYYY, MM/YYYY ou 'Present')"
    }
  ],
  "education": [
    {
      "degree": "string",
      "school": "string",
      "year": integer
    }
  ],
  "certifications": ["string", "string"]
}

DOCUMENT À ANALYSER :
<cv>
${cvText}
</cv>`;
}
