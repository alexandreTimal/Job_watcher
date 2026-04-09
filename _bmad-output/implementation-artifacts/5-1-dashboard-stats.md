# Story 5.1: Setup Next.js + shadcn/ui et Page Stats

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux un tableau de bord local affichant les statistiques de mes runs,
Afin de suivre l'efficacité de ma veille d'un coup d'œil.

## Acceptance Criteria

1. Le sous-projet dashboard/ est initialisé avec Next.js + shadcn/ui + Tailwind
2. La page d'accueil affiche des cartes statistiques: nombre total d'offres, offres par source, offres par priorité, offres ajoutées aujourd'hui
3. Une API route api/stats/route.ts lit la base SQLite en lecture seule
4. La page se charge en moins de 3 secondes (NFR4)
5. Le serveur écoute uniquement sur localhost (NFR8)

## Tasks / Subtasks

- [ ] Task 1 (AC: 1) Initialiser le sous-projet dashboard
  - [ ] `cd dashboard && npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint`
  - [ ] `npx shadcn@latest init` (style: default, base color: zinc, CSS variables: yes)
  - [ ] `npm install better-sqlite3 && npm install -D @types/better-sqlite3`
  - [ ] Ajouter shadcn components: `npx shadcn@latest add card table badge`
  - [ ] Configurer next.config.ts: hostname '127.0.0.1' pour localhost only
- [ ] Task 2 (AC: 3) Créer la connexion SQLite lecture seule
  - [ ] Créer src/lib/db.ts
  - [ ] Ouvrir ../data/job-watcher.db en lecture seule: `new Database(path, { readonly: true })`
  - [ ] Exporter des fonctions de requête: getStats(), getOffers(), etc.
- [ ] Task 3 (AC: 3) Créer l'API route stats
  - [ ] src/app/api/stats/route.ts
  - [ ] GET handler retournant JSON avec:
    - totalOffers: COUNT(*) FROM seen_offers
    - offersBySource: GROUP BY source
    - offersByPriority: basé sur le score (≥7, 4-6, 3)
    - todayOffers: WHERE first_seen_at >= date('now', 'start of day')
- [ ] Task 4 (AC: 2) Créer la page d'accueil avec cartes stats
  - [ ] src/app/page.tsx — Server Component qui fetch /api/stats
  - [ ] Utiliser shadcn Card pour chaque métrique
  - [ ] Afficher: total offres, offres aujourd'hui, top 3 sources, répartition priorités
  - [ ] Style dark mode par défaut (dashboard)
- [ ] Task 5 (AC: 4-5) Performance et sécurité
  - [ ] Vérifier que la page se charge < 3s (SQLite read est rapide)
  - [ ] next.config.ts: `serverExternalPackages: ['better-sqlite3']`
  - [ ] Configurer hostname 127.0.0.1 dans le script dev de package.json

## Dev Notes

- Le dashboard est un sous-projet SÉPARÉ dans /dashboard avec son propre package.json
- La DB SQLite est accédée en lecture seule — jamais de write depuis le dashboard
- Le chemin relatif vers la DB: path.resolve(__dirname, '../../data/job-watcher.db')
- better-sqlite3 doit être dans serverExternalPackages de next.config.ts (c'est un module natif)
- shadcn/ui utilise Tailwind CSS + Radix UI — les composants sont copiés dans le projet
- Pour localhost only: dans package.json scripts, "dev": "next dev -H 127.0.0.1"
- ATTENTION: Le dashboard ne peut fonctionner que si la DB existe (le script cron doit avoir tourné au moins une fois)

### Project Structure Notes

- dashboard/ — sous-projet indépendant
- dashboard/src/lib/db.ts — accès SQLite read-only
- dashboard/src/app/api/stats/route.ts — API route Next.js
- dashboard/src/app/page.tsx — page d'accueil stats

### References

- [Source: architecture.md#Tableau de Bord Local]
- [Source: architecture.md#Structure du Projet & Frontières — dashboard/]
- [Source: prd.md#FR33-35 — Tableau de bord local]
