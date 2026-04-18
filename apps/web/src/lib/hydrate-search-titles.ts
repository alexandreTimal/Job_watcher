import type {
  SearchTitle,
  SearchTitleWithActive,
} from "@jobfindeer/validators";

/**
 * Hydrate des titres lus depuis un profil persisté avant la V1 (qui n'avait
 * ni `niveau_ordinal` ni `category`). Sans ce shim, le rendu UI affiche des
 * badges undefined et la prochaine sauvegarde via `searchTitleWithActiveSchema`
 * lance une ZodError.
 */
export function hydrateLegacySearchTitles(input: unknown): SearchTitle[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((t): t is Record<string, unknown> => typeof t === "object" && t !== null)
    .map((t) => {
      const fr = typeof t.fr === "string" ? t.fr : null;
      const en = typeof t.en === "string" ? t.en : null;
      if (!fr && !en) return null;
      const niveau =
        t.niveau_ordinal === "aligné" ||
        t.niveau_ordinal === "évolution_modérée" ||
        t.niveau_ordinal === "stretch_ambitieux" ||
        t.niveau_ordinal === "sous-qualifié"
          ? t.niveau_ordinal
          : "aligné";
      const cat =
        t.category === "classic_fr" ||
        t.category === "anglo_startup" ||
        t.category === "hard_skill"
          ? t.category
          : "classic_fr";
      return { fr, en, niveau_ordinal: niveau, category: cat } satisfies SearchTitle;
    })
    .filter((t): t is SearchTitle => t !== null);
}

/** Variante avec `active`. Conserve la valeur existante, défaut `true`. */
export function hydrateLegacySearchTitlesWithActive(
  input: unknown,
): SearchTitleWithActive[] {
  if (!Array.isArray(input)) return [];
  return hydrateLegacySearchTitles(input).map((t, i) => {
    const raw = input[i] as Record<string, unknown> | undefined;
    const active = typeof raw?.active === "boolean" ? raw.active : true;
    return { ...t, active };
  });
}
