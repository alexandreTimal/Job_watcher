/**
 * Hard filters — eliminate offers that don't match mandatory criteria.
 * Collectively 60-70% of the final score.
 */

interface UserContext {
  branch: string | null;
  calibrationAnswers: Record<string, unknown> | null;
  contractTypes: string[];
  salaryMin: number | null;
  remotePreference: string;
  locationMode: string;
  cities: { name: string; lat: number; lng: number; radius_km: number }[];
  defaultRadiusKm: number;
  remoteFriendly: boolean;
  currentEmployer: string | null;
}

interface OfferContext {
  contractType: string | null;
  salary: string | null;
  locationLat: number | null;
  locationLng: number | null;
  remoteType: string | null;
  requiredExperienceYears: number | null;
  company: string | null;
}

export interface HardFilterResult {
  passed: boolean;
  score: number; // 0-70
  breakdown: {
    location: number; // 0-25
    contract: number; // 0-20
    salary: number; // 0-15
    remote: number; // 0-10
  };
  disqualifyReason?: string;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function applyHardFilters(
  user: UserContext,
  offer: OfferContext,
): HardFilterResult {
  const breakdown = { location: 0, contract: 0, salary: 0, remote: 0 };

  // Branch 1 + employer exclusion (FR13)
  if (
    user.branch === "1" &&
    user.currentEmployer &&
    offer.company &&
    offer.company.toLowerCase().includes(user.currentEmployer.toLowerCase())
  ) {
    return {
      passed: false,
      score: 0,
      breakdown,
      disqualifyReason: "Employeur actuel exclu",
    };
  }

  // Branch 4 + experience filter (FR48)
  if (
    user.branch === "4" &&
    offer.requiredExperienceYears != null &&
    offer.requiredExperienceYears > 0
  ) {
    return {
      passed: false,
      score: 0,
      breakdown,
      disqualifyReason: "Offre avec expérience requise (reconversion)",
    };
  }

  // Location scoring (0-25)
  if (user.locationMode === "remote_only") {
    breakdown.location =
      offer.remoteType === "full_remote" ? 25 : offer.remoteType === "hybrid" ? 10 : 0;
  } else if (user.locationMode === "france") {
    breakdown.location = 25; // All France locations are valid
  } else if (
    user.cities.length > 0 &&
    offer.locationLat != null &&
    offer.locationLng != null
  ) {
    let minDist = Infinity;
    let bestRadius = user.defaultRadiusKm;
    for (const city of user.cities) {
      const dist = haversineKm(
        city.lat,
        city.lng,
        offer.locationLat,
        offer.locationLng,
      );
      if (dist < minDist) {
        minDist = dist;
        bestRadius = city.radius_km;
      }
    }
    if (minDist <= bestRadius) {
      breakdown.location = Math.round(25 * (1 - minDist / bestRadius));
    }
  } else {
    breakdown.location = 12; // No geo data — neutral
  }

  // Contract matching (0-20)
  if (user.contractTypes.length === 0) {
    breakdown.contract = 20; // No preference = accept all
  } else if (
    offer.contractType &&
    user.contractTypes.some(
      (ct) =>
        ct.toLowerCase() === offer.contractType!.toLowerCase() ||
        offer.contractType!.toLowerCase().includes(ct.toLowerCase()),
    )
  ) {
    breakdown.contract = 20;
  }

  // Salary matching (0-15)
  if (user.salaryMin == null || !offer.salary) {
    breakdown.salary = 10; // No data — neutral
  } else {
    const match = offer.salary.match(/(\d[\d\s]*)/);
    if (match) {
      const parsed = parseInt(match[1]!.replace(/\s/g, ""), 10);
      if (parsed >= user.salaryMin) {
        breakdown.salary = 15;
      } else if (parsed >= user.salaryMin * 0.9) {
        breakdown.salary = 8;
      }
    } else {
      breakdown.salary = 7;
    }
  }

  // Remote preference matching (0-10)
  if (user.remoteFriendly && offer.remoteType === "full_remote") {
    breakdown.remote = 10;
  } else if (user.remoteFriendly && offer.remoteType === "hybrid") {
    breakdown.remote = 7;
  } else if (!user.remoteFriendly) {
    breakdown.remote = offer.remoteType === "on_site" ? 10 : 5;
  } else {
    breakdown.remote = 5;
  }

  const score =
    breakdown.location + breakdown.contract + breakdown.salary + breakdown.remote;

  return { passed: score > 15, score, breakdown };
}
