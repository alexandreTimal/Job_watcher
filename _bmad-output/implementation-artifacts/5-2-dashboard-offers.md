# Story 5.2: Page Liste des Offres avec Filtres

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux consulter la liste de toutes les offres collectées avec des filtres,
Afin de retrouver facilement une offre spécifique.

## Acceptance Criteria

1. La page /offers affiche une table de toutes les offres (entreprise, poste, source, score, priorité, date)
2. L'utilisateur peut filtrer par source, par plage de score, par date
3. L'utilisateur peut trier par n'importe quelle colonne
4. Une API route api/offers/route.ts retourne les offres depuis SQLite en lecture seule
5. La table supporte la pagination

## Tasks / Subtasks

- [ ] Task 1 (AC: 4) Créer l'API route offers
  - [ ] src/app/api/offers/route.ts
  - [ ] GET handler avec query params: source, minScore, maxScore, startDate, endDate, page, limit
  - [ ] Query SQLite: SELECT * FROM seen_offers WHERE ... ORDER BY first_seen_at DESC LIMIT ? OFFSET ?
  - [ ] Retourner JSON: { offers: [], total: number, page: number, totalPages: number }
- [ ] Task 2 (AC: 1) Créer la page offers
  - [ ] src/app/offers/page.tsx
  - [ ] Utiliser shadcn Table pour afficher les offres
  - [ ] Colonnes: Entreprise, Poste, Source (Badge), Score, Priorité (Badge coloré), Date
  - [ ] Lien cliquable sur le poste vers l'URL de l'offre (target _blank)
- [ ] Task 3 (AC: 2) Implémenter les filtres
  - [ ] Composant OfferFilters.tsx (Client Component)
  - [ ] Select pour source (toutes les sources distinctes)
  - [ ] Input range pour score min/max
  - [ ] Date picker pour plage de dates
  - [ ] Utiliser shadcn Select, Input, Button
  - [ ] Mettre à jour l'URL avec les query params (useSearchParams)
- [ ] Task 4 (AC: 3) Implémenter le tri
  - [ ] Clic sur les headers de colonne pour trier
  - [ ] Tri ascendant/descendant toggle
  - [ ] Envoyer le paramètre sort à l'API
- [ ] Task 5 (AC: 5) Implémenter la pagination
  - [ ] Composant Pagination en bas de la table
  - [ ] 20 offres par page par défaut
  - [ ] Navigation: précédent, suivant, numéros de page
  - [ ] Utiliser shadcn Button pour la navigation

## Dev Notes

- Dépend de Story 5.1 (dashboard initialisé, SQLite connecté)
- Les filtres sont des Client Components (interactivité) qui wrappent la Table (Server Component possible)
- La pagination est côté serveur (SQL LIMIT/OFFSET) pour performer avec beaucoup d'offres
- Le tri est aussi côté serveur (ORDER BY dans la requête SQL)
- Les badges de priorité: ⭐⭐⭐ = vert, ⭐⭐ = jaune, ⭐ = gris
- Les badges de source: couleur distincte par source (indeed=bleu, wttj=violet, etc.)
- shadcn Table ne fait pas de tri/filtre natif — c'est à implémenter manuellement via l'API

### Project Structure Notes

- dashboard/src/app/offers/page.tsx — page liste
- dashboard/src/app/api/offers/route.ts — API route
- dashboard/src/components/OfferTable.tsx — composant table
- dashboard/src/components/OfferFilters.tsx — composant filtres (Client Component)

### References

- [Source: architecture.md#Structure du Projet & Frontières — dashboard/]
- [Source: prd.md#FR34 — Historique des offres]
