import { describe, expect, it } from "vitest";
import { arbitreOutputSchema } from "./onboarding";

describe("arbitreOutputSchema", () => {
  const valid = {
    analyse_realite:
      "Tu as 3 ans d'expérience, on cadre tes ambitions sur un niveau confirmé.",
    niveau_cible_effectif: "confirmé",
    gap_detected: "mild_downgrade",
    rationale_debug: "3y XP vs demande Directeur = rétrogradation",
  };

  it("accepte un payload valide", () => {
    expect(arbitreOutputSchema.parse(valid)).toEqual(valid);
  });

  it("rejette un niveau_cible_effectif hors enum", () => {
    expect(() =>
      arbitreOutputSchema.parse({ ...valid, niveau_cible_effectif: "king" }),
    ).toThrow();
  });

  it("rejette un gap_detected hors enum", () => {
    expect(() =>
      arbitreOutputSchema.parse({ ...valid, gap_detected: "huge_gap" }),
    ).toThrow();
  });

  it("rejette analyse_realite trop courte (<10 chars)", () => {
    expect(() =>
      arbitreOutputSchema.parse({ ...valid, analyse_realite: "court" }),
    ).toThrow();
  });

  it("rejette analyse_realite trop longue (>500 chars)", () => {
    expect(() =>
      arbitreOutputSchema.parse({ ...valid, analyse_realite: "x".repeat(501) }),
    ).toThrow();
  });

  it("rejette un champ manquant", () => {
    const { rationale_debug: _removed, ...incomplete } = valid;
    expect(() => arbitreOutputSchema.parse(incomplete)).toThrow();
  });
});
