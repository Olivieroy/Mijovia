# Architecture

Mijovia est un monorepo npm comprenant une SPA React/TypeScript/Vite et une API REST Express/TypeScript. La cible est un domaine HTTPS : interface sous `/`, API sous `/api/v1`. En production Express peut servir uniquement les fichiers construits de `apps/web/dist` ; aucun répertoire de sources n’est exposé. Le wrapper Passenger charge l’API compilée.

## Frontend

React Router pour les routes, TanStack Query pour les données serveur et leur invalidation, React Hook Form pour les formulaires métier, Zod partagé pour la validation, Recharts avec tableaux accessibles, CSS natif avec variables et un module CSS pour les états. Les formulaires d’authentification utilisent FormData. Les données personnelles sont uniquement en mémoire du cache Query ; les cookies de session restent HttpOnly. La PWA met en cache les fichiers statiques, pas l’API. Aucune file de modifications hors ligne n’est annoncée ni implémentée.

Les pages couvrent accueil, connexion/inscription, profil/onboarding facultatif, tableau de bord, objectifs/poids/mensurations, sport, alimentation, recettes, repas, courses/inventaire, magasins/produits/prix, budgets/dépenses, statistiques, foyer, sécurité et administration. Les formulaires de collection partagent les mêmes composants d’édition pour garder des comportements cohérents.

## Persistance et intégrité

MySQL/MariaDB avec mysql2 et Drizzle. Les modèles se trouvent dans `apps/api/src/database/schema.ts`, les migrations SQL dans `apps/api/migrations`. Les migrations appliquées sont identifiées par nom et checksum ; elles ne doivent plus être modifiées.

Le schéma utilise des tables relationnelles dédiées aux comptes, identités, clés d’accès, sessions, challenges, foyers, membres, invitations, jetons de compte, paramètres et journaux. Les entités métier sont réunies dans `records`, avec un discriminant `kind`, un propriétaire, un foyer facultatif, une révision et des dates. Les champs métier sont des documents JSON validés par les schémas Zod de chaque domaine. Ce choix évite de dupliquer le CRUD pour une petite application personnelle ; il ne représente pas un schéma entièrement normalisé avec une table par champ métier. Les agrégats sont calculés dans les services TypeScript et non dans des requêtes analytiques SQL.

Les références entre documents sont aussi stockées dans `record_links`, avec clés étrangères réelles et suppression restreinte sur les références utilisées. Un document ne peut référencer que des données de même périmètre. Les ingrédients et séries d’exercice sont des sous-documents validés ; les profils et préférences restent privés. Les membres d’un repas sont contrôlés contre le foyer au moment de l’écriture.

Les écritures composées sont transactionnelles ; elles verrouillent le propriétaire ou le foyer pour sérialiser les changements. `revision` empêche un formulaire ouvert sur un autre appareil d’écraser une version plus récente. La liste du foyer est actualisée toutes les 15 secondes et à chaque retour sur la fenêtre. Pas de serveur WebSocket.

## Calculs

Montants : entiers en centimes sûrs, jamais des flottants représentant des euros dans le moteur. Quantités : chaînes décimales jusqu’à six décimales, calculs BigInt à précision fixe. Les portions sont arrondies par excès au millionième d’unité. Les conversions respectent les familles masse/volume/pièce ; aucune conversion de masse en volume n’est inventée. Les paniers cumulent les besoins, affectent les stocks en tenant compte de leur péremption au jour du repas puis calculent le nombre entier de conditionnements. Les prix manquants sont null et produisent un total explicitement incomplet.

La génération est déterministe : exclusions et allergènes renseignés, temps, variété, favoris, stocks et, si un budget est fourni, coûts connus. Elle ne prouve pas l’optimalité globale d’un menu. Si le budget ne peut pas être garanti avec les données disponibles, toute la génération est annulée plutôt que de réduire les portions. Les prix de plusieurs magasins sont comparés parmi les tarifs saisis. Les estimations nutritionnelles sont dérivées uniquement des valeurs entrées, avec un signalement des données absentes.

Les montants d’un foyer utilisent sa devise propre. Aucun taux de change automatique. La devise personnelle ne peut être changée après saisie de montants sans migration explicite.

## Confidentialité

Le poids, les mensurations, les objectifs, le sport, les préférences et le profil sont toujours personnels. Un foyer n’obtient pas de droit de lecture sur le profil de ses membres. L’utilisateur peut autoriser explicitement la prise en compte de ses allergènes dans le générateur partagé ; cette permission est distincte du consentement de saisie du poids. Les journaux stockent un nom d’opération, pas les valeurs de santé. L’administration expose les comptes et événements techniques, jamais le contenu privé des modules santé.

Les exports personnels n’incluent pas les secrets d’authentification ou les données personnelles des autres membres. Les données créées dans le foyer sont conservées dans ce foyer lors de la suppression du compte, par transfert de leur propriété technique au propriétaire du foyer. Il faut d’abord transférer ou supprimer un foyer dont on est propriétaire.

## Évolutions possibles

Pour un volume important, normaliser les entités très sollicitées, paginer les collections et déplacer les agrégats en SQL. Le contrôle des périmètres et les schémas publics constituent la frontière à préserver. Le rate limiting actuel est en mémoire et suppose une instance API unique ; il faudra un stockage partagé pour plusieurs processus. Les migrations DDL MySQL ne sont pas atomiques : sauvegarde et restauration restent indispensables.
