# Story 1.5: Orchestrateur et Modes d'Exécution

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux exécuter le pipeline complet avec les flags --dry-run et --verbose,
Afin de lancer la collecte en mode production ou en mode test.

## Acceptance Criteria

1. `src/index.ts` orchestre le pipeline complet: sources → validation → scoring → dédoublonnage → log résumé
2. Toutes les sources activées sont exécutées en parallèle via Promise.allSettled
3. Un résumé est loggé: X offres scannées, Y filtrées, Z nouvelles
4. Le code retour est 0 si au moins une source a fonctionné, 1 sinon
5. Le flag --dry-run empêche toute écriture dans SQLite (seen_offers insert) et affiche les résultats en console
6. Le flag --verbose active les logs DEBUG
7. Les flags sont parsés via util.parseArgs natif Node.js 20+

## Tasks / Subtasks

- [ ] Task 1 (AC: 7) Parser les flags CLI
  - [ ] Utiliser `import { parseArgs } from 'node:util'`
  - [ ] Définir les options: --dry-run (boolean), --verbose (boolean)
  - [ ] Construire le RunContext: { dryRun, verbose }
- [ ] Task 2 (AC: 1-2) Orchestrer le pipeline
  - [ ] Importer toutes les sources depuis src/sources/
  - [ ] Filtrer les sources activées (config.sources[name].enabled)
  - [ ] Exécuter en parallèle: `Promise.allSettled(sources.map(s => s.fetchOffers()))`
  - [ ] Agréger les résultats: flatten les fulfilled, logger les rejected
  - [ ] Pipeline séquentiel: validateOffers() → scoreOffers() → deduplicateOffers()
- [ ] Task 3 (AC: 5) Implémenter le mode dry-run
  - [ ] Si context.dryRun: ne pas appeler sqlite.insertOffer() dans dedup
  - [ ] Si context.dryRun: ne pas appeler notion (Epic 2)
  - [ ] Afficher les offres qui auraient été ajoutées en console
- [ ] Task 4 (AC: 3, 6) Logger le résumé et gérer verbose
  - [ ] Compter: total offres brutes, après validation, après scoring, après dédoublonnage
  - [ ] Logger: `[timestamp] [MAIN] INFO: Run terminé — 47 scannées, 12 filtrées, 8 nouvelles`
  - [ ] Si verbose: logger le détail de chaque offre traitée (titre, score, statut)
- [ ] Task 5 (AC: 4) Gérer le code retour
  - [ ] Compter les sources fulfilled vs rejected dans Promise.allSettled
  - [ ] Si toutes rejected: process.exit(1)
  - [ ] Sinon: process.exit(0)

## Dev Notes

- `util.parseArgs` est natif Node.js 20+ — pas besoin de lib externe (minimist, commander)
- L'import des sources se fait statiquement — pas de dynamic import
- Promise.allSettled retourne PromiseSettledResult[] — vérifier .status === 'fulfilled' vs 'rejected'
- En mode dry-run, le pipeline tourne normalement sauf les effets de bord (DB write, Notion)
- Le Notion client n'existe pas encore (Epic 2) — prévoir un placeholder conditionnel
- ATTENTION: process.exit() doit être appelé APRÈS la fermeture de la DB SQLite

### Project Structure Notes

- src/index.ts — entry point unique, orchestre tout
- Import statique de toutes les sources + filters + store
- Le flag --dry-run est propagé via RunContext dans tout le pipeline

### References

- [Source: prd.md#Orchestration (index.ts)]
- [Source: architecture.md#Décisions Architecturales — Arguments CLI]
- [Source: architecture.md#Patterns de Communication — Orchestrateur → Sources]
- [Source: architecture.md#Décisions Architecturales — Retry logic]
