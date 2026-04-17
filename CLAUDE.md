# CLAUDE.md — Guide de collaboration agent ↔ repo

Ce fichier documente les conventions que tout agent (Claude Code, Copilot, etc.)
doit respecter avant de modifier le projet. Les règles ici priment sur les
habitudes par défaut de l'agent.

## Gestion des prompts LLM

**Règle** : tout prompt envoyé à un LLM dans `apps/web` vit dans
`apps/web/src/lib/prompts/`. Aucune chaîne de prompt n'est écrite inline dans
le code d'orchestration (routes, services, hooks).

### Organisation

```
apps/web/src/lib/prompts/
  index.ts              # barrel d'export (seule surface publique)
  cv-extraction.ts      # prompt CV → profil structuré
  intent-analysis.ts    # prompt classification d'intention onboarding
  title-generation.ts   # system + 5 builders de titres (1 par branche)
```

### Format obligatoire d'un fichier de prompt

Chaque fichier de prompt commence par un bloc JSDoc qui décrit :

- **Où** : fichier(s) consommateur(s) et point d'entrée déclencheur
  (route API, handler, cron…).
- **À quoi il sert** : objectif métier du prompt en 1–3 phrases.
- **Modèle ciblé** : nom du modèle par défaut et options clés
  (structuredOutputs, responseMimeType, temperature si non standard).
- **Forme de sortie** : schéma attendu (référence au Zod schema consommateur).
- **Sécurité** *(si pertinent)* : mitigation prompt injection, sanitisation
  des inputs utilisateur.

Le prompt lui-même est exporté :

- comme **constante nommée** (`export const X_PROMPT = \`…\``) quand il est statique ;
- comme **fonction pure** (`export function buildXPrompt(params): string`)
  quand il dépend d'entrées dynamiques. La fonction **n'effectue aucun I/O**
  et **n'appelle pas le LLM** : elle renvoie uniquement la chaîne finale.

### Sanitisation des inputs utilisateur

Les builders qui interpolent du texte venant de l'utilisateur reçoivent les
helpers de sanitisation (`sanitize`, `sanitizeArray`) depuis l'appelant, via un
paramètre `helpers`. Cela garde la responsabilité de la stratégie
anti-injection dans le module d'orchestration tout en laissant le template
centralisé. Exemple : `title-generator.ts` → `buildTitleGenUserPrompt`.

### Import côté consommateur

Toujours importer depuis le barrel :

```ts
import { buildCvExtractionPrompt } from "~/lib/prompts";
// pas: import { ... } from "~/lib/prompts/cv-extraction";
```

### Check-list avant d'ajouter un nouveau prompt

1. Créer un fichier dans `apps/web/src/lib/prompts/` portant le nom du cas
   d'usage (kebab-case).
2. Ajouter le bloc JSDoc (Où / À quoi il sert / Modèle / Sortie / Sécurité).
3. Exporter la constante ou le builder pur.
4. Réexporter depuis `prompts/index.ts`.
5. Dans le consommateur, n'écrire que l'appel SDK (`generateText`…), le
   parsing de la réponse et les métriques — jamais la chaîne de prompt.

### Pourquoi cette pratique

- Un seul endroit à ouvrir pour auditer, versionner ou traduire les prompts.
- Les consommateurs deviennent du code d'orchestration lisible (pas noyé dans
  des templates de 60 lignes).
- Les prompts peuvent être testés unitairement sans invoquer le LLM.
- Facilite la revue : un diff sur un prompt est isolé de la logique métier.
