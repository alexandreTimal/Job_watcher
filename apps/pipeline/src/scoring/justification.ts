import type { ScoringResult } from "./rules-engine";

export function generateJustification(result: ScoringResult): string {
  if (result.disqualified) {
    return `Exclu — ${result.matchedCriteria[0]?.criterion ?? "mot-clé négatif"}`;
  }

  if (result.matchedCriteria.length === 0) {
    return `${result.score}% — Aucun critère matché`;
  }

  const topCriteria = result.matchedCriteria
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((m) => m.criterion);

  return `${result.score} pts — ${topCriteria.join(" + ")}`;
}
