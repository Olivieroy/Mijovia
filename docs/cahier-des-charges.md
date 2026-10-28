# MIJOVIA

## Cahier des charges fonctionnel et technique — Version 1.0

**Nature du projet :** Application web progressive (PWA) de suivi alimentaire, sportif et budgétaire.

**Nom provisoire :** Mijovia

**Slogan :** Mangez mieux. Bougez à votre rythme. Maîtrisez votre budget.

**Stack obligatoire :** React, TypeScript, Node.js, Express, MySQL.

**Hébergement :** o2switch, hébergement mutualisé avec cPanel.

**Modèle économique :** Application personnelle, gratuite, partagée avec des amis.

**Langue initiale :** Français.

**Objectif de réalisation :** Application fonctionnelle, responsive, accessible, sécurisée et installable sur smartphone.

---

# 1. Contexte et vision

## 1.1 Présentation

Mijovia est une application permettant de centraliser l'organisation de l'alimentation, de l'activité physique et du budget des courses.

Elle doit réunir dans une interface unique :

- Le suivi du poids et des objectifs personnels.
- Le suivi des entraînements sportifs.
- La gestion des préférences alimentaires.
- Une bibliothèque de recettes.
- La planification hebdomadaire des repas.
- La gestion des repas à plusieurs.
- La génération automatique des listes de courses.
- Le suivi des prix des produits alimentaires.
- Le choix des magasins.
- La gestion d'un budget de courses.
- Les statistiques et graphiques de progression.

L'application doit simplifier l'organisation quotidienne sans contraindre l'utilisateur à suivre un programme alimentaire ou sportif imposé.

## 1.2 Public cible

L'application est initialement destinée à un usage personnel et à un cercle d'amis.

Elle doit cependant permettre à plusieurs utilisateurs de posséder des comptes totalement indépendants.

Exemples d'utilisation :

- Perdre du poids.
- Prendre du poids.
- Maintenir son poids.
- Développer sa masse musculaire.
- Améliorer sa condition physique.
- Planifier ses repas.
- Mieux gérer son budget alimentaire.
- Organiser les courses d'un couple.
- Partager les repas d'un foyer.
- Utiliser uniquement certains modules.

Chaque utilisateur doit pouvoir choisir les fonctionnalités qu'il souhaite utiliser.

## 1.3 Principes fondamentaux

L'application doit respecter les principes suivants :

**Personnalisation totale**

Aucun poids, budget, magasin, sport, nombre de séances ou nombre de repas ne doit être imposé.

**Simplicité**

Une personne sans compétence technique doit pouvoir utiliser l'application quotidiennement.

**Indépendance**

Chaque utilisateur possède ses propres données.

**Partage facultatif**

Certaines données peuvent être partagées entre membres d'un foyer, uniquement avec leur autorisation.

**Confidentialité**

Les données de santé et les informations individuelles restent privées par défaut.

**Évolutivité**

Le code doit permettre l'ajout de nouvelles fonctionnalités sans reconstruction complète.

---

# 2. Architecture technique obligatoire

## 2.1 Frontend

L'interface sera développée avec :

- React.
- TypeScript.
- Vite.
- React Router.
- TanStack Query.
- React Hook Form.
- Zod.
- Recharts.
- CSS natif et CSS Modules.
- Variables CSS.
- vite-plugin-pwa.

Privilégier une architecture par fonctionnalités et des composants réutilisables.

Ne pas utiliser TailwindCSS.

Éviter les bibliothèques lourdes lorsqu'une implémentation native simple suffit.

TanStack Query doit servir à la récupération, au cache et à l'invalidation des données provenant de l'API.

## 2.2 Backend

Le backend sera développé avec :

- Node.js.
- TypeScript.
- Express.js.
- API REST.
- Zod pour la validation.
- Middlewares de sécurité.
- Services métier indépendants des contrôleurs.
- Gestion centralisée des erreurs.

Le backend doit gérer :

- Authentification.
- Autorisations.
- Utilisateurs.
- Foyers.
- Objectifs.
- Sport.
- Nutrition.
- Repas.
- Produits.
- Magasins.
- Courses.
- Budgets.
- Statistiques.

Aucune logique nécessitant une vérification de sécurité ne doit dépendre uniquement du frontend.

## 2.3 Base de données

Utiliser :

- MySQL ou MariaDB.
- Drizzle ORM.
- mysql2.
- Migrations versionnées.

Prévoir :

- Clés étrangères.
- Index.
- Contraintes d'unicité.
- Transactions.
- Intégrité référentielle.
- Historisation lorsque nécessaire.
- Contrôle des accès par utilisateur et par foyer.

## 2.4 Structure du dépôt

Utiliser un monorepo :

