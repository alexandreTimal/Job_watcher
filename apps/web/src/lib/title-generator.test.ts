import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));
vi.mock("@ai-sdk/google", () => ({
  google: (id: string) => ({ modelId: id }),
}));

import { generateText } from "ai";
import { generateTitles } from "./title-generator";
import type { GenerateTitlesInput } from "./title-generator";

const mockedGenerateText = vi.mocked(generateText);

const input: GenerateTitlesInput = {
  branch_params: {
    branch: "1",
    current_job_title: "Développeur fullstack",
    current_seniority_level: "senior",
  },
  cv_profile: {
    current_title: "Développeur fullstack",
    experience_years: 8,
    education_level: "Bac+5",
    work_history: [
      { title: "Développeur fullstack", start: "2018", end: "Present" },
    ],
  },
};

const validArbitre = {
  analyse_realite: "Ton profil senior est aligné avec tes cibles.",
  niveau_cible_effectif: "senior",
  gap_detected: "none",
  rationale_debug: "8y XP, profil aligné",
};

const validGenerator = {
  titles: [
    {
      fr: "Développeur senior",
      en: "Senior Developer",
      niveau_ordinal: "aligné",
      category: "classic_fr",
    },
  ],
};

beforeEach(() => {
  mockedGenerateText.mockReset();
});

describe("generateTitles — happy path", () => {
  it("appelle Arbitre puis Generator et agrège les metrics", async () => {
    mockedGenerateText
      .mockResolvedValueOnce({
        text: JSON.stringify(validArbitre),
        usage: { promptTokens: 500, completionTokens: 100 },
        finishReason: "stop",
      } as never)
      .mockResolvedValueOnce({
        text: JSON.stringify(validGenerator),
        usage: { promptTokens: 1500, completionTokens: 400 },
        finishReason: "stop",
      } as never);

    const result = await generateTitles(input);

    expect(mockedGenerateText).toHaveBeenCalledTimes(2);
    expect(result.arbitre.niveau_cible_effectif).toBe("senior");
    expect(result.titles).toHaveLength(1);
    expect(result.metrics.arbitre.fallback).toBe(false);
    expect(result.metrics.generator.fallback).toBe(false);
    expect(result.metrics.total_cost_usd).toBeGreaterThan(0);
  });
});

describe("generateTitles — Arbitre échoue, fallback déterministe", () => {
  it("utilise buildArbitreFallback si Arbitre échoue 2×", async () => {
    mockedGenerateText
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        text: JSON.stringify(validGenerator),
        usage: { promptTokens: 1500, completionTokens: 400 },
        finishReason: "stop",
      } as never);

    const result = await generateTitles(input);

    expect(result.metrics.arbitre.fallback).toBe(true);
    expect(result.arbitre.niveau_cible_effectif).toBe("senior");
    expect(result.arbitre.rationale_debug).toMatch(/FALLBACK/);
    expect(result.titles.length).toBeGreaterThan(0);
    expect(result.metrics.generator.fallback).toBe(false);
  });

  it("maps experience_years sur les niveaux attendus", async () => {
    mockedGenerateText
      .mockRejectedValueOnce(new Error("net"))
      .mockRejectedValueOnce(new Error("net"))
      .mockResolvedValueOnce({
        text: JSON.stringify(validGenerator),
        usage: {},
        finishReason: "stop",
      } as never);

    const junior = await generateTitles({
      ...input,
      cv_profile: { ...input.cv_profile, experience_years: 1 },
    });
    expect(junior.arbitre.niveau_cible_effectif).toBe("junior");
  });
});

describe("generateTitles — Generator échoue, fallback titres", () => {
  it("retourne les titres fallback tagués avec ordinal + category par défaut", async () => {
    mockedGenerateText
      .mockResolvedValueOnce({
        text: JSON.stringify(validArbitre),
        usage: {},
        finishReason: "stop",
      } as never)
      .mockRejectedValue(new Error("network"));

    const result = await generateTitles(input);

    expect(result.metrics.generator.fallback).toBe(true);
    expect(result.titles.length).toBeGreaterThan(0);
    for (const t of result.titles) {
      expect([
        "aligné",
        "évolution_modérée",
        "stretch_ambitieux",
        "sous-qualifié",
      ]).toContain(t.niveau_ordinal);
      expect(["classic_fr", "anglo_startup", "hard_skill"]).toContain(
        t.category,
      );
    }
  });
});

describe("generateTitles — les deux échouent", () => {
  it("retourne un résultat structurellement valide avec les deux fallbacks", async () => {
    mockedGenerateText.mockRejectedValue(new Error("down"));
    const result = await generateTitles(input);
    expect(result.arbitre).toBeDefined();
    expect(result.titles.length).toBeGreaterThan(0);
    expect(result.metrics.arbitre.fallback).toBe(true);
    expect(result.metrics.generator.fallback).toBe(true);
  });
});
