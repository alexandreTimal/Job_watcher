import type { JobOffer, ScoredOffer } from '../types.js';
import { KEYWORDS, SCORING, LOCATIONS, EXPERIENCE_FILTER } from '../config.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('FILTER');

// --- Axe 1: Word boundary matching (pas de sous-chaînes) ---

function matchesTerm(text: string, term: string): boolean {
  // Pour les termes courts (≤3 chars comme "AI", "IA", "API"), utiliser word boundary strict
  // Pour les termes longs, utiliser word boundary souple (gère les tirets, accents)
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (term.length <= 3) {
    // Strict: doit être entouré de non-lettres
    return new RegExp(`(?:^|[\\s,;.()\\-/])${escaped}(?:[\\s,;.()\\-/]|$)`, 'i').test(text);
  }
  // Souple: word boundary classique
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

// --- Axe 3: Filtre d'expérience ---

function extractExperienceYears(text: string): number | null {
  // Patterns: "5 ans d'expérience", "3+ years", "minimum 4 ans", "expérience de 5 ans"
  const patterns = [
    /(\d+)\+?\s*ans?\s*d['']?exp[ée]rience/i,
    /(\d+)\+?\s*years?\s*(?:of\s+)?experience/i,
    /exp[ée]rience\s*(?:de\s+)?(\d+)\+?\s*ans?/i,
    /minimum\s+(\d+)\s*ans?/i,
    /(\d+)\s*(?:à|-)?\s*\d*\s*ans?\s*d['']?exp/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

function calculateExperiencePenalty(text: string): number {
  const years = extractExperienceYears(text);
  if (years === null || years <= EXPERIENCE_FILTER.maxYears) return 0;

  const excess = years - EXPERIENCE_FILTER.maxYears;
  return Math.max(EXPERIENCE_FILTER.maxPenalty, excess * EXPERIENCE_FILTER.penaltyPerYear);
}

// --- Axe 2: Filtre géographique ---

function calculateLocationBonus(location: string | null): number {
  if (!location) return 0;

  const loc = location.toLowerCase();

  for (const accepted of LOCATIONS.accepted) {
    if (loc.includes(accepted)) return LOCATIONS.bonus;
  }

  // Si localisation explicite mais pas dans la liste
  if (LOCATIONS.neutral) return 0;
  return LOCATIONS.penalty;
}

// --- Axe 4: Scoring amélioré ---

function calculateScore(offer: JobOffer): { score: number; titleHasHighMatch: boolean; hasCombo: boolean } {
  const title = offer.title.toLowerCase();
  const fullText = `${offer.title} ${offer.description ?? ''}`.toLowerCase();

  let score = 0;
  let titleHasHighMatch = false;
  let titleHasContractMatch = false;

  // Score par catégorie avec word boundary matching
  for (const [category, data] of Object.entries(KEYWORDS)) {
    for (const term of data.terms) {
      const termLower = term.toLowerCase();

      if (category === 'negative') {
        // Les négatifs : poids réduit de -5 à -3, et ignorés si high_match dans le titre
        if (matchesTerm(fullText, termLower)) {
          score += -3; // Adouci (Axe 4)
        }
      } else {
        if (matchesTerm(fullText, termLower)) {
          score += data.weight;

          // Track title matches pour combo et seuil dynamique
          if (category === 'high_match' && matchesTerm(title, termLower)) {
            titleHasHighMatch = true;
          }
          if (category === 'contract_match' && matchesTerm(title, termLower)) {
            titleHasContractMatch = true;
          }
        }
      }
    }
  }

  // Axe 4: Bonus combo (high_match + contract_match dans le titre)
  const hasCombo = titleHasHighMatch && titleHasContractMatch;
  if (hasCombo) {
    score += SCORING.comboBonus;
  }

  // Axe 2: Bonus/malus géographique
  score += calculateLocationBonus(offer.location);

  // Axe 3: Malus expérience
  score += calculateExperiencePenalty(fullText);

  return { score, titleHasHighMatch, hasCombo };
}

function getPriority(score: number): ScoredOffer['priority'] {
  if (score >= SCORING.priorities.high.min) return '⭐⭐⭐';
  if (score >= SCORING.priorities.medium.min) return '⭐⭐';
  return '⭐';
}

export function scoreOffers(offers: JobOffer[]): ScoredOffer[] {
  const scored: ScoredOffer[] = [];
  let filtered = 0;

  for (const offer of offers) {
    const { score, titleHasHighMatch } = calculateScore(offer);

    // Axe 4: Seuil dynamique — abaissé si le titre matche un high_match
    const minScore = titleHasHighMatch ? SCORING.titleMatchMinScore : SCORING.minScore;

    if (score < minScore) {
      filtered++;
      continue;
    }

    scored.push({
      ...offer,
      score,
      priority: getPriority(score),
    });
  }

  logger.info(`${scored.length} offres retenues, ${filtered} filtrées (score < seuil)`);
  return scored;
}
