# Story 3.3: Source Station F

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux collecter les offres depuis le job board Station F,
Afin de détecter les opportunités dans l'écosystème startup français.

## Acceptance Criteria

1. La page https://jobs.stationf.co/jobs est récupérée et parsée via Cheerio
2. Les cartes d'offres sont extraites (titre, entreprise, localisation, type contrat, lien)
3. Les résultats sont mappés en JobOffer[]
4. La source retourne [] en cas d'erreur avec log contextuel

## Tasks / Subtasks

- [ ] Task 1 (AC: 1) Fetch et parse la page
  - [ ] npm install cheerio (si pas déjà installé)
  - [ ] fetch('https://jobs.stationf.co/jobs') avec user-agent réaliste
  - [ ] Charger le HTML dans Cheerio: cheerio.load(html)
- [ ] Task 2 (AC: 2-3) Extraire les offres
  - [ ] Identifier les sélecteurs CSS des cartes d'offres (à vérifier sur le site)
  - [ ] Pour chaque carte: extraire titre, entreprise, localisation, type contrat, lien
  - [ ] Construire l'URL complète (base + href relatif si nécessaire)
  - [ ] Mapper en JobOffer[] avec source='station-f'
- [ ] Task 3 (AC: 4) Gestion d'erreurs
  - [ ] try/catch global
  - [ ] Logger l'erreur avec URL et sélecteur qui a échoué
  - [ ] return []

## Dev Notes

- Station F job board est du HTML statique — Cheerio suffit, pas besoin de Playwright
- Les sélecteurs CSS doivent être vérifiés manuellement sur le site avant implémentation
- User-agent: utiliser un user-agent de navigateur réaliste pour éviter le blocage
- Cheerio API: $('selector').each((i, el) => { ... })
- Le site peut changer sa structure — rendre les sélecteurs configurables dans config.ts si possible

### References

- [Source: prd.md#Station F Job Board]
- [Source: architecture.md#Patterns de Gestion d'Erreurs]
