import 'dotenv/config';

// --- Mots-clés par catégorie et poids ---

export const KEYWORDS = {
  high_match: {
    weight: 3,
    terms: [
      'product manager', 'product owner', 'chef de produit', 'associate pm',
      'growth', 'growth hacker', 'growth marketing', 'acquisition',
      'développeur full-stack', 'full stack developer', 'software engineer',
      'développeur react', 'développeur typescript', 'frontend developer',
      'chef de projet tech', 'chef de projet digital', 'project manager tech',
      'scrum master', 'PMO',
    ],
  },
  tech_match: {
    weight: 2,
    terms: [
      'react', 'next.js', 'nextjs', 'typescript', 'node.js', 'nodejs',
      'javascript', 'python', 'postgresql', 'supabase', 'vercel',
      'tailwind', 'prisma', 'docker', 'aws',
      'SEO', 'SEA', 'google ads', 'meta ads', 'analytics',
      'stripe', 'API', 'rest', 'graphql',
      'IA', 'AI', 'LLM', 'machine learning', 'openai', 'langchain', 'RAG',
      'jira', 'notion', 'figma', 'agile', 'scrum',
    ],
  },
  contract_match: {
    weight: 2,
    terms: [
      'alternance', 'apprentissage', 'contrat pro',
      'stage', 'stage de fin d\'études', 'internship', 'PFE',
    ],
  },
  context_match: {
    weight: 1,
    terms: [
      'startup', 'scale-up', 'scaleup', 'série A', 'série B',
      'marketplace', 'SaaS', 'B2C', 'B2B',
      'remote', 'full remote', 'télétravail',
      'French Tech', 'Next40', 'FT120',
    ],
  },
  negative: {
    weight: -5,
    terms: [
      'senior', '5 ans d\'expérience', '7 ans', '10 ans',
      'manager confirmé', 'directeur', 'VP',
      'BTP', 'infirmier', 'comptable', 'juridique',
      'anglais natif requis', 'bilingue anglais obligatoire',
    ],
  },
} as const;

// --- URLs de recherche Indeed (via Bright Data Web Unlocker) ---

export const INDEED_SEARCH_URLS = [
  'https://fr.indeed.com/jobs?q=product+manager+alternance&l=France&sort=date',
  'https://fr.indeed.com/jobs?q=d%C3%A9veloppeur+full+stack+alternance&l=France&sort=date',
  'https://fr.indeed.com/jobs?q=growth+marketing+alternance&l=France&sort=date',
  'https://fr.indeed.com/jobs?q=chef+de+projet+tech+alternance&l=France&sort=date',
  'https://fr.indeed.com/jobs?q=product+manager+stage&l=France&sort=date',
  'https://fr.indeed.com/jobs?q=d%C3%A9veloppeur+full+stack+stage&l=France&sort=date',
  'https://fr.indeed.com/jobs?q=d%C3%A9veloppeur+react+typescript+alternance&l=France&sort=date',
  'https://fr.indeed.com/jobs?q=stage+fin+%C3%A9tudes+informatique&l=France&sort=date',
];

// --- URLs RSS ---

export const RSS_URLS = {
  googleAlerts: [
    // URLs RSS Atom à remplir après création manuelle des alertes sur google.com/alerts
    // Chaque alerte génère un flux Atom accessible via l'icône RSS
  ],
  hellowork: [
    'https://www.hellowork.com/fr-fr/emploi/recherche.html?k=product+manager+alternance&l=France&mode=rss',
  ],
} as const;

// --- Pages carrières à surveiller ---

export const CAREER_PAGES: Array<{ name: string; url: string; selector: string }> = [
  { name: 'Doctolib', url: 'https://careers.doctolib.com/career-jobs/', selector: 'main' },
  { name: 'Qonto', url: 'https://qonto.com/fr/careers#open-positions', selector: 'main' },
  { name: 'Alan', url: 'https://alan.com/en/careers', selector: 'main' },
  { name: 'Back Market', url: 'https://jobs.backmarket.com/', selector: 'main' },
  { name: 'PayFit', url: 'https://payfit.com/fr/carrieres/', selector: 'main' },
  { name: 'Contentsquare', url: 'https://www.contentsquare.com/careers/', selector: 'main' },
  { name: 'Datadog', url: 'https://careers.datadoghq.com/?location=Paris', selector: 'main' },
  { name: 'Agicap', url: 'https://www.agicap.com/fr/carrieres/', selector: 'main' },
  { name: 'Malt', url: 'https://careers.malt.com/', selector: 'main' },
  { name: 'Finary', url: 'https://finary.com/careers', selector: 'main' },
  { name: 'Swile', url: 'https://www.swile.co/fr-fr/careers', selector: 'main' },
  { name: 'Theodo', url: 'https://www.theodo.com/en-fr/job-offers', selector: 'main' },
  { name: 'Station F Jobs', url: 'https://jobs.stationf.co/search', selector: 'main' },
  { name: 'Mistral AI', url: 'https://www.mistral.ai/careers/', selector: 'main' },
];

