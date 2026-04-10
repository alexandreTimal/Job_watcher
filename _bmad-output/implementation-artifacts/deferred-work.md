# Deferred Work

## Deferred from: code review of 2026-04-09-sprint0-epics2345 (2026-04-10)

- Erreurs avalées (`return []`) masquent les pannes — les sources retournent un tableau vide au lieu de remonter l'erreur, empêchant toute alerte
- Pas de rate limiting sur les sources — risque de ban IP ou dépassement quota API
- Pagination France Travail hardcodée à 150 — `range: "0-149"` perd les offres au-delà
- `publishedAt: null` systématique pour WTTJ — date de publication non extraite du DOM
- Aucun test unitaire pour validators, queue, pipeline, sources
- `z.coerce.date().nullable()` accepte des dates invalides (Invalid Date passe la validation)
- `score` sans bornes dans `feedItemSchema` — accepte négatifs et valeurs extrêmes

## Deferred from: spec-refacto-preferences-form-ux (2026-04-10)

- Mobile `PreferencesForm.tsx` utilise encore un input texte libre pour la localisation au lieu du `LocationPicker` avec Google Places. Le mapping données est correct (`locations[]`) mais l'UX reste legacy.
