# Limites et configuration restante

## Validation externe indispensable

- Aucun déploiement sur un compte o2switch/cPanel réel : domaines, Node, Passenger, routage, SMTP, limites et sauvegardes restent à confirmer sur le compte cible.
- Google et WebAuthn sont implémentés mais les connexions réelles, les clés Face ID/Touch ID et les gestionnaires de Passkeys n’ont pas été testés avec des identifiants et appareils réels. Apple est une extension réservée, sans bouton ni endpoint actif.
- SMTP est implémenté avec TLS ; la recette locale de récupération utilise un transport de test intercepté. La délivrabilité réelle reste à vérifier.
- Manifest, icônes, service worker et stratégie de mise à jour sont construits. L’installation sur un vrai iPhone/Android n’a pas été effectuée. La consultation d’une session déjà chargée peut utiliser les données en mémoire ; aucune donnée privée API n’est stockée durablement hors ligne et aucune modification hors ligne n’est synchronisée.
- Les documents légaux de l’interface sont une version de travail, pas des textes juridiquement validés. Identité de l’éditeur, coordonnées, hébergeur, base juridique, conservation et formalités éventuelles doivent être complétés avant diffusion. La marque Mijovia n’a pas fait l’objet d’une recherche juridique.

## Périmètre de cette version

- Toutes les grandes rubriques disposent d’API et d’écrans de saisie. Les fonctions avancées restent simples : formulaires de collection, calendrier par dates, récurrence matérialisée sur une période demandée, rafraîchissement léger du foyer. Aucun glisser-déposer n’est annoncé.
- Les widgets sont activables/masquables et persistés ; leur réorganisation visuelle n’est pas fournie. Les unités impériales concernent la saisie/affichage de pesées ; les autres mesures affichent explicitement leur unité canonique.
- Les recettes ont un nom, une description, une photo HTTPS facultative, des étapes et des ingrédients. Une variante se crée par duplication puis modification ; aucun modèle séparé de variantes n’est nécessaire.
- Une semaine favorite est représentée par les repas marqués favoris. La copie accepte une journée ou une période vers une destination vide.
- Les données de santé sont personnelles. Les contraintes allergènes d’un membre sont utilisées dans la génération d’un foyer uniquement s’il a autorisé cette utilisation. Les données allergènes manquantes restent inconnues ; le catalogue initial doit être renseigné avant une génération avec exclusions.
- Le moteur ne garantit ni l’équilibre nutritionnel ni l’optimum mathématique du panier. Les prix inconnus, les données nutritionnelles partielles et les incompatibilités d’unités sont signalés. Aucun objectif ne constitue un avis médical.
- L’optimisation compare les conditionnements et tarifs disponibles, les alternatives de recettes comparent prix/temps/stocks. Aucune intégration automatique d’enseigne et aucun scraping ne sont activés.
- Les paramètres globaux d’inscription et sources sont gérés dans l’administration. Le catalogue commun est publié à partir des aliments, recettes, magasins et tarifs personnels du propriétaire ; les autres comptes en importent une copie. Pas de modification forcée des données existantes.
- Le schéma métier utilise des documents typés et validés dans une table relationnelle commune, avec table de références et clés étrangères. Voir l’architecture pour les compromis par rapport à une normalisation complète.
- Les collections sont chargées en entier pour l’usage personnel/amis visé. Une pagination sera nécessaire à plus grande échelle. Le rate limiting en mémoire exige une instance unique.
- Les vérifications d’accessibilité réalisées ne constituent pas un audit WCAG 2.2 AA complet.

## Sources tarifaires étudiées

[Open Prices](https://openfoodfacts.github.io/open-prices/) publie une API et des données contributives ; ce n’est pas une garantie de prix officiels d’enseigne ou de couverture locale. Son [API et ses règles de licence](https://github.com/openfoodfacts/open-prices/blob/main/API.md) nécessitent une étude d’attribution et de compatibilité des données avant intégration. Aucun connecteur n’est activé ni annoncé comme opérationnel. Les saisies manuelles et imports CSV restent autonomes.

## Protection des données

La [CNIL distingue les données sensibles](https://www.cnil.fr/fr/definition/donnee-sensible) et présente des [questions spécifiques aux applications de santé/bien-être](https://www.cnil.fr/fr/applications-mobiles-en-sante-et-protection-des-donnees-personnelles-les-questions-se-poser). Mijovia sépare le consentement facultatif de saisie des mesures et l’acceptation des documents légaux. Ces mesures techniques ne constituent pas une conclusion juridique sur les obligations applicables, notamment en cas de partage avec des tiers.

## Audit des dépendances

L’audit complet signale quatre entrées de niveau faible issues d’une seule alerte transitive `deepmerge` (GHSA-gcqx-w48m-w2h4), dans Workbox/Rollup via vite-plugin-pwa. La dernière version publiée de deepmerge contrôlée était 4.3.1, encore signalée. Le correctif automatique proposé rétrograde le plugin PWA vers une ancienne version incompatible ; il n’a pas été appliqué. Le plugin PWA est réservé aux dépendances de développement. L’audit des dépendances de production est contrôlé séparément dans la recette. Suivre le correctif amont, sans prétendre qu’un audit npm démontre la sécurité globale de l’application.