```text
mijovia/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── api/
│       ├── src/
│       │   ├── modules/
│       │   ├── middleware/
│       │   ├── config/
│       │   ├── database/
│       │   └── server.ts
│       └── package.json
│
├── packages/
│   └── shared/
│       ├── types/
│       └── schemas/
│
├── docs/
├── tests/
├── .env.example
├── AGENTS.md
└── package.json
```

Adapter cette structure lorsque cela simplifie réellement la maintenance, tout en conservant une séparation nette entre frontend, backend et code partagé.

---

# 3. Hébergement o2switch / cPanel

## 3.1 Environnement de production

L'application sera déployée sur un hébergement mutualisé o2switch administré via cPanel.

Le frontend React sera compilé avec Vite et servi comme site statique.

Le backend Node.js devra fonctionner avec le mécanisme d'hébergement Node.js disponible sur le compte cPanel, notamment Passenger si cette fonctionnalité est activée.

Avant le développement du déploiement, vérifier :

- Les versions Node.js disponibles.
- Le fonctionnement de Setup Node.js App.
- Les possibilités de démarrage de l'application.
- Les règles de routage.
- Les versions MySQL/MariaDB.
- L'accès SSH éventuel.
- Les variables d'environnement.
- Les tâches cron.
- Les limites de ressources.
- La prise en charge de dépendances natives.

Ne pas supposer qu'une version ou fonctionnalité est disponible sans vérification.

## 3.2 Organisation des domaines

Privilégier une architecture utilisant un seul domaine :

- `/` : interface React.
- `/api/v1/` : API Express.

Si les contraintes de Passenger rendent cette architecture difficile, prévoir une séparation :

- `app.domaine.fr` : React.
- `api.domaine.fr` : Node.js.

Dans ce second cas, configurer correctement CORS, les cookies, la protection CSRF et les sessions.

Le choix final doit être documenté.

## 3.3 Déploiement

Prévoir :

- Build frontend.
- Compilation TypeScript du backend.
- Configuration du fichier de démarrage Passenger.
- Déploiement sans serveur Vite permanent.
- Variables d'environnement.
- HTTPS.
- Configuration Apache.
- Redirection des routes React.
- Exclusion des routes API du fallback React.
- Migrations SQL.
- Sauvegardes.
- Procédure de restauration.
- Redémarrage contrôlé du backend.

Ne pas utiliser PM2 comme dépendance obligatoire de production.

Aucun processus permanent supplémentaire ne doit être requis.

Ne pas modifier une autre application hébergée sur le serveur.

---

# 4. Authentification et utilisateurs

## 4.1 Inscription

Tout visiteur peut créer gratuitement son compte lorsque les inscriptions sont activées.

Champs :

- Prénom ou pseudonyme.
- Adresse e-mail.
- Mot de passe.
- Confirmation du mot de passe.
- Acceptation des documents légaux requis.

Une vérification de l'adresse e-mail doit être prévue.

## 4.2 Connexion

Fonctionnalités :

- Connexion.
- Déconnexion.
- Mot de passe oublié.
- Réinitialisation.
- Modification du mot de passe.
- Gestion des sessions.
- Déconnexion des autres appareils.
- Suppression du compte.

## 4.3 Sécurité

Utiliser :

- Argon2id ou équivalent robuste pour le hachage.
- Sessions serveur persistées en base.
- Cookies HttpOnly, Secure et SameSite.
- Protection CSRF adaptée à l'architecture.
- Validation côté serveur.
- Limitation des tentatives de connexion.
- Protection contre les inscriptions automatisées.
- Protection contre les injections SQL.
- Protection XSS.
- Contrôle systématique des permissions.

Ne jamais stocker les mots de passe en clair.

Ne pas utiliser localStorage comme mécanisme de conservation des secrets de session.

## 4.4 Comptes indépendants

Chaque utilisateur possède :

- Ses objectifs.
- Ses mesures.
- Ses séances sportives.
- Ses préférences alimentaires.
- Ses recettes personnelles.
- Ses budgets personnels.
- Ses paramètres.

Un utilisateur ne peut accéder à aucune donnée privée appartenant à un autre compte.

---

# 5. Gestion des foyers

## 5.1 Création

Un utilisateur peut créer un foyer.

Exemples :

- Couple.
- Famille.
- Colocation.

Le nom du foyer est personnalisable.

## 5.2 Invitations

Le propriétaire peut inviter un utilisateur par e-mail ou lien sécurisé.

Les invitations doivent être :

- Temporaires.
- Révocables.
- À usage contrôlé.
- Rattachées au bon foyer.

## 5.3 Données partagées

Un foyer peut partager :

- Repas.
- Recettes communes.
- Courses.
- Inventaire.
- Magasins.
- Budgets.
- Dépenses.

Les données individuelles de santé, de poids et de sport restent privées par défaut.

## 5.4 Permissions

