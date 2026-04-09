# Story 2.1: Client Notion et Création d'Entrées

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux que les offres pertinentes soient automatiquement ajoutées dans ma base Notion,
Afin de consulter ma veille quotidienne dans un seul endroit.

## Acceptance Criteria

1. Une page Notion est créée pour chaque offre pertinente avec toutes les propriétés requises
2. Propriétés Notion: Entreprise (title), Poste (rich text), Type contrat (select), Localisation (rich text), Source (select), Lien offre (URL), Date publication (date), Score (number), Priorité (select ⭐/⭐⭐/⭐⭐⭐), Statut (select défaut "🔵 À postuler"), Date relance (date = publication + 7 jours)
3. Un sleep(350ms) est respecté entre chaque requête (< 3 req/s, NFR11)
4. Les erreurs réseau sont gérées sans crasher le process
5. Les offres déjà vues (hash dans SQLite seen_offers.notified_notion = true) ne sont pas recréées
6. Le flag --dry-run empêche toute écriture dans Notion (log uniquement)

## Tasks / Subtasks

- [ ] Task 1 (AC: 1-2) Créer src/notifications/notion.ts
  - [ ] Utiliser fetch natif pour POST https://api.notion.com/v1/pages
  - [ ] Headers: Authorization Bearer NOTION_API_KEY, Notion-Version 2022-06-28, Content-Type application/json
  - [ ] Mapper ScoredOffer vers les propriétés Notion:
    - Entreprise: { title: [{ text: { content: company } }] }
    - Poste: { rich_text: [{ text: { content: title } }] }
    - Type contrat: { select: { name: contractType } }
    - Localisation: { rich_text: [{ text: { content: location } }] }
    - Source: { select: { name: source } }
    - Lien offre: { url: url }
    - Date publication: { date: { start: publishedAt ISO } }
    - Score: { number: score }
    - Priorité: { select: { name: priority } }
    - Statut: { select: { name: "🔵 À postuler" } }
    - Date relance: { date: { start: publishedAt + 7 jours ISO } }
  - [ ] Exporter `pushToNotion(offers: ScoredOffer[], context: RunContext): Promise<void>`
- [ ] Task 2 (AC: 3) Implémenter le rate limiting Notion
  - [ ] sleep(350ms) entre chaque POST (respecte la limite 3 req/s)
  - [ ] Logger le nombre d'entrées créées
- [ ] Task 3 (AC: 4) Gérer les erreurs
  - [ ] try/catch par requête individuelle (une offre en erreur ne bloque pas les autres)
  - [ ] Logger l'erreur avec contexte (offer title, status code, response body)
  - [ ] Continuer avec les offres suivantes
- [ ] Task 4 (AC: 5) Anti-doublons Notion
  - [ ] Après création réussie, marquer seen_offers.notified_notion = true dans SQLite
  - [ ] Avant push, filtrer les offres où notified_notion = true
- [ ] Task 5 (AC: 6) Support dry-run
  - [ ] Si context.dryRun: logger "DRY-RUN: Would create Notion page for {title}" sans appeler l'API
- [ ] Task 6 Intégrer dans l'orchestrateur
  - [ ] Ajouter l'appel pushToNotion() dans src/index.ts après le dédoublonnage
  - [ ] Conditionnel: seulement si NOTION_API_KEY et NOTION_DATABASE_ID sont définis

## Dev Notes

- Pas de SDK Notion — utiliser fetch natif (décision architecture)
- L'API Notion retourne 200 en cas de succès, 400/401/429 en cas d'erreur
- 429 = rate limited — le sleep(350ms) devrait l'éviter mais logger si ça arrive
- La Date relance = publishedAt + 7 jours — si publishedAt est null, ne pas renseigner
- Les propriétés Select (Type contrat, Source, Priorité, Statut) sont créées automatiquement par Notion si elles n'existent pas encore
- NOTION_DATABASE_ID: l'ID de la database Notion (32 chars hex, trouvable dans l'URL de la page)

### Project Structure Notes

- src/notifications/notion.ts — seul module qui communique avec Notion
- Intégration dans src/index.ts — ajouté après le pipeline de filtrage
- Utilise sqlite.ts pour marquer notified_notion

### References

- [Source: prd.md#Notification Notion API]
- [Source: prd.md#Notion API — endpoint et format JSON]
- [Source: architecture.md#Communication & APIs — Notion rate limit]
