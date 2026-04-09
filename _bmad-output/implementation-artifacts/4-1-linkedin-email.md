# Story 4.1: Source LinkedIn via Gmail API

Status: ready-for-dev

## Story

En tant qu'utilisateur,
Je veux que les offres des alertes email LinkedIn soient intégrées dans mon pipeline,
Afin de ne pas rater les opportunités détectées par LinkedIn.

## Acceptance Criteria

1. Les emails récents de jobs-noreply@linkedin.com sont récupérés via l'API Gmail
2. Le HTML de chaque email est parsé pour extraire titre, entreprise et lien de l'offre
3. Les résultats sont mappés en JobOffer[]
4. Le token OAuth est rafraîchi automatiquement si expiré
5. La source retourne [] en cas d'erreur avec log contextuel

## Tasks / Subtasks

- [ ] Task 1 (AC: 4) Implémenter le refresh du token OAuth Gmail
  - [ ] Utiliser GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN depuis .env
  - [ ] POST https://oauth2.googleapis.com/token avec grant_type=refresh_token
  - [ ] Extraire access_token de la réponse
- [ ] Task 2 (AC: 1) Récupérer les emails LinkedIn
  - [ ] GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:jobs-noreply@linkedin.com after:{date}
  - [ ] Headers: Authorization Bearer {access_token}
  - [ ] date = date du dernier run (ou 7 jours si premier run)
  - [ ] Récupérer la liste des message IDs
  - [ ] Pour chaque ID: GET .../messages/{id}?format=full pour le contenu
- [ ] Task 3 (AC: 2-3) Parser les emails LinkedIn
  - [ ] Décoder le body base64 de l'email
  - [ ] Parser le HTML avec Cheerio
  - [ ] Extraire les blocs d'offres: titre du poste, nom de l'entreprise, lien vers l'offre LinkedIn
  - [ ] Mapper en JobOffer[] avec source='linkedin-email'
- [ ] Task 4 (AC: 5) Gestion d'erreurs
  - [ ] try/catch global, return []
  - [ ] Logger les erreurs avec contexte (API response, email parsing)
  - [ ] Si le refresh token est invalide, logger un message clair pour l'utilisateur

## Dev Notes

- L'API Gmail nécessite un projet Google Cloud avec Gmail API activée
- Le flow OAuth initial pour obtenir le refresh_token est MANUEL (hors scope de ce script)
- Le refresh_token ne expire jamais sauf si révoqué — le stocker dans .env
- Les emails LinkedIn contiennent du HTML riche — les offres sont dans des blocs structurés
- Cheerio est déjà installé (utilisé par Station F et career-pages)
- Le scope requis est gmail.readonly
- ATTENTION: les emails peuvent contenir plusieurs offres — itérer sur tous les blocs
- Rate limiting: Gmail API a un quota de 250 requêtes/utilisateur/seconde — pas un problème ici

### Project Structure Notes

- src/sources/linkedin-email.ts — module autonome
- Réutilise Cheerio (déjà installé) pour le parsing HTML des emails
- Dépend de .env pour GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN

### References

- [Source: prd.md#LinkedIn Email Alerts]
- [Source: architecture.md#Décisions Architecturales — Intégration]