Deux rôles suffisent initialement :

- Propriétaire.
- Membre.

Prévoir le retrait d'un membre et la possibilité de quitter un foyer.

Les modifications partagées doivent être persistées en base et consultables depuis plusieurs appareils.

---

# 6. Configuration initiale et préférences

Après inscription, proposer un onboarding facultatif et progressif.

## 6.1 Informations personnelles

- Prénom.
- Taille.
- Poids.
- Pays.
- Fuseau horaire.
- Unités.
- Devise.

Les informations non indispensables doivent pouvoir être ignorées.

## 6.2 Choix des modules

L'utilisateur peut activer :

- Suivi du poids.
- Activités sportives.
- Repas.
- Courses.
- Budget.
- Statistiques.

Un module non utilisé ne doit pas encombrer le tableau de bord.

## 6.3 Objectifs

Objectifs possibles :

- Perte de poids.
- Prise de poids.
- Maintien.
- Développement musculaire.
- Condition physique.
- Organisation alimentaire.
- Réduction des dépenses.
- Objectif personnalisé.

Plusieurs objectifs peuvent coexister.

Tous sont modifiables.

---

# 7. Suivi du poids

## 7.1 Paramètres

L'utilisateur peut définir :

- Poids initial.
- Poids actuel.
- Poids cible.
- Date cible facultative.
- Objectifs intermédiaires.

Aucune valeur n'est codée en dur.

## 7.2 Historique

Enregistrer :

- Poids.
- Date.
- Note facultative.

Les entrées doivent pouvoir être modifiées et supprimées.

## 7.3 Mensurations

Prévoir :

- Tour de taille.
- Tour de hanches.
- Tour de poitrine.
- Bras.
- Cuisses.
- Mesures personnalisées.

## 7.4 Statistiques

- Courbe du poids.
- Évolution hebdomadaire.
- Évolution mensuelle.
- Moyennes mobiles.
- Progression vers l'objectif.
- Historique des objectifs.

Les projections sont indicatives.

Les objectifs extrêmes doivent être signalés sans présenter l'application comme un outil de diagnostic médical.

---

# 8. Gestion des activités sportives

## 8.1 Fonctionnement général

Chaque utilisateur peut définir librement :

- Les sports pratiqués.
- Le nombre de séances.
- Les jours.
- Les horaires.
- Les durées.
- Les jours de repos.

Aucun nombre maximum de séances hebdomadaires ne doit être imposé artificiellement.

## 8.2 Bibliothèque de sports

Prévoir notamment :

- Musculation.
- Course à pied.
- Marche.
- Vélo.
- Natation.
- Kin-Ball.
- Football.
- Basketball.
- Fitness.
- Yoga.
- Autres activités.

Possibilité de créer un sport personnalisé.

## 8.3 Planning

Vues :

- Semaine.
- Mois.

Fonctionnalités :

- Ajouter une séance.
- Modifier.
- Supprimer.
- Reporter.
- Dupliquer.
- Rendre récurrent.
- Marquer comme effectuée.
- Marquer comme annulée.

## 8.4 Musculation

Chaque séance peut contenir :

- Exercices.
- Groupes musculaires.
- Séries.
- Répétitions.
- Charges.
- Temps de repos.
- Notes.
- Historique.

Prévoir la progression des charges.

## 8.5 Autres activités

Enregistrer :

- Type de sport.
- Durée.
- Distance facultative.
- Intensité ressentie.
- Notes.
- Statut.

## 8.6 Graphiques

- Nombre de séances.
- Volume hebdomadaire.
- Temps d'entraînement.
- Régularité.
- Évolution des charges.
- Répartition par sport.

---

# 9. Alimentation et préférences

## 9.1 Gestion des aliments

Créer une bibliothèque alimentaire contenant :

- Nom.
- Catégorie.
- Unité.
- Valeurs nutritionnelles lorsque disponibles.
- Allergènes connus.
- Informations complémentaires.

## 9.2 Préférences individuelles

Chaque utilisateur peut définir :

- J'aime.
- Je n'aime pas.
- Je refuse.
- Allergie.
- Intolérance.
- Favoris.

Les allergies et exclusions doivent être prises en compte dans les propositions de recettes.

Lorsqu'une information allergène est inconnue, l'application doit l'indiquer plutôt que de garantir une compatibilité.

## 9.3 Habitudes

Configurer :

- Nombre de repas par jour.
- Petit-déjeuner facultatif.
- Déjeuner.
- Dîner.
- Collations.
- Portions habituelles.
- Temps de préparation souhaité.
- Préférences de cuisson.

Ne pas imposer trois repas quotidiens.

---

# 10. Bibliothèque de recettes

## 10.1 Structure d'une recette

Chaque recette possède :

