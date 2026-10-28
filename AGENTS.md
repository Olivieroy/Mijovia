# Mijovia — instructions de développement

## Projet

PWA francophone personnelle et multiutilisateur : React/TypeScript/Vite, Express/TypeScript, MySQL/MariaDB, Drizzle. Lire `docs/cahier-des-charges.md`, `docs/architecture.md` et `docs/recette.md` avant d’élargir le périmètre. Le référentiel métier d’Olivier reste `~/Documents/Freelance/OR-Framework/` pour les offres, prestations, choix WordPress et processus de livraison. Aucun tarif ne doit être inventé.

## Organisation

- `apps/web/src/features` : écrans par domaine, formulaires RHF, validation Zod partagée, CSS natif et modules CSS. React Router et TanStack Query pour navigation/cache mémoire.
- `apps/api/src/app.ts` : application Express exportée, sessions et authentification ; `server.ts` démarre l’écoute et l’arrêt contrôlé.
- `apps/api/src/modules` : services de données, calculs métier purs, mail et contrôleurs REST.
- `apps/api/src/database/schema.ts` : modèles Drizzle ; `apps/api/migrations` : SQL versionné immuable.
- `packages/shared` : schémas Zod, types et règles de référence.
- `scripts` : migrations, catalogue initial, maintenance et gestion du rôle propriétaire.

## Commandes

Node 22+ et npm ; `npm ci`, `npm run build`, `npm test` ; `npm run db:migrate`, `npm run db:seed` après configuration `.env`. Deux terminaux : `npm run dev` et `npm run dev -w apps/web`. `TEST_DATABASE_URL=... npm run test:integration` exige une base dédiée migrée. Compiler shared avant d’exécuter tests/scripts après une modification de ses schémas.

## Conventions et sécurité

- Authentifier et contrôler le périmètre personnel/foyer côté serveur, y compris toutes les références de données.
- Aucune donnée de poids, sport ou profil partagée avec le foyer. L’admin ne peut pas consulter la santé privée.
- Ne jamais associer une identité OIDC par e-mail seul. Conserver le contrôle du nonce, de l’audience, de l’émetteur et de la signature.
- Sessions MySQL, cookies HttpOnly/Secure/SameSite et CSRF pour chaque mutation. Aucun secret en localStorage ni dans le dépôt.
- Toute modification utilise `revision` pour détecter les conflits. Transactions et verrou de périmètre pour les opérations composées. Ne jamais réutiliser une migration déjà appliquée.
- Montants entiers en centimes, quantités décimales textuelles et calculs BigInt. Prix inconnus = null ; aucune donnée nutritionnelle ou tarif inventée.
- Ne jamais convertir une quantité de masse en volume sans information adaptée. Ne jamais réduire les portions pour satisfaire un budget.
- Aucun accès direct à un identifiant de table provenant du client : seules les valeurs paramétrées et les types validés sont admis.
- Pas de logs de mots de passe, liens secrets, cookies ou données de santé. Pas de cache PWA sur les API.
- Conserver l’accessibilité clavier, les libellés, le responsive et le mode sombre. Vérifier les comportements réels et leurs états d’erreur.

## Vérification et livraison

Vérifier les fichiers modifiés, compiler TypeScript, lancer les tests métier et les tests MySQL pour toute modification des autorisations ou transactions. Recetter les parcours concernés dans le navigateur avec des données fictives. Pas de PHP dans cette application. Indiquer précisément les vérifications impossibles.

Hébergement cible o2switch/cPanel : Node 22+, Passenger, assets statiques construits, un domaine, HTTPS, une instance API tant que le rate limiting est en mémoire. Ne pas imposer PM2 ou un service WebSocket. Lire `docs/deploiement.md` ; ne pas modifier un autre site ni déployer sur un domaine non confirmé. Aucun déploiement réel sans validation explicite. Préserver les modifications locales sans rapport, ne jamais committer `.env`, les sauvegardes ou les données de test locales.
