# Story 1.4: Filtrage par Scoring et Dédoublonnage

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux que les offres soient scorées par pertinence et dédoublonnées,
Afin de ne voir que les offres pertinentes sans doublons.

## Acceptance Criteria

1. Le validateur (validator.ts) vérifie les champs requis (title, url, source) et normalise les données
2. Le filtre (keyword-filter.ts) score chaque offre selon les mots-clés pondérés: high_match×3, tech_match×2, contract_match×2, context_match×1, negative×-5
3. Les offres avec score < seuil configurable (config.SCORING.minScore) sont ignorées
4. Les offres sont classifiées en 3 priorités: ⭐ (score 3), ⭐⭐ (score 4-6), ⭐⭐⭐ (score ≥7)
5. dedup.ts normalise titre+entreprise (lowercase, trim, suppression suffixes H/F), calcule le hash SHA-256
6. Le dédoublonnage vérifie dans SQLite avec une fenêtre de 30 jours configurable
7. Les nouvelles offres sont insérées dans seen_offers

## Tasks / Subtasks

- [ ] Task 1 (AC: 1) Créer src/filters/validator.ts
  - [ ] Exporter `validateOffers(offers: JobOffer[]): JobOffer[]`
  - [ ] Filtrer les offres sans title, url ou source (champs requis)
  - [ ] Trim les champs texte
  - [ ] Logger le nombre d'offres invalides rejetées
- [ ] Task 2 (AC: 2-4) Créer src/filters/keyword-filter.ts
  - [ ] Importer KEYWORDS et SCORING depuis config.ts
  - [ ] Exporter `scoreOffers(offers: JobOffer[]): ScoredOffer[]`
  - [ ] Pour chaque offre, chercher les mots-clés dans title + description (case-insensitive)
  - [ ] Calculer: score = Σ(high_match × 3) + Σ(tech_match × 2) + Σ(contract_match × 2) + Σ(context_match × 1) + Σ(negative × -5)
  - [ ] Filtrer les offres avec score < config.SCORING.minScore
  - [ ] Assigner la priorité: score ≥ 7 → '⭐⭐⭐', score 4-6 → '⭐⭐', score 3 → '⭐'
  - [ ] Retourner ScoredOffer[] (JobOffer + score + priority)
- [ ] Task 3 (AC: 5-7) Créer src/filters/dedup.ts
  - [ ] Exporter `deduplicateOffers(offers: ScoredOffer[], db: Database): ScoredOffer[]`
  - [ ] Normaliser: lowercase, trim, supprimer "(H/F)", "(F/H/X)", "(F/H)", etc.
  - [ ] Hash: SHA-256 de `normalizedTitle + '|' + normalizedCompany`
  - [ ] Utiliser crypto.createHash('sha256') natif Node.js
  - [ ] Vérifier si le hash existe dans seen_offers avec first_seen_at > (now - windowDays)
  - [ ] Insérer les nouvelles offres dans seen_offers via sqlite.insertOffer()
  - [ ] Retourner uniquement les offres non vues

## Dev Notes

- Le scoring est case-insensitive — convertir title et description en lowercase avant la recherche
- La normalisation pour le dédoublonnage supprime aussi les accents et caractères spéciaux
- crypto est un module natif Node.js — pas besoin d'install
- Le hash combine titre ET entreprise pour éviter les faux positifs (même titre, entreprise différente)
- La fenêtre de 30 jours signifie: si la même offre réapparaît après 30 jours, elle est traitée comme nouvelle
- better-sqlite3 est synchrone — les appels DB ne sont pas async

### Project Structure Notes

- src/filters/validator.ts — premier filtre du pipeline (avant scoring)
- src/filters/keyword-filter.ts — scoring après validation
- src/filters/dedup.ts — dédoublonnage après scoring (utilise SQLite)
- Pipeline séquentiel: validator → keyword-filter → dedup

### References

- [Source: prd.md#Filtrage par mots-clés et scoring]
- [Source: prd.md#Dédoublonnage]
- [Source: architecture.md#Patterns de Communication — Pipeline séquentiel]