- Titre.
- Description.
- Photo facultative.
- Catégorie.
- Ingrédients.
- Quantités.
- Nombre de portions.
- Étapes.
- Temps de préparation.
- Temps de cuisson.
- Allergènes.
- Informations nutritionnelles disponibles.
- Prix estimé.
- Coût par portion.

## 10.2 Fonctionnalités

- Créer.
- Modifier.
- Supprimer.
- Dupliquer.
- Ajouter aux favoris.
- Rechercher.
- Filtrer.
- Adapter les quantités.
- Enregistrer des variantes.

## 10.3 Recettes de départ

Prévoir une petite bibliothèque de recettes classiques.

Exemples :

- Pâtes bolognaise.
- Pâtes carbonara.
- Gratin de pâtes.
- Poulet et riz.
- Cabillaud et légumes.
- Omelette.
- Salades composées.
- Steak et pommes de terre.

Les recettes doivent pouvoir être modifiées en fonction des goûts.

---

# 11. Planificateur de repas

## 11.1 Calendrier

Créer une vue hebdomadaire.

Pour chaque jour :

- Petit-déjeuner si activé.
- Déjeuner.
- Dîner.
- Collations facultatives.

## 11.2 Gestion des repas

L'utilisateur peut :

- Ajouter une recette.
- Remplacer une recette.
- Déplacer un repas.
- Supprimer un repas.
- Dupliquer une journée.
- Dupliquer une semaine.
- Enregistrer une semaine favorite.
- Verrouiller certains repas.
- Marquer un repas comme consommé.

## 11.3 Nombre de convives

Le nombre de convives doit être personnalisable pour chaque repas.

Exemples :

- Lundi midi : une personne.
- Lundi soir : deux personnes.
- Samedi midi : quatre personnes.

Les portions et ingrédients sont recalculés automatiquement.

Dans un foyer, on peut sélectionner les membres participant au repas et ajouter des invités.

Les besoins particuliers des convives doivent pouvoir être pris en compte.

## 11.4 Génération automatique

Ajouter un bouton « Générer ma semaine ».

Le moteur utilise :

- Préférences.
- Allergies.
- Intolérances.
- Recettes favorites.
- Nombre de convives.
- Budget.
- Inventaire.
- Variété des plats.
- Temps disponible.

La génération doit fonctionner sans IA externe obligatoire.

Implémenter d'abord un moteur déterministe basé sur les recettes et des règles explicites.

## 11.5 Alternatives

Prévoir :

- Remplacer ce repas.
- Trouver une recette similaire.
- Trouver une recette moins chère.
- Utiliser les ingrédients disponibles.
- Réduire le temps de préparation.

Ne pas promettre qu'un menu satisfait tous les besoins nutritionnels sans données et règles validées.

---

# 12. Gestion des magasins

## 12.1 Principe

Chaque utilisateur ou foyer choisit librement son magasin.

L'application ne doit pas être limitée à Système U.

## 12.2 Magasins possibles

Exemples :

- Hyper U.
- Super U.
- Carrefour.
- E.Leclerc.
- Intermarché.
- Lidl.
- Aldi.
- Auchan.
- Commerces indépendants.
- Magasins personnalisés.

## 12.3 Fonctionnalités

- Rechercher un magasin.
- Filtrer par ville.
- Filtrer par code postal.
- Enregistrer un favori.
- Ajouter un magasin manuellement.
- Choisir plusieurs magasins.
- Changer de magasin.
- Comparer les prix lorsque les données sont disponibles.

La sélection manuelle doit toujours rester possible.

## 12.4 Magasin d'exemple

Pour les données de développement :

Hyper U Avrillé, 49240 Avrillé.

Ce magasin sert uniquement d'exemple pour les tests et ne doit pas être imposé aux autres utilisateurs.

---

# 13. Catalogue de produits et suivi des prix

## 13.1 Produits

Chaque produit peut contenir :

- Nom.
- Marque.
- Catégorie.
- Format.
- Quantité du conditionnement.
- Unité.
- Magasin.
- Prix.
- Prix unitaire.
- Date de vérification.
- Source du prix.

## 13.2 Sources tarifaires

Prévoir plusieurs modes :

1. Import officiel ou autorisé.
2. Catalogue exploitable légalement.
3. Import manuel.
4. Saisie utilisateur.

Les données peuvent être :

- Vérifiées.
- Importées.
- Saisies manuellement.
- Estimées.

Chaque tarif doit afficher son niveau de fiabilité et sa date de mise à jour.

## 13.3 Intégrations automatiques

Étudier la disponibilité d'API ou de données autorisées pour les enseignes alimentaires.

Ne pas développer de scraping contournant les restrictions des sites marchands.

L'absence de récupération automatique ne doit pas bloquer l'utilisation de l'application.

Le catalogue manuel doit être pleinement fonctionnel.

