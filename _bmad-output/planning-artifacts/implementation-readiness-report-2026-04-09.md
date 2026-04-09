---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage
  - step-04-ux-alignment
  - step-05-epic-quality
  - step-06-final-assessment
files:
  prd: prd.md
  architecture: architecture.md
  epics: epics.md
  ux: null
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-09
**Project:** Job_watcher

## 1. Inventaire des Documents

| Type | Fichier | Statut |
|------|---------|--------|
| PRD | `prd.md` | ✅ Trouvé |
| Architecture | `architecture.md` | ✅ Trouvé |
| Epics & Stories | `epics.md` | ✅ Trouvé |
| UX Design | — | ⚠️ Manquant |

**Note :** Aucun doublon détecté. Document UX absent — l'évaluation se poursuivra sans.

## 2. Analyse du PRD

### Exigences Fonctionnelles (41 FRs)

| ID | Domaine | Exigence |
|---|---|---|
| FR1 | Compte & Auth | Créer un compte via email/mot de passe ou OAuth Google |
| FR2 | Compte & Auth | Se connecter et se déconnecter depuis mobile et desktop |
| FR3 | Compte & Auth | Démarrer un essai gratuit de 7 jours sans carte bancaire |
| FR4 | Compte & Auth | Souscrire à un abonnement mensuel (9,90 € ou 19,90 €) |
| FR5 | Compte & Auth | Gérer son abonnement (upgrade, downgrade, annulation) |
| FR6 | Compte & Auth | Exporter l'intégralité de ses données personnelles (RGPD) |
| FR7 | Compte & Auth | Supprimer son compte et toutes ses données (droit à l'oubli) |
| FR8 | Onboarding & Profil | Uploader son CV (PDF) lors de l'onboarding |
| FR9 | Onboarding & Profil | Extraire compétences, expérience et localisation du CV via LLM |
| FR10 | Onboarding & Profil | Valider et ajuster le profil extrait par le LLM |
| FR11 | Onboarding & Profil | Définir préférences : contrat, salaire, télétravail, secteurs, périmètre géo |
| FR12 | Onboarding & Profil | Modifier préférences et profil à tout moment |
| FR13 | Onboarding & Profil | Ajouter des mots-clés négatifs pour exclure certaines offres |
| FR14 | Feed & Découverte | Consulter un feed quotidien d'offres scorées par compatibilité |
| FR15 | Feed & Découverte | Affichage par offre : titre, entreprise, salaire, localisation, contrat, score, justification |
| FR16 | Feed & Découverte | Trier les offres par swipe sur mobile (garder, écarter, mettre de côté) |
| FR17 | Feed & Découverte | Consulter offres sauvegardées sur la version web desktop |
| FR18 | Feed & Découverte | Accéder à l'offre originale via redirection one-tap vers source |
| FR19 | Feed & Découverte | Marquer une offre comme "candidaté" |
| FR20 | Feed & Découverte | Logger chaque redirection vers une source (preuve de trafic) |
| FR21 | Notifications | Notification push quotidienne avec nombre de nouvelles offres à fort match |
| FR22 | Notifications | Activer ou désactiver les notifications |
| FR23 | Pipeline Collecte | Collecter des offres via l'API officielle France Travail |
| FR24 | Pipeline Collecte | Collecter métadonnées d'offres depuis WTTJ par scraping |
| FR25 | Pipeline Collecte | Collecter offres depuis 1-2 sources complémentaires (HelloWork ou autre) |
| FR26 | Pipeline Collecte | Normaliser les offres collectées (titre, entreprise, localisation, salaire, contrat) |
| FR27 | Pipeline Collecte | Dédupliquer offres cross-sources via hash normalisé |
| FR28 | Pipeline Collecte | Purger offres expirées automatiquement (rétention courte) |
| FR29 | Pipeline Collecte | Stocker uniquement les métadonnées, jamais la description complète |
| FR30 | Pipeline Collecte | Respecter robots.txt et s'arrêter si une source bloque techniquement |
| FR31 | Scoring & Matching | Scorer chaque offre par rapport à un profil selon règles pondérées |
| FR32 | Scoring & Matching | Générer feed pré-calculé par profil via pipeline batch nocturne |
| FR33 | Scoring & Matching | Fournir une justification courte du score pour chaque offre |
| FR34 | Dashboard Ops | Consulter le taux de succès de chaque source de scraping |
| FR35 | Dashboard Ops | Recevoir alerte automatique quand un scraper casse |
| FR36 | Dashboard Ops | Consulter logs d'erreur par source avec contexte |
| FR37 | Dashboard Ops | Relancer un run de test sur une source depuis le dashboard |
| FR38 | Dashboard Ops | Consulter métriques globales (offres/jour, taux dédup, utilisateurs servis) |
| FR39 | Conformité | Traiter demande de cessation de scraping dans un délai rapide |
| FR40 | Conformité | Désactiver une source sans impact sur les autres |
| FR41 | Conformité | Conserver logs de redirection comme preuve de loyauté |

**Total FRs : 41**

### Exigences Non-Fonctionnelles (32 NFRs)

| ID | Catégorie | Exigence |
|---|---|---|
| NFR1 | Performance | Feed mobile < 2s sur 4G |
| NFR2 | Performance | First Contentful Paint < 1.5s |
| NFR3 | Performance | Time to Interactive < 3s |
| NFR4 | Performance | Bundle JS initial < 200 KB gzippé |
| NFR5 | Performance | Pipeline batch nocturne terminé avant 7h |
| NFR6 | Performance | Swipe répond en < 300ms |
| NFR7 | Sécurité | HTTPS/TLS en transit |
| NFR8 | Sécurité | Données sensibles chiffrées au repos dans Postgres |
| NFR9 | Sécurité | Mots de passe hashés bcrypt ou argon2 |
| NFR10 | Sécurité | Tokens de session avec expiration |
| NFR11 | Sécurité | Paiements délégués à Stripe, aucune donnée bancaire stockée |
| NFR12 | Sécurité | Secrets jamais exposés côté client ni commités |
| NFR13 | Scalabilité | Architecture supporte 100K MAU sans réécriture |
| NFR14 | Scalabilité | VPS initial suffit pour 100-500 utilisateurs |
| NFR15 | Scalabilité | Pipeline scraping découplé du trafic utilisateur |
| NFR16 | Scalabilité | Coût opérationnel < 5 €/client/mois |
| NFR17 | Fiabilité | Disponibilité > 99% |
| NFR18 | Fiabilité | Isolation des erreurs entre sources |
| NFR19 | Fiabilité | Backup Postgres quotidien |
| NFR20 | Fiabilité | Panne pipeline n'empêche pas consultation feed existant |
| NFR21 | Accessibilité | WCAG 2.1 AA sur les deux surfaces |
| NFR22 | Accessibilité | Zones de tap minimum 44x44px mobile |
| NFR23 | Accessibilité | Contraste texte/fond 4.5:1 minimum |
| NFR24 | Accessibilité | Navigation clavier complète desktop |
| NFR25 | Intégration | France Travail API OAuth2 client_credentials + refresh auto |
| NFR26 | Intégration | Stripe webhooks synchronisation états abonnement |
| NFR27 | Intégration | LLM via couche d'abstraction (changement provider possible) |
| NFR28 | Intégration | Gestion erreurs réseau par intégration sans crash service |
| NFR29 | Observabilité | Logs structurés par run pipeline |
| NFR30 | Observabilité | Alerte auto si taux succès source < 50% |
| NFR31 | Observabilité | Error tracking centralisé Sentry frontend et backend |
| NFR32 | Observabilité | Métriques business : MAU, swipe positif, taux redirection |

**Total NFRs : 32**

### Exigences Additionnelles

- **Contrainte coût dur :** < 5 €/client/mois (non négociable)
- **Contraintes juridiques scraping :** métadonnées only, redirection systématique, robots.txt, cessation rapide, logs redirection
- **Infra :** VPS Hetzner, Postgres, Docker Compose, Next.js PWA standalone, Caddy
- **Dev solo :** minimiser surface de maintenance
- **Deux surfaces :** PWA mobile-only + web desktop
- **Feed batch nocturne :** pas de sync temps réel
- **Pricing :** 9,90 € / 19,90 € — différenciation non détaillée dans le PRD

### Évaluation de Complétude du PRD

- ✅ PRD solide et bien structuré — 41 FRs, 32 NFRs
- ✅ Parcours utilisateur détaillés avec personas (Léa candidat, Alexandre ops)
- ✅ Contraintes juridiques explicites et stratégie par source
- ✅ Phasage clair MVP → Growth → Expansion
- ✅ Risques identifiés avec mitigations
- ⚠️ Pricing 2 paliers (9,90 € / 19,90 €) : différenciation entre paliers non détaillée
- ⚠️ KPIs scoring "à définir post-MVP" — acceptable pour MVP

## 3. Validation Couverture Epics

### Matrice de Couverture

| FR | Exigence PRD | Epic | Statut |
|---|---|---|---|
| FR1 | Créer un compte email/OAuth Google | Epic 1 (Story 1.3) | ✅ Couvert |
| FR2 | Connexion/déconnexion mobile et desktop | Epic 1 (Story 1.3) | ✅ Couvert |
| FR3 | Essai gratuit 7 jours sans carte bancaire | Epic 1 (Story 1.4) | ✅ Couvert |
| FR4 | Abonnement mensuel (9,90 € / 19,90 €) | Epic 6 (Story 6.1) | ✅ Couvert |
| FR5 | Gestion abonnement (upgrade, downgrade, annulation) | Epic 6 (Story 6.2) | ✅ Couvert |
| FR6 | Export données personnelles RGPD | Epic 6 (Story 6.3) | ✅ Couvert |
| FR7 | Suppression compte et données (droit à l'oubli) | Epic 6 (Story 6.3) | ✅ Couvert |
| FR8 | Upload CV (PDF) onboarding | Epic 4 (Story 4.1) | ✅ Couvert |
| FR9 | Extraction compétences/expérience/localisation CV via LLM | Epic 4 (Story 4.1) | ✅ Couvert |
| FR10 | Validation et ajustement profil extrait | Epic 4 (Story 4.2) | ✅ Couvert |
| FR11 | Définition préférences | Epic 4 (Story 4.2) | ✅ Couvert |
| FR12 | Modification préférences et profil à tout moment | Epic 4 (Story 4.3) | ✅ Couvert |
| FR13 | Mots-clés négatifs | Epic 4 (Story 4.3) | ✅ Couvert |
| FR14 | Feed quotidien d'offres scorées | Epic 3 (Story 3.2, 3.3) | ✅ Couvert |
| FR15 | Affichage métadonnées + score + justification | Epic 3 (Story 3.3, 3.4) | ✅ Couvert |
| FR16 | Tri par swipe mobile | Epic 3 (Story 3.3, 3.4) | ✅ Couvert |
| FR17 | Consultation offres sauvegardées desktop | Epic 5 (Story 5.1) | ✅ Couvert |
| FR18 | Redirection one-tap vers site source | Epic 5 (Story 5.1) | ✅ Couvert |
| FR19 | Marquage offre comme "candidaté" | Epic 5 (Story 5.2) | ✅ Couvert |
| FR20 | Logging redirection vers source | Epic 5 (Story 5.1) | ✅ Couvert |
| FR21 | Notification quotidienne nouvelles offres à fort match | Epic 7 (Story 7.3) | ⚠️ Divergence |
| FR22 | Activer/désactiver notifications | Epic 7 (Story 7.3) | ✅ Couvert |
| FR23 | Collecte offres via API France Travail | Epic 2 (Story 2.2) | ✅ Couvert |
| FR24 | Collecte métadonnées WTTJ par scraping | Epic 2 (Story 2.3) | ✅ Couvert |
| FR25 | Collecte sources complémentaires | Epic 2 (Story 2.4) | ✅ Couvert |
| FR26 | Normalisation offres | Epic 2 (Story 2.5) | ✅ Couvert |
| FR27 | Déduplication cross-sources | Epic 2 (Story 2.5) | ✅ Couvert |
| FR28 | Purge offres expirées | Epic 2 (Story 2.5) | ✅ Couvert |
| FR29 | Stockage métadonnées uniquement | Epic 2 (Story 2.1, 2.2, 2.3) | ✅ Couvert |
| FR30 | Respect robots.txt | Epic 2 (Story 2.3, 2.4) | ✅ Couvert |
| FR31 | Scoring règles pondérées | Epic 3 (Story 3.1) | ✅ Couvert |
| FR32 | Feed pré-calculé batch nocturne | Epic 3 (Story 3.2) | ✅ Couvert |
| FR33 | Justification courte du score | Epic 3 (Story 3.1) | ✅ Couvert |
| FR34 | Taux de succès par source | Epic 7 (Story 7.1) | ✅ Couvert |
| FR35 | Alerte auto quand scraper casse | Epic 7 (Story 7.2) | ✅ Couvert |
| FR36 | Logs erreur par source avec contexte | Epic 7 (Story 7.2) | ✅ Couvert |
| FR37 | Relancer run de test sur une source | Epic 7 (Story 7.2) | ✅ Couvert |
| FR38 | Métriques globales | Epic 7 (Story 7.1) | ✅ Couvert |
| FR39 | Traitement demande cessation scraping | Epic 2 (Story 2.6) | ✅ Couvert |
| FR40 | Désactiver source sans impact | Epic 2 (Story 2.6) | ✅ Couvert |
| FR41 | Conservation logs redirection | Epic 5 (Story 5.1) | ✅ Couvert |

### Divergences Identifiées

**FR21 — Push vs Email :**
- PRD : "notification **push** quotidienne"
- Epics : "notification **email** quotidienne via Resend"
- Justification dans Additional Requirements : "Notifications MVP : email uniquement via Resend, push Web prévu Phase 2"
- **Verdict :** Divergence intentionnelle et documentée. La FR est couverte fonctionnellement (notification quotidienne), mais le canal diffère. Le PRD devrait être mis à jour pour refléter ce choix MVP.

### Statistiques de Couverture

- Total FRs dans le PRD : **41**
- FRs couverts dans les epics : **41** (100%)
- FRs avec divergence : **1** (FR21 — push vs email)
- FRs manquants : **0**
- Couverture : **100%**

## 4. Alignement UX

### Statut du Document UX : ❌ Non trouvé

### UX Implicite : ✅ Oui — fortement

L'application est intrinsèquement orientée UX. Le PRD décrit :
- Interface mobile swipe (parcours candidat principal)
- Deux surfaces distinctes avec patterns d'interaction différents (mobile = swipe, desktop = listes)
- Onboarding multi-étapes (upload CV → extraction LLM → validation profil → préférences)
- NFRs d'accessibilité explicites : WCAG 2.1 AA, tap 44x44px, contraste 4.5:1, navigation clavier
- Références de sizing : iPhone SE 375px, desktop 1024px+

### Composants UI Nommés dans les Epics (sans spécification visuelle)

| Composant | Epic/Story | Surface |
|---|---|---|
| SwipeStack | 3.4 | Mobile |
| OfferCard | 3.4 | Mobile |
| ProfileReview | 4.2 | Mobile/Desktop |
| PreferencesForm | 4.2 | Desktop |
| PreferencesEditor | 4.3 | Desktop |
| OfferTable | 5.1 | Desktop |
| MetricsCharts | 7.1 | Desktop (admin) |
| PipelineRunsTable | 7.2 | Desktop (admin) |
| Landing page | 5.2 | Desktop |

### Évaluation d'Impact

- **Risque :** 🟠 Moyen — Les stories décrivent le "quoi" (composants, données) mais pas le "comment" (wireframes, layout, micro-interactions, responsive breakpoints)
- **Mitigation possible :** L'utilisation de shadcn/ui (framework de composants) réduit le risque en fournissant un système de design par défaut. Le développeur unique peut itérer sur le design pendant l'implémentation.
- **Recommandation :** Un document UX est **recommandé mais non bloquant** pour le MVP, surtout pour les écrans critiques : swipe mobile, onboarding, et la transition mobile→desktop.

## 5. Revue Qualité des Epics

### Checklist de Conformité par Epic

| Epic | Valeur Utilisateur | Indépendance | Stories Sized | Pas de Dép. Forward | DB au Bon Moment | ACs Clairs | Traçabilité FRs |
|---|---|---|---|---|---|---|---|
| Epic 1 | 🔴 Partielle | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Epic 2 | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Epic 3 | ✅ | 🟠 Dép. E4 | ✅ | 🟠 | ✅ | ✅ | ✅ |
| Epic 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Epic 5 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Epic 6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Epic 7 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 🔴 Violations Critiques

**1. Epic 1 — Epic technique déguisé en epic de valeur**
- **Constat :** "Fondation Monorepo & Infrastructure" est un milestone technique. 3 des 5 stories (1.1, 1.2, 1.5) n'ont aucune valeur utilisateur directe.
- **Mitigation :** Les stories 1.3 (Auth) et 1.4 (Essai gratuit) ont une vraie valeur utilisateur (FR1-FR3).
- **Recommandation :** Séparer en Sprint 0 (infra, 1.1+1.2+1.5) + Epic "Authentification & Inscription" (1.3+1.4). Le Sprint 0 est acceptable dans un contexte greenfield avec dev solo.
- **Sévérité ajustée :** 🟠 Majeur (pas critique car le contexte dev solo justifie un Sprint 0 explicite)

### 🟠 Issues Majeures

**2. Epic 3 dépend d'Epic 4 (dépendance forward)**
- **Constat :** Le scoring (Story 3.1) nécessite un profil utilisateur avec compétences et préférences. Or les profils sont créés dans Epic 4 (stories 4.1-4.3), qui vient *après* Epic 3.
- **Impact :** Epic 3 ne peut pas être démontré sans qu'Epic 4 soit implémenté, ou du moins le schema profil.
- **Recommandation :** Réordonner les epics : Epic 4 (Onboarding & Profil) avant Epic 3 (Scoring & Feed). Ou fusionner les deux en un seul epic "Profil, Scoring & Feed Mobile".

**3. Story 1.2 crée des tables "upfront"**
- **Constat :** La story 1.2 crée les tables `users`, `sessions`, `accounts`, `user_profiles`, `user_preferences` en une seule story, alors que les tables profil/préférences ne sont utilisées qu'à partir d'Epic 4.
- **Best practice :** Chaque story crée les tables qu'elle utilise.
- **Recommandation :** Story 1.2 ne devrait créer que `users`, `sessions`, `accounts`. Les tables `user_profiles` et `user_preferences` devraient être ajoutées dans Epic 4 (Story 4.1 ou 4.2).

**4. Epic 7 mélange deux audiences**
- **Constat :** Epic 7 combine le dashboard admin (FR34-FR38) et les notifications candidat (FR21-FR22). Deux audiences, deux surfaces.
- **Impact :** Mineur — complexifie la planification mais n'empêche pas l'implémentation.
- **Recommandation :** Acceptable tel quel, mais pourrait être scindé si les sprints le requièrent.

### 🟡 Observations Mineures

**5. Critères d'acceptation — qualité globale**
- ✅ Format BDD (Given/When/Then) respecté partout
- ✅ Cas d'erreur couverts dans la plupart des stories
- ✅ Références NFR explicites dans les ACs
- ⚠️ Quelques ACs techniques (ex: Story 1.1 "pnpm install et pnpm build s'exécutent sans erreur") — acceptable pour le Sprint 0

**6. Greenfield Setup**
- ✅ Story 1.1 est bien "Initialisation du monorepo depuis create-t3-turbo" — conforme au starter template
- ✅ CI/CD inclus dès Story 1.5
- ✅ Docker Compose dev dans Story 1.2

### Résumé des Défauts

| # | Défaut | Sévérité | Recommandation |
|---|---|---|---|
| 1 | Epic 1 = epic technique | 🟠 Majeur | Séparer Sprint 0 + Epic Auth |
| 2 | Epic 3 dépend d'Epic 4 (forward) | 🟠 Majeur | Réordonner ou fusionner E3+E4 |
| 3 | Story 1.2 crée tables profil trop tôt | 🟠 Majeur | Déplacer tables profil dans Epic 4 |
| 4 | Epic 7 mélange audiences | 🟡 Mineur | Acceptable, scindable si besoin |

## 6. Résumé et Recommandations

### Statut Global de Readiness : 🟠 PRÊT AVEC RÉSERVES

Le projet possède des artefacts solides et complets. Le PRD est excellent (41 FRs, 32 NFRs), l'architecture est bien alignée, et les epics couvrent 100% des FRs. Toutefois, des défauts structurels dans l'ordonnancement des epics doivent être corrigés avant l'implémentation.

### Problèmes Nécessitant Action

| # | Problème | Sévérité | Action Requise |
|---|---|---|---|
| 1 | Epic 3 dépend d'Epic 4 (dépendance forward) | 🟠 Majeur | Réordonner : E4 avant E3, ou fusionner |
| 2 | Epic 1 mélange infra et valeur utilisateur | 🟠 Majeur | Séparer Sprint 0 (infra) + Epic Auth |
| 3 | Story 1.2 crée tables profil trop tôt | 🟠 Majeur | Reporter user_profiles/preferences dans E4 |
| 4 | FR21 diverge (push PRD vs email epics) | 🟡 Mineur | Mettre à jour le PRD ou ajouter une note |
| 5 | Document UX absent | 🟡 Mineur | Recommandé mais non bloquant pour MVP |
| 6 | Epic 7 mélange audiences | 🟡 Mineur | Acceptable tel quel |

### Prochaines Étapes Recommandées

1. **Corriger l'ordonnancement des epics** — Déplacer Epic 4 (Onboarding & Profil) avant Epic 3 (Scoring & Feed), ou fusionner les deux. C'est le défaut le plus impactant : sans profils, le scoring ne fonctionne pas.
2. **Expliciter le Sprint 0** — Renommer ou séparer les stories techniques (1.1, 1.2, 1.5) en un Sprint 0 légitime pour un projet greenfield. Les stories orientées utilisateur (1.3, 1.4) forment un vrai epic "Authentification".
3. **Reporter la création des tables profil** — Story 1.2 ne devrait créer que les tables auth. Les tables `user_profiles` et `user_preferences` appartiennent à Epic 4.
4. **Mettre à jour FR21 dans le PRD** — Remplacer "notification push" par "notification email" pour le MVP, avec note que le push est prévu Phase 2.
5. **(Optionnel) Créer un document UX** — Wireframes des écrans critiques (swipe, onboarding, transition mobile→desktop). Non bloquant grâce à shadcn/ui.

### Ce Qui Est Solide

- ✅ **PRD** — 41 FRs, 32 NFRs, parcours utilisateur, contraintes juridiques, phasage — excellent
- ✅ **Architecture** — Alignée PRD, choix techniques justifiés, starter template évalué
- ✅ **Couverture FR** — 100% des FRs mappés aux epics
- ✅ **Critères d'acceptation** — Format BDD, cas d'erreur couverts, NFRs référencés
- ✅ **Traçabilité** — FR Coverage Map maintenue, chaque story référence ses FRs
- ✅ **Contexte greenfield** — Setup initial, CI/CD, Docker dès le Sprint 0

### Note Finale

Cette évaluation a identifié **3 problèmes majeurs** et **3 problèmes mineurs** dans **4 catégories** (ordonnancement epics, structure epics, timing DB, alignement PRD/epics). Le projet est **fondamentalement prêt** — les correctifs portent sur la structure et l'ordre des epics, pas sur le contenu. Temps estimé pour les corrections : une itération de re-planification des epics.

---
*Évaluation réalisée le 2026-04-09 par l'agent Implementation Readiness.*
