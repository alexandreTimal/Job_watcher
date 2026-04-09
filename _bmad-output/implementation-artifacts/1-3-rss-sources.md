# Story 1.3: Parser RSS Générique et Sources Indeed/Google Alerts/HelloWork

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux collecter les offres depuis les flux RSS Indeed, Google Alerts et HelloWork,
Afin d'avoir mes premières offres dans le pipeline.

## Acceptance Criteria

1. `src/utils/rss-parser.ts` gère le parsing RSS 2.0 et Atom de manière générique
2. `src/sources/indeed-rss.ts` retourne des JobOffer[] depuis les URLs RSS Indeed configurées
3. `src/sources/google-alerts-rss.ts` retourne des JobOffer[] depuis les flux Atom Google Alerts
4. `src/sources/hellowork-rss.ts` retourne des JobOffer[] depuis les flux RSS HelloWork
5. Un délai configurable (RATE_LIMIT.delayMs) est respecté entre les requêtes HTTP
6. Chaque source wrappe ses appels dans try/catch et retourne [] en cas d'erreur
7. Les logs indiquent le nombre d'offres récupérées par source

## Tasks / Subtasks

- [ ] Task 1 (AC: 1) Créer src/utils/rss-parser.ts
  - [ ] Utiliser la lib `rss-parser` pour parser RSS 2.0
  - [ ] Gérer aussi le format Atom (Google Alerts) — rss-parser supporte les deux
  - [ ] Exporter `parseRssFeed(url: string): Promise<RssItem[]>` avec type RssItem (title, link, content, pubDate)
  - [ ] Gérer les erreurs réseau/parsing gracieusement (log + return [])
- [ ] Task 2 (AC: 2, 5-7) Créer src/sources/indeed-rss.ts
  - [ ] Importer les URLs depuis config.ts (RSS_URLS.indeed)
  - [ ] Itérer sur chaque URL avec sleep(RATE_LIMIT.delayMs) entre chaque requête
  - [ ] Mapper chaque RssItem en JobOffer: title, link→url, description, pubDate→publishedAt, source='indeed'
  - [ ] Extraire company depuis le titre si présent (pattern "Titre - Entreprise")
  - [ ] Exporter `fetchOffers(): Promise<JobOffer[]>`
  - [ ] try/catch global, return [] en cas d'erreur, logger.error avec contexte
  - [ ] logger.info avec le nombre d'offres récupérées
- [ ] Task 3 (AC: 3, 5-7) Créer src/sources/google-alerts-rss.ts
  - [ ] Importer les URLs depuis config.ts (RSS_URLS.googleAlerts)
  - [ ] Parser le format Atom — le contenu est du HTML encodé dans <content>
  - [ ] Extraire titre, lien source, et snippet depuis le HTML
  - [ ] Mapper en JobOffer avec source='google-alerts'
  - [ ] Rate limiting + try/catch + logging (même pattern que Indeed)
- [ ] Task 4 (AC: 4, 5-7) Créer src/sources/hellowork-rss.ts
  - [ ] Même pattern que indeed-rss.ts
  - [ ] source='hellowork'
  - [ ] URLs depuis config.ts (RSS_URLS.hellowork)

## Dev Notes

- La lib rss-parser (npm) gère nativement RSS 2.0 et Atom — pas besoin de deux parsers
- Pour Google Alerts, le contenu Atom contient du HTML encodé — il faut le décoder et extraire les liens
- Chaque source est un fichier autonome qui exporte fetchOffers() — elle ne connaît rien du pipeline
- Pattern commun à toutes les sources: import config → itérer URLs → parse → map JobOffer → try/catch → log
- Le rate limiting est ENTRE les requêtes d'une même source (pas entre sources — elles tournent en parallèle)
- ATTENTION: les imports TypeScript ESM nécessitent l'extension .js (ex: `import { sleep } from '../utils/sleep.js'`)

### Project Structure Notes

- src/utils/rss-parser.ts — utilitaire générique, réutilisé par les 3 sources RSS
- src/sources/indeed-rss.ts, google-alerts-rss.ts, hellowork-rss.ts — 3 modules autonomes
- Chaque source utilise createLogger('INDEED'), createLogger('GOOGLE_ALERTS'), etc.

### References

- [Source: prd.md#Sources détaillées — Indeed RSS]
- [Source: prd.md#Sources détaillées — Google Alerts RSS]
- [Source: prd.md#Sources détaillées — HelloWork RSS]
- [Source: architecture.md#Patterns de Structure — Organisation des sources]
- [Source: architecture.md#Patterns de Gestion d'Erreurs]
