import type { Preferences } from "@jobfindeer/validators";

interface OfferData {
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  contractType: string | null;
}

interface ProfileData {
  skills: string[];
  currentLocation: string | null;
  experienceYears: number | null;
}

export interface ScoringResult {
  score: number;
  matchedCriteria: { criterion: string; points: number }[];
  disqualified: boolean;
}

const WEIGHTS = {
  skillMatch: 3,
  contractMatch: 2,
  locationMatch: 2,
  salaryMatch: 2,
  negativeKeyword: -100,
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function textContains(text: string, keyword: string): boolean {
  return normalize(text).includes(normalize(keyword));
}

export function scoreOffer(
  offer: OfferData,
  profile: ProfileData,
  preferences: Preferences,
): ScoringResult {
  const matched: ScoringResult["matchedCriteria"] = [];

  // Check negative keywords first
  for (const neg of preferences.negativeKeywords) {
    if (
      textContains(offer.title, neg) ||
      (offer.company && textContains(offer.company, neg))
    ) {
      return { score: 0, matchedCriteria: [{ criterion: `neg:${neg}`, points: 0 }], disqualified: true };
    }
  }

  // Skills match
  for (const skill of profile.skills) {
    if (textContains(offer.title, skill)) {
      matched.push({ criterion: skill, points: WEIGHTS.skillMatch });
    }
  }

  // Contract type match
  if (offer.contractType && preferences.contractTypes.length > 0) {
    for (const ct of preferences.contractTypes) {
      if (textContains(offer.contractType, ct)) {
        matched.push({ criterion: ct, points: WEIGHTS.contractMatch });
        break;
      }
    }
  }

  // Location match
  if (offer.location && preferences.preferredLocation) {
    if (textContains(offer.location, preferences.preferredLocation)) {
      matched.push({ criterion: preferences.preferredLocation, points: WEIGHTS.locationMatch });
    }
  }

  // Salary range match
  if (offer.salary && (preferences.salaryMin || preferences.salaryMax)) {
    const salaryNumbers = offer.salary.match(/\d+/g)?.map(Number);
    if (salaryNumbers && salaryNumbers.length > 0) {
      const avgSalary = salaryNumbers.reduce((a, b) => a + b, 0) / salaryNumbers.length;
      const inRange =
        (!preferences.salaryMin || avgSalary >= preferences.salaryMin) &&
        (!preferences.salaryMax || avgSalary <= preferences.salaryMax);
      if (inRange) {
        matched.push({ criterion: `${avgSalary}k`, points: WEIGHTS.salaryMatch });
      }
    }
  }

  const score = matched.reduce((sum, m) => sum + m.points, 0);
  return { score, matchedCriteria: matched, disqualified: false };
}