// --- URLs de recherche WTTJ ---

export const WTTJ_SEARCH_URLS = [
  'https://www.welcometothejungle.com/fr/jobs?refinementList%5Bcontract_type_names.fr%5D%5B%5D=Alternance&refinementList%5Bcontract_type_names.fr%5D%5B%5D=Stage&query=product%20manager&page=1',
  'https://www.welcometothejungle.com/fr/jobs?refinementList%5Bcontract_type_names.fr%5D%5B%5D=Alternance&query=développeur%20full%20stack&page=1',
  'https://www.welcometothejungle.com/fr/jobs?refinementList%5Bcontract_type_names.fr%5D%5B%5D=Alternance&query=growth%20marketing&page=1',
];

// --- France Travail API ---

export const FRANCE_TRAVAIL = {
  tokenUrl: 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire',
  searchUrl: 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search',
  searches: [
    // Alternance (apprentissage + professionnalisation)
    { motsCles: 'développeur', natureContrat: 'E2,FS', departement: '69,75', sort: '1', range: '0-149' },
    { motsCles: 'product manager', natureContrat: 'E2,FS', departement: '69,75', sort: '1', range: '0-149' },
    { motsCles: 'growth marketing', natureContrat: 'E2,FS', sort: '1', range: '0-149' },
    // Stages (par mot-clé)
    { motsCles: 'stage développeur', departement: '69,75', sort: '1', range: '0-149' },
    { motsCles: 'stage product manager', sort: '1', range: '0-49' },
  ],
};

// --- Scoring ---

export const SCORING = {
  minScore: 3,
  titleMatchMinScore: 1,  // Seuil abaissé si le titre matche un high_match
  comboBonus: 3,           // Bonus si title a high_match + contract_match
  priorities: {
    high: { min: 7, label: '⭐⭐⭐' as const },
    medium: { min: 4, label: '⭐⭐' as const },
    low: { min: 3, label: '⭐' as const },
  },
};

// --- Localisation ---

export const LOCATIONS = {
  accepted: [
    'paris', 'lyon', 'remote', 'télétravail', 'full remote',
    'france', 'île-de-france', 'rhône', 'idf',
    '75', '69',  // Départements
  ],
  bonus: 2,      // +2 si localisation dans la liste
  penalty: -3,   // -3 si localisation explicitement hors zone (ex: Lille, Marseille)
  // Villes neutres (pas de penalty) — on n'a pas assez d'info pour pénaliser
  neutral: true,  // true = pas de penalty si localisation inconnue ou non matchée
};

// --- Filtre d'expérience ---

export const EXPERIENCE_FILTER = {
  maxYears: 2,          // Au-delà de 2 ans requis, malus
  penaltyPerYear: -2,   // -2 par année au-delà du seuil
  maxPenalty: -8,        // Plafond du malus
};

// --- Dédoublonnage ---

export const DEDUP = {
  windowDays: 30,
};

// --- Rate Limiting ---

export const RATE_LIMIT = {
  delayMs: 1500,
  notionDelayMs: 350,
};

// --- Sources activées ---

export const SOURCES_ENABLED: Record<string, boolean> = {
  indeed: true, // Via Bright Data Web Unlocker API
  'google-alerts': true,
  hellowork: true,
  'france-travail': true,
  wttj: true,
  'station-f': true,
  'career-pages': true,
  'linkedin-email': true,
};

// --- Variables d'environnement ---

export const ENV = {
  NOTION_API_KEY: process.env.NOTION_API_KEY ?? '',
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID ?? '',
  FRANCE_TRAVAIL_CLIENT_ID: process.env.FRANCE_TRAVAIL_CLIENT_ID ?? '',
  FRANCE_TRAVAIL_CLIENT_SECRET: process.env.FRANCE_TRAVAIL_CLIENT_SECRET ?? '',
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ?? '',
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ?? '',
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ?? '',
  BRIGHTDATA_API_KEY: process.env.BRIGHTDATA_API_KEY ?? '',
};