## 13.4 Historique

Conserver l'historique utile des prix pour :

- Comparer les évolutions.
- Identifier les produits coûteux.
- Comparer les magasins.
- Estimer les futurs paniers.

Ne pas confondre les prix saisis par les utilisateurs avec des tarifs officiellement vérifiés.

---

# 14. Générateur de listes de courses

## 14.1 Fonctionnement

À partir des menus planifiés :

1. Récupérer les ingrédients.
2. Calculer les quantités nécessaires.
3. Regrouper les ingrédients identiques.
4. Déduire les stocks disponibles.
5. Déterminer les conditionnements à acheter.
6. Récupérer les prix disponibles.
7. Générer une liste de courses.
8. Calculer le coût estimé.

## 14.2 Liste interactive

Chaque produit peut être :

- Coché.
- Décoché.
- Modifié.
- Supprimé.
- Ajouté manuellement.
- Marqué comme déjà disponible.
- Associé à un prix personnalisé.

## 14.3 Catégories

Organiser les achats :

- Fruits et légumes.
- Viandes et poissons.
- Féculents.
- Produits frais.
- Épicerie.
- Boissons.
- Autres.

## 14.4 Conditionnements

Si une recette nécessite 250 g d'un produit vendu uniquement en paquet de 500 g, le coût d'achat doit tenir compte du paquet.

Distinguer :

- Quantité consommée.
- Quantité achetée.
- Coût de consommation théorique.
- Coût réel du conditionnement.

## 14.5 Inventaire

L'utilisateur peut enregistrer les produits déjà présents :

- Produit.
- Quantité.
- Unité.
- Date de péremption facultative.

La liste doit pouvoir être recalculée selon les stocks.

## 14.6 Synchronisation du foyer

Les membres autorisés peuvent :

- Consulter la même liste.
- Cocher les articles.
- Ajouter des produits.
- Corriger les quantités.
- Modifier les prix.

Les modifications doivent être persistées et synchronisées à l'actualisation ou via un mécanisme de rafraîchissement léger.

Ne pas imposer un serveur WebSocket permanent.

---

# 15. Budget alimentaire

## 15.1 Budget libre

L'utilisateur peut fixer n'importe quel montant valide.

Exemples :

- 50 €.
- 80 €.
- 120 €.
- 200 €.
- Autre montant.

Aucun plafond arbitraire.

## 15.2 Période

- Hebdomadaire.
- Mensuelle.
- Personnalisée.

## 15.3 Calculs

Afficher :

- Budget prévu.
- Panier estimé.
- Dépenses réelles.
- Budget restant.
- Dépassement.
- Coût par repas.
- Coût par personne.
- Répartition des dépenses.

## 15.4 Historique

Conserver les budgets et dépenses des périodes précédentes.

Ajouter des graphiques :

- Budget contre dépenses.
- Évolution hebdomadaire.
- Évolution mensuelle.
- Répartition des dépenses par catégorie.

## 15.5 Optimisation

Créer une fonctionnalité « Optimiser mon panier ».

Elle peut suggérer :

- Recettes moins coûteuses.
- Autres conditionnements.
- Réutilisation d'ingrédients.
- Repas utilisant les stocks.
- Alternatives de produits.
- Autre magasin si des prix comparables sont disponibles.

Ne jamais réduire artificiellement les quantités pour faire respecter le budget.

Un prix manquant doit être identifié explicitement et ne pas être assimilé à un coût nul.

---

# 16. Tableau de bord

## 16.1 Accueil personnel

Afficher selon les modules activés :

- Message d'accueil.
- Objectifs.
- Poids actuel.
- Prochain entraînement.
- Séances de la semaine.
- Repas du jour.
- Menu de la semaine.
- Liste de courses.
- Budget restant.
- Dernières activités.

## 16.2 Widgets

Les widgets doivent être :

- Affichables.
- Masquables.
- Réorganisables si possible.

Les préférences d'affichage sont enregistrées en base.

## 16.3 Raccourcis

Prévoir :

- Ajouter une pesée.
- Ajouter une séance.
- Planifier un repas.
- Générer les courses.
- Modifier le budget.

---

# 17. Statistiques et graphiques

Créer une page de statistiques centralisée.

## 17.1 Poids

- Historique.
- Courbes.
- Moyennes.
- Objectifs.

## 17.2 Sport

- Séances réalisées.
- Durée totale.
- Fréquence.
- Progression des charges.
- Répartition par sport.

## 17.3 Nutrition

Lorsque les données sont disponibles :

- Repas enregistrés.
- Répartition des catégories alimentaires.
- Estimations nutritionnelles.
- Historique des menus.

## 17.4 Budget

- Dépenses.
- Budget restant.
- Historique.
- Répartition par catégorie.
- Évolution des prix.

## 17.5 Filtres

