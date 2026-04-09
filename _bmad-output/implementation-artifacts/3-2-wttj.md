# Story 3.2: Source WTTJ

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux collecter les offres depuis Welcome to the Jungle,
Afin de couvrir le principal job board tech/startup français.

## Acceptance Criteria

1. Les offres sont récupérées depuis WTTJ (API interne ou scraping Playwright)
2. Les résultats sont mappés en JobOffer[] (titre, entreprise, localisation, type contrat, lien, date)
3. En cas de changement de structure HTML, l'erreur est loggée avec le sélecteur qui a échoué
4. La source retourne [] en cas d'erreur

## Tasks / Subtasks

- [ ] Task 1 (AC: 1) Tenter l'API interne WTTJ
  - [ ] Inspecter l'API: GET https://www.welcometothejungle.com/api/v1/jobs?query=...
  - [ ] Si l'API fonctionne: parser le JSON directement
  - [ ] Si l'API échoue (403, changement): fallback Playwright
- [ ] Task 2 (AC: 1) Implémenter le fallback Playwright
  - [ ] npm install playwright (devDependency si possible, sinon dependency)
  - [ ] Lancer un browser headless chromium
  - [ ] Naviguer vers les URLs de recherche WTTJ configurées dans config.ts
  - [ ] Attendre le rendu JS (WTTJ est une app React)
  - [ ] Extraire les offres depuis le DOM rendu
- [ ] Task 3 (AC: 2) Mapper les résultats en JobOffer[]
  - [ ] Extraire: titre, entreprise, localisation, type contrat, lien, tags/stack
  - [ ] source = 'wttj'
  - [ ] Construire l'URL complète de l'offre
- [ ] Task 4 (AC: 3-4) Gestion d'erreurs
  - [ ] try/catch avec log du sélecteur CSS qui a échoué
  - [ ] Logger: `[WTTJ] ERROR: Selector .sc-xxx not found (url: https://...)`
  - [ ] return []
  - [ ] Fermer le browser Playwright dans un finally block

## Dev Notes

- WTTJ utilise du rendu côté client React — le HTML statique ne contient pas les offres
- Option A (préférée): utiliser l'API interne si elle fonctionne encore
- Option B (fallback): Playwright headless pour le rendu JS
- Playwright est lourd (~50MB) — vérifier que GitHub Actions le supporte (ubuntu-latest oui)
- Les URLs de recherche sont dans config.ts (WTTJ_SEARCH_URLS)
- Les sélecteurs CSS peuvent changer — les rendre configurables dans config.ts
- ATTENTION: Playwright nécessite `npx playwright install chromium` pour télécharger le browser

### Project Structure Notes

- src/sources/wttj.ts — module autonome
- Playwright est une dépendance optionnelle (le script ne crash pas si pas installé — fallback gracieux)

### References

- [Source: prd.md#Welcome to the Jungle]
- [Source: architecture.md#Stratégie de Mitigation des Risques — APIs non documentées]
