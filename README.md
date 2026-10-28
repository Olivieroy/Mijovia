# Mijovia

**Mangez mieux. Bougez à votre rythme. Maîtrisez votre budget.**

PWA francophone React + TypeScript, API Express + TypeScript, MySQL/MariaDB et Drizzle. Application personnelle et multiutilisateur : objectifs, poids, activités, alimentation, recettes, menus, courses, prix, budgets et foyers. Les prix sont saisis ou importés manuellement ; aucune API d’enseigne ou donnée nutritionnelle inventée.

## Démarrage

Node.js **22 minimum**, npm et une base MySQL/MariaDB dédiée. Le build a aussi été vérifié avec Node 24. Ne pas utiliser Node 20.11 présent sur certaines machines : les dépendances PWA/WebAuthn requièrent une version plus récente.

```sh
npm ci
cp .env.example .env
# Renseigner DATABASE_URL et APP_ORIGIN dans .env.
npm run build
npm run db:migrate
npm run db:seed
```

Le catalogue de départ contient des recettes modifiables et des aliments dont les allergènes restent explicitement inconnus. Il ne crée aucun compte ni prix. Dans deux terminaux :

```sh
npm run dev
npm run dev -w apps/web
```

Ouvrir l’URL correspondant exactement à APP_ORIGIN, par défaut `http://localhost:5173`. L’API utilise le port 3000 et le proxy Vite conserve une origine unique. Créer son compte dans l’interface, puis attribuer explicitement le rôle propriétaire si nécessaire :

```sh
npm run account:admin -- votre-adresse@example.fr
```

L’inscription ne peut jamais demander ce rôle elle-même. Google et les Passkeys restent masqués tant qu’ils ne sont pas activés. Apple reste une extension réservée. SMTP est nécessaire pour recevoir les liens de vérification et de récupération ; son absence ne bloque pas la connexion.

## Utilisation

1. Configurer le profil, les modules souhaités, les repas habituels et les exclusions. Les données de santé sont facultatives.
2. Importer explicitement le catalogue commun ou créer ses aliments et recettes.
3. Ajouter les magasins, produits, conditionnements et prix connus.
4. Planifier ou générer les repas et renseigner les stocks disponibles.
5. Estimer le panier, créer une liste de courses, définir les budgets et saisir les dépenses.
6. Créer un foyer pour partager les saisies choisies ; sélectionner « Personnel » ou le foyer avant chaque opération.

Les pages poids, sport et profil restent privées, quel que soit le périmètre choisi. Les données du foyer sont synchronisées par rafraîchissement léger.

## Vérifications

```sh
npm run build
npm test
# Base de test séparée et préalablement migrée :
TEST_DATABASE_URL='mysql://utilisateur:motdepasse@localhost/mijovia_test' npm run test:integration
```

Les tests métier portent notamment sur les conversions, portions, stocks/péremptions, conditionnements, montants, budgets, allergies et statistiques. Le test d’intégration utilise des comptes fictifs et nettoie uniquement ses propres données. Voir [la recette et ses limites](docs/recette.md).

## Documentation

- [Cahier des charges fourni](docs/cahier-des-charges.md)
- [Architecture et modèle de données](docs/architecture.md)
- [API](docs/api.md)
- [Authentification](docs/authentification.md)
- [Installation et déploiement o2switch/cPanel](docs/deploiement.md)
- [Sauvegarde, restauration et incidents](docs/exploitation.md)
- [Recette et critères de validation](docs/recette.md)
- [Limites et éléments à configurer](docs/limites.md)
- [Instructions pour les prochaines interventions](AGENTS.md)

Le code constitue une première version des modules, pas une certification d’accessibilité, de conformité juridique ou une preuve de fonctionnement sur un compte cPanel qui n’a pas été fourni. Aucun déploiement n’est réalisé par les commandes de build ou les tests.