- Semaine.
- Mois.
- Trois mois.
- Six mois.
- Année.
- Période personnalisée.

Tous les graphiques doivent comporter une alternative accessible.

---

# 18. Design et expérience utilisateur

## 18.1 Identité

Nom provisoire : Mijovia.

Direction artistique :

- Moderne.
- Minimaliste.
- Chaleureuse.
- Accessible.
- Professionnelle.
- Adaptée au quotidien.

Palette suggérée :

- Vert profond.
- Vert sauge.
- Blanc cassé.
- Gris neutres.
- Couleurs d'accent discrètes.

Le nom et la disponibilité juridique de la marque devront être vérifiés séparément avant une diffusion publique importante.

## 18.2 Interfaces

Créer les pages :

- Accueil public.
- Inscription.
- Connexion.
- Configuration initiale.
- Dashboard.
- Repas.
- Recettes.
- Courses.
- Magasins.
- Budget.
- Sport.
- Statistiques.
- Profil.
- Foyer.
- Administration.

## 18.3 Responsive

L'interface est mobile-first.

Prévoir :

- Navigation inférieure sur smartphone.
- Navigation latérale sur ordinateur si adaptée.
- Formulaires ergonomiques.
- Cartes lisibles.
- Tableaux adaptés au mobile.
- Zones tactiles confortables.

## 18.4 Accessibilité

Respecter les WCAG 2.2 niveau AA.

Notamment :

- Navigation clavier.
- Focus visibles.
- Contrastes.
- Libellés de formulaire.
- Messages d'erreur.
- Compatibilité lecteur d'écran.
- Gestion des animations réduites.
- Graphiques accessibles.

## 18.5 Thèmes

Prévoir :

- Mode clair.
- Mode sombre.
- Suivi facultatif du thème système.

---

# 19. PWA et utilisation sur smartphone

L'application doit être installable sur :

- iPhone.
- Android.
- Ordinateur.

Prévoir :

- Manifest.
- Icônes.
- Métadonnées adaptées.
- Service worker.
- Cache des ressources statiques.
- Gestion des nouvelles versions.
- Interface responsive.
- Affichage adapté au mode standalone.

Le frontend doit pouvoir fonctionner comme une application installée.

## Mode hors ligne

Prévoir au minimum une page hors ligne et une consultation sécurisée des informations déjà disponibles lorsque cela est pertinent.

Si les modifications hors ligne sont implémentées, elles doivent être synchronisées correctement et éviter les pertes de données.

Ne pas prétendre prendre en charge une synchronisation hors ligne si elle n'est pas réellement opérationnelle.

---

# 20. Administration

Créer une interface réservée au propriétaire de l'application.

## Fonctionnalités

- Liste des utilisateurs.
- Nombre de comptes.
- Activation/désactivation des inscriptions.
- Mode invitation.
- Suspension de comptes.
- Gestion des magasins globaux.
- Gestion des recettes communes.
- Gestion du catalogue alimentaire.
- Gestion des sources tarifaires.
- Paramètres généraux.
- Logs techniques.
- État de santé applicatif.

Les données privées de santé ne doivent pas être librement consultables depuis l'administration.

Éviter un système d'administration disproportionné par rapport à un usage personnel.

---

# 21. Base de données

Concevoir le schéma relationnel complet.

Entités envisagées :

- Users
- Profiles
- Sessions
- Households
- HouseholdMembers
- HouseholdInvitations
- Goals
- WeightEntries
- Measurements
- Sports
- Exercises
- WorkoutSessions
- WorkoutSets
- FoodItems
- FoodPreferences
- Allergies
- Recipes
- RecipeIngredients
- MealPlans
- PlannedMeals
- MealParticipants
- Stores
- StoreProducts
- ProductPrices
- Inventories
- ShoppingLists
- ShoppingListItems
- Budgets
- Expenses
- Notifications
- AuditLogs

Cette liste est indicative et doit être adaptée aux besoins réels.

## Exigences

- Migrations versionnées.
- Contraintes et index.
- Relations cohérentes.
- Transactions.
- Dates correctement gérées.
- Précision décimale appropriée pour les quantités et montants.
- Pas de nombres flottants non maîtrisés pour les calculs monétaires.
- Isolation stricte entre utilisateurs et foyers.
- Stratégie de sauvegarde et restauration.
- Suppression cohérente des données.

---

# 22. Confidentialité et sécurité

L'application contiendra des données personnelles et potentiellement des données de santé.

Prévoir :

- Politique de confidentialité.
- Mentions légales.
- Export des données.
- Suppression de compte.
- Minimisation des données collectées.
- Informations de santé facultatives.
- Contrôle des autorisations.
- Accès sécurisé.
- Sauvegardes protégées.
- Absence de secrets dans le dépôt.
- Gestion des incidents.

