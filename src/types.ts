export interface JobOffer {
  title: string;
  company: string | null;
  url: string;
  source: string;
  location: string | null;
  contractType: string | null;
  publishedAt: Date | null;
  description: string | null;
}

export interface ScoredOffer extends JobOffer {
  score: number;
  priority: '\u2B50' | '\u2B50\u2B50' | '\u2B50\u2B50\u2B50';
  _hash?: string;
}

export interface Source {
  name: string;
  enabled: boolean;
  fetchOffers: () => Promise<JobOffer[]>;
}

export interface RunContext {
  dryRun: boolean;
  verbose: boolean;
}
