# Story 3.1: Source France Travail API

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux collecter les offres depuis l'API France Travail,
Afin de couvrir le plus grand job board public français.

## Acceptance Criteria

1. Un token OAuth2 est obtenu via client_credentials avant chaque collecte
2. Les offres sont récupérées via GET /partenaire/offresdemploi/v2/offres/search
3. Les paramètres configurés (motsCles, typeContrat, departement) sont utilisés
4. Les résultats JSON sont mappés en JobOffer[]
5. Le rate limiting est respecté entre les requêtes
6. En cas d'erreur (token expiré, réseau), la source retourne [] et log l'erreur

## Tasks / Subtasks

- [ ] Task 1 (AC: 1) Implémenter l'authentification OAuth2
  - [ ] POST https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire
  - [ ] Body: grant_type=client_credentials, client_id, client_secret, scope=api_offresdemploiv2 o2dsoffre
  - [ ] Content-Type: application/x-www-form-urlencoded
  - [ ] Extraire access_token de la réponse JSON
- [ ] Task 2 (AC: 2-4) Implémenter la recherche d'offres
  - [ ] GET https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search
  - [ ] Headers: Authorization Bearer {access_token}
  - [ ] Params: motsCles, typeContrat=E2,NS (alternance, stage), departement=69,75, sort=1, range=0-149
  - [ ] Parser réponse JSON: resultats[] → mapper en JobOffer[]
  - [ ] Mapping: id→url (construire URL), intitule→title, entreprise.nom→company, lieuTravail.libelle→location, typeContrat→contractType, dateCreation→publishedAt, origineOffre.urlOrigine→url
- [ ] Task 3 (AC: 5-6) Rate limiting et gestion d'erreurs
  - [ ] sleep(RATE_LIMIT.delayMs) entre les pages si pagination
  - [ ] try/catch global, return [] en cas d'erreur
  - [ ] Logger le nombre d'offres récupérées

## Dev Notes

- Documentation API: https://francetravail.io/data/api/offres-emploi
- L'authentification OAuth2 utilise client_credentials (pas de user interaction)
- Le scope exact est "api_offresdemploiv2 o2dsoffre" (espace, pas virgule)
- Les résultats sont paginés via range (0-149 = 150 premiers résultats)
- Le champ origineOffre.urlOrigine contient l'URL directe de l'offre
- Si origineOffre est absent, construire l'URL: https://candidat.francetravail.fr/offres/recherche/detail/{id}
- FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET depuis .env

### References

- [Source: prd.md#France Travail API]
- [Source: architecture.md#Communication & APIs]