Vérifier les obligations RGPD applicables à un service partagé avec des tiers, notamment pour les données de santé, et prévoir les mesures et consentements explicites nécessaires selon la base juridique retenue.

Ne pas considérer l'usage gratuit ou personnel comme une exemption automatique.

L'application ne doit pas prétendre délivrer un diagnostic ou remplacer un professionnel de santé.

---

# 23. Profil de test

Créer des données de test séparées des données réelles.

Le profil suivant peut être utilisé pour valider les fonctionnalités.

## Informations

- Taille : 175 cm.
- Poids initial : 100 kg.
- Objectif : 78 kg.
- Date cible : mai 2027.

## Sport

- Lundi : Kin-Ball.
- Mardi : musculation bas du corps.
- Mercredi : musculation haut du corps.
- Jeudi : Kin-Ball.
- Vendredi : repos.
- Samedi : musculation Full Body.
- Dimanche : repos.

## Alimentation

Protéines :

- Bœuf.
- Poulet.
- Porc.
- Cabillaud.
- Saumon fumé ou gravlax.
- Œufs.

Féculents :

- Pâtes.
- Riz.
- Semoule.
- Pommes de terre.

Légumes :

- Épinards.
- Haricots verts.
- Petits pois.
- Salade.
- Tomates.
- Concombre.
- Flageolets.
- Haricots blancs.

Fruits :

- Pommes.
- Poires.
- Clémentines.

Produits laitiers :

- Feta.
- Mozzarella.
- Emmental.
- Lait sans lactose.
- Crème fraîche légère adaptée.

Intolérance :

- Lactose.

Plats préférés :

- Gratin de pâtes.
- Pâtes carbonara.

Habitudes :

- Pas de petit-déjeuner habituel.
- Portions importantes.
- Consommation fréquente de pâtes.

## Organisation du foyer

- Déjeuners généralement seuls en semaine.
- Un déjeuner supplémentaire à deux en semaine.
- Déjeuners du week-end à deux.
- Dîners à deux.
- Jour supplémentaire configurable.

## Magasin

Hyper U Avrillé.

Ces informations doivent servir uniquement aux tests ou à l'initialisation explicite de mon propre compte.

Elles ne doivent jamais constituer les valeurs par défaut des autres utilisateurs.

---

# 24. Tests et assurance qualité

## 24.1 Tests unitaires

Tester :

- Calcul des portions.
- Conversions d'unités.
- Regroupement des ingrédients.
- Arrondis des conditionnements.
- Calculs monétaires.
- Gestion des budgets.
- Calcul des statistiques.
- Validation des formulaires.

## 24.2 Tests d'intégration

Tester :

- Inscription.
- Connexion.
- Réinitialisation.
- Permissions.
- Foyers.
- Invitations.
- Enregistrement du poids.
- Planification.
- Génération des courses.
- Dépenses.
- Accès aux données.

## 24.3 Tests de sécurité

Vérifier :

- Isolation des utilisateurs.
- Accès inter-foyers.
- Autorisations sur les API.
- Injection SQL.
- XSS.
- CSRF.
- Sessions.
- Limitation des tentatives.
- Accès aux fichiers sensibles.

## 24.4 Tests fonctionnels

Tester les parcours sur ordinateur et smartphone.

Utiliser des tests end-to-end pour les parcours critiques lorsque cela est possible.

Aucun bouton ne doit être simplement décoratif s'il annonce une action.

---

# 25. Ordre de développement

Développer le projet progressivement en conservant une application fonctionnelle à chaque étape.

## Phase 1 — Fondations

- Initialiser le monorepo.
- Configurer React, Vite et TypeScript.
- Configurer Node.js et Express.
- Configurer MySQL et Drizzle.
- Créer les migrations.
- Définir les conventions.
- Préparer les environnements.
- Mettre en place les tests de base.

## Phase 2 — Authentification

- Inscription.
- Connexion.
- Déconnexion.
- Vérification e-mail.
- Réinitialisation.
- Sessions sécurisées.
- Profils.
- Autorisations.

## Phase 3 — Interface

- Design system.
- Composants.
- Navigation.
- Responsive.
- Accueil public.
- Dashboard.
- Paramètres.

## Phase 4 — Objectifs et sport

- Suivi du poids.
- Mensurations.
- Objectifs.
- Activités.
- Calendrier sportif.
- Séances.
- Historique.
- Statistiques.

## Phase 5 — Nutrition

- Bibliothèque alimentaire.
- Préférences.
- Recettes.
- Portions.
- Planification.
- Génération de menus.

## Phase 6 — Courses et budget

- Magasins.
- Catalogue des produits.
- Gestion manuelle des tarifs.
- Inventaire.
- Listes automatiques.
- Budgets.
- Dépenses.

## Phase 7 — Foyers

