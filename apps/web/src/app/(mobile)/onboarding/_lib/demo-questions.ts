import type { Question } from "./questionnaire-types";

export const DEMO_QUESTIONS: Question[] = [
  {
    id: "job-type",
    text: "Quel type de poste recherchez-vous ?",
    options: [
      { id: "cdi", label: "CDI" },
      { id: "cdd", label: "CDD" },
      { id: "freelance", label: "Freelance / Indépendant" },
      { id: "alternance", label: "Alternance" },
      { id: "stage", label: "Stage" },
    ],
    multiple: true,
  },
  {
    id: "work-mode",
    text: "Quel mode de travail vous convient le mieux ?",
    options: [
      { id: "remote", label: "Full remote" },
      { id: "hybrid", label: "Hybride" },
      { id: "onsite", label: "Sur site" },
      { id: "any", label: "Peu importe" },
    ],
  },
  {
    id: "experience-match",
    text: "Quel niveau d'expérience visez-vous dans les offres ?",
    options: [
      { id: "junior", label: "Junior (0-2 ans)" },
      { id: "mid", label: "Confirmé (3-5 ans)" },
      { id: "senior", label: "Senior (6-10 ans)" },
      { id: "lead", label: "Lead / Expert (10+ ans)" },
    ],
  },
  {
    id: "priority",
    text: "Qu'est-ce qui compte le plus pour vous dans un poste ?",
    options: [
      { id: "salary", label: "Salaire" },
      { id: "mission", label: "Mission / Impact" },
      { id: "growth", label: "Évolution de carrière" },
      { id: "balance", label: "Équilibre vie pro/perso" },
      { id: "tech", label: "Stack technique" },
    ],
    multiple: true,
  },
  {
    id: "company-size",
    text: "Quelle taille d'entreprise préférez-vous ?",
    options: [
      { id: "startup", label: "Startup (< 50)" },
      { id: "scaleup", label: "Scale-up (50-250)" },
      { id: "mid-company", label: "ETI (250-5000)" },
      { id: "enterprise", label: "Grand groupe (5000+)" },
      { id: "any", label: "Pas de préférence" },
    ],
  },
];
