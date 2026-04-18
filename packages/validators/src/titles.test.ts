import { describe, expect, it } from "vitest";
import {
  arbitreOutputSchema,
  llmTitleOutputSchema,
  searchTitleSchema,
} from "./onboarding";

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

describe("searchTitleSchema (refactor V1)", () => {
  const validTitle = {
    fr: "Développeur senior",
    en: "Senior Developer",
    niveau_ordinal: "aligné",
    category: "classic_fr",
  };

  it("accepte un titre complet", () => {
    expect(searchTitleSchema.parse(validTitle)).toEqual(validTitle);
  });

  it("rejette niveau_ordinal hors enum", () => {
    expect(() =>
      searchTitleSchema.parse({ ...validTitle, niveau_ordinal: "parfait" }),
    ).toThrow();
  });

  it("rejette category hors enum", () => {
    expect(() =>
      searchTitleSchema.parse({ ...validTitle, category: "autre" }),
    ).toThrow();
  });

  it("rejette fr=null ET en=null simultanément", () => {
    expect(() =>
      searchTitleSchema.parse({ ...validTitle, fr: null, en: null }),
    ).toThrow();
  });

  it("accepte fr=null si en présent", () => {
    expect(searchTitleSchema.parse({ ...validTitle, fr: null })).toMatchObject({
      fr: null,
      en: "Senior Developer",
    });
  });
});

describe("llmTitleOutputSchema (refactor V1)", () => {
  const makeTitle = (n: number) => ({
    fr: `Titre ${n}`,
    en: null,
    niveau_ordinal: "aligné" as const,
    category: "classic_fr" as const,
  });

  it("accepte 1 à 30 titres", () => {
    expect(
      llmTitleOutputSchema.parse({ titles: [makeTitle(1)] }).titles,
    ).toHaveLength(1);
    expect(
      llmTitleOutputSchema.parse({
        titles: Array.from({ length: 30 }, (_, i) => makeTitle(i)),
      }).titles,
    ).toHaveLength(30);
  });

  it("rejette 0 titres", () => {
    expect(() => llmTitleOutputSchema.parse({ titles: [] })).toThrow();
  });

  it("rejette plus de 30 titres", () => {
    const titles = Array.from({ length: 31 }, (_, i) => makeTitle(i));
    expect(() => llmTitleOutputSchema.parse({ titles })).toThrow();
  });
});