- Création des foyers.
- Invitations.
- Permissions.
- Repas communs.
- Courses partagées.
- Budgets communs.
- Synchronisation.

## Phase 8 — PWA et finalisation

- Manifest.
- Service worker.
- Installation mobile.
- Statistiques avancées.
- Accessibilité.
- Optimisation.
- Tests.
- Audit de sécurité.

## Phase 9 — Déploiement

- Vérification de l'environnement cPanel.
- Build de production.
- Configuration Passenger.
- Configuration de MySQL.
- Variables d'environnement.
- Migrations.
- HTTPS.
- Vérification de l'authentification.
- Vérification des routes.
- Tests sur iPhone et ordinateur.
- Sauvegarde.
- Documentation.

Les intégrations automatiques de prix des enseignes sont une évolution distincte : le fonctionnement manuel doit être opérationnel avant leur développement.

---

# 26. Critères de validation

L'application est considérée comme utilisable lorsque :

1. Je peux créer mon compte.
2. Je peux me connecter et me déconnecter.
3. Je peux configurer librement mes objectifs.
4. Je peux enregistrer mon poids.
5. Je peux voir mon graphique de progression.
6. Je peux créer mon planning sportif.
7. Je peux enregistrer mes entraînements.
8. Je peux modifier mes préférences alimentaires.
9. Je peux créer et utiliser des recettes.
10. Je peux planifier les repas de la semaine.
11. Je peux définir le nombre de convives de chaque repas.
12. Je peux générer une liste de courses.
13. Je peux déclarer les produits déjà disponibles.
14. Je peux choisir librement un magasin.
15. Je peux saisir et modifier les prix des produits.
16. Je peux définir mon budget sans limite prédéfinie.
17. Je peux voir le coût estimé du panier.
18. Je peux enregistrer mes dépenses.
19. Je peux consulter les statistiques.
20. Je peux créer un foyer.
21. Je peux inviter ma compagne.
22. Nous pouvons partager nos repas et nos courses.
23. Un ami peut créer son propre compte.
24. Cet ami ne peut pas accéder à mes données privées.
25. Je peux installer la PWA sur mon iPhone.
26. Je peux retrouver mes données depuis un autre appareil.
27. L'ensemble fonctionne sur o2switch/cPanel.

Les données doivent être persistées en base MySQL.

Les principales opérations doivent être testées automatiquement.

---

# 27. Livrables

Fournir :

- Code source frontend React.
- Code source backend Node.js.
- Types TypeScript.
- Schémas Zod.
- Modèles Drizzle.
- Migrations SQL.
- Configuration Vite.
- Configuration PWA.
- Fichiers d'environnement d'exemple.
- Documentation d'installation.
- Documentation API.
- Guide de déploiement cPanel.
- Procédure de sauvegarde et restauration.
- Tests automatisés.
- README.
- AGENTS.md.
- Liste des limites connues.

## AGENTS.md

Maintenir à la racine du dépôt un fichier AGENTS.md précisant :

- Architecture.
- Stack.
- Conventions.
- Commandes.
- Règles de sécurité.
- Organisation des modules.
- Processus de test.
- Contraintes o2switch.
- Procédure de déploiement.

Ce document doit permettre de reprendre le développement facilement dans de futures sessions Codex.

---

# 28. Instructions de réalisation pour Codex

Je veux que tu réalises le projet, et pas simplement que tu proposes un plan.

Tu dois :

1. Inspecter le workspace.
2. Vérifier les contraintes de l'hébergement connues.
3. Choisir l'architecture précise compatible avec o2switch.
4. Initialiser le monorepo.
5. Implémenter réellement le backend et le frontend.
6. Créer les modèles et migrations.
7. Développer les fonctionnalités.
8. Écrire les tests.
9. Tester les parcours utilisateur.
10. Préparer le déploiement.
11. Documenter les résultats.

Tu peux travailler par phases pour réduire les risques.

Privilégie une première version stable et réellement utilisable plutôt qu'une application qui affiche de nombreuses fonctionnalités inachevées.

Les fonctionnalités indispensables doivent fonctionner sans service externe payant.

Ne jamais inventer des prix de magasins, des données nutritionnelles ou des intégrations externes.

Ne jamais annoncer qu'une fonctionnalité est opérationnelle si elle est simulée.

Si une étape nécessite des informations qui ne sont pas présentes, poursuis le développement des éléments indépendants et documente le blocage.

Ne demande pas de confirmation pour chaque décision technique mineure.

En revanche, demande une validation avant toute opération destructive, modification d'un site déjà en production ou déploiement sur un domaine non confirmé.

**Résultat attendu : Mijovia, une véritable PWA React + Node.js, utilisable quotidiennement, multiutilisateur, sécurisée et déployable sur o2switch avec cPanel.**
