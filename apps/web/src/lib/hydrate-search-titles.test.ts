import { describe, expect, it } from "vitest";
import { hydrateLegacySearchTitles } from "./hydrate-search-titles";

describe("hydrateLegacySearchTitles", () => {
  it("ajoute les défauts niveau_ordinal=aligné, category=classic_fr aux titres legacy sans ces champs", () => {
    const legacy = [{ fr: "Développeur senior", en: "Senior Developer" }];
    const hydrated = hydrateLegacySearchTitles(legacy);
    expect(hydrated).toEqual([
      {
        fr: "Développeur senior",
        en: "Senior Developer",
        niveau_ordinal: "aligné",
        category: "classic_fr",
      },
    ]);
  });

  it("préserve les valeurs valides quand elles sont déjà présentes", () => {
    const fresh = [
      {
        fr: "Tech Lead",
        en: null,
        niveau_ordinal: "évolution_modérée",
        category: "anglo_startup",
      },
    ];
    expect(hydrateLegacySearchTitles(fresh)).toEqual(fresh);
  });

  it("rétrograde sur le défaut quand niveau_ordinal/category sont invalides", () => {
    const corrupted = [
      { fr: "X", en: null, niveau_ordinal: "parfait", category: "autre" },
    ];
    const out = hydrateLegacySearchTitles(corrupted);
    expect(out[0]?.niveau_ordinal).toBe("aligné");
    expect(out[0]?.category).toBe("classic_fr");
  });

  it("filtre les titres avec fr=null et en=null", () => {
    const bad = [{ fr: null, en: null }, { fr: "ok", en: null }];
    const out = hydrateLegacySearchTitles(bad);
    expect(out).toHaveLength(1);
    expect(out[0]?.fr).toBe("ok");
  });

  it("retourne [] sur input non-array", () => {
    expect(hydrateLegacySearchTitles(null)).toEqual([]);
    expect(hydrateLegacySearchTitles({ titles: [] })).toEqual([]);
    expect(hydrateLegacySearchTitles(undefined)).toEqual([]);
  });
});
