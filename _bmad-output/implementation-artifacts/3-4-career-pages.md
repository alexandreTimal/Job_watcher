# Story 3.4: Monitoring Pages Carrières

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux être informé quand une entreprise ciblée publie de nouvelles offres sur sa page carrières,
Afin de détecter des opportunités invisibles sur les job boards.

## Acceptance Criteria

1. Les pages carrières configurées (14+ URLs) sont récupérées avec Cheerio
2. Le contenu pertinent est extrait via un sélecteur CSS configurable par site
3. Un hash SHA-256 du contenu normalisé est calculé et comparé au hash précédent dans page_hashes
4. Si le hash a changé, une JobOffer est créée avec le titre "[Changement détecté] {nom entreprise}"
5. Le nouveau hash est sauvegardé dans page_hashes
6. Le rate limiting est respecté entre les requêtes

## Tasks / Subtasks

- [ ] Task 1 (AC: 1-2) Fetch et extraction du contenu
  - [ ] Importer CAREER_PAGES depuis config.ts: Array<{ name: string, url: string, selector: string }>
  - [ ] Pour chaque page: fetch avec user-agent réaliste
  - [ ] Parser avec Cheerio, extraire le contenu via le sélecteur CSS configuré
  - [ ] Normaliser le contenu: trim, supprimer les espaces multiples, lowercase
- [ ] Task 2 (AC: 3-5) Détection de changements par hash
  - [ ] Calculer SHA-256 du contenu normalisé (crypto.createHash natif)
  - [ ] Comparer avec le hash stocké dans page_hashes via sqlite.getPageHash(url)
  - [ ] Si pas de hash précédent: stocker le hash initial (premier run), pas de notification
  - [ ] Si hash différent: créer une JobOffer avec titre "[Changement détecté] {name}", url, source='career-page'
  - [ ] Mettre à jour page_hashes via sqlite.updatePageHash(url, newHash)
- [ ] Task 3 (AC: 6) Rate limiting et gestion d'erreurs
  - [ ] sleep(RATE_LIMIT.delayMs) entre chaque page
  - [ ] try/catch par page individuelle (une page en erreur ne bloque pas les autres)
  - [ ] Logger les erreurs avec URL et sélecteur

## Dev Notes

- Les 14+ URLs de pages carrières sont dans le PRD (section Monitoring pages carrières)
- Chaque page a un sélecteur CSS différent — configurable dans config.ts
- Sélecteur par défaut: 'main' ou 'body' si pas de sélecteur spécifique
- Au premier run (pas de hash dans page_hashes), on stocke le hash sans créer de JobOffer — sinon toutes les pages seraient détectées comme "changées"
- Le hash diff ne détecte pas QUELLES offres sont nouvelles — juste qu'il y a eu un changement
- L'utilisateur clique ensuite sur le lien pour voir les détails sur le site de l'entreprise
- crypto.createHash est natif Node.js — même pattern que dans dedup.ts

### References

- [Source: prd.md#Monitoring pages carrières]
- [Source: prd.md#Pages à surveiller (14 URLs)]
- [Source: architecture.md#Patterns de Gestion d'Erreurs]
