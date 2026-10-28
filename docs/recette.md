# Recette locale — 28 octobre 2026

## Environnement

Node 24.22.1, MySQL 9.6 dans une instance temporaire dédiée à Mijovia (aucune base existante utilisée), migrations versionnées 0001 à 0004. Le runtime système Node 20.11 a été écarté pour les vérifications finales ; la cible minimale est Node 22.

## Résultat final

La suite complète a réussi : **17 tests passés, aucun échec et aucun test ignoré**, dont le scénario MySQL et les routes HTTP de production. L’audit `npm audit --omit=dev` ne signale aucune vulnérabilité d’exécution ; l’audit complet conserve les quatre entrées faibles d’une alerte transitive de build décrite dans les limites.

## Contrôles réalisés

- Compilation du package partagé, du backend et de React/Vite ; production du manifest, icônes, service worker et chunks statiques.
- Tests unitaires : hachage et vérification de mot de passe, tokens aléatoires, garde de dernière méthode, contrôle CSRF/origine, conversions, portions, regroupement et stocks, péremption au jour du repas, conditionnements, prix inconnus, sommes monétaires exactes et débordements, budgets, exclusions/allergènes inconnus, moyenne mobile et validation des dates/formulaires.
- Scénario d’intégration sur vraie base MySQL avec comptes fictifs : inscription, connexion, accès admin refusé, CSRF refusé, consentement de santé, isolation des poids, écriture interutilisateur refusée, conflit de révision, foyer et invitation à usage unique, accès interfoyer refusé, données privées interdites dans le foyer, aliments/recettes/magasins/produits/prix, stocks, panier et liste, interdiction de suppression d’une référence utilisée, dépenses/budgets/statistiques, génération de 14 repas, récurrence hebdomadaire sans doublons, vérification e-mail et réinitialisation à usage unique via transport de test, révocation des sessions, export, départ du foyer, contrôle de dernière méthode et suppression du compte.
- Tests HTTP du build de production : routes SPA directes, manifest valide, icônes, service worker, 404 API distincte du fallback React, sources et environnement non exposés comme fichiers.
- Recette manuelle dans le navigateur : accueil, connexion d’un compte fictif, tableau de bord, import du catalogue, modification persistée d’une recette, génération d’une semaine, création d’un budget de 120,50 € et préremplissage correct du montant en modification. Contrôle console : aucune erreur JavaScript relevée sur ces parcours.
- Responsive : largeur 390 px sans dépassement horizontal du document, navigation mobile visible, retour à la largeur ordinateur. Captures du compte fictif dans `docs/screenshots`.
- Contrôle des fichiers et du formatage ; aucun PHP dans le projet. Aucun secret ou fichier `.env` ne doit entrer dans le commit.

## Commandes reproductibles

```sh
npm ci
npm run build
npm test
TEST_DATABASE_URL='mysql://utilisateur:motdepasse@localhost/mijovia_test' npm run test:integration
npm audit --omit=dev
```

La base de test doit être créée et migrée séparément. Le test d’intégration est ignoré si TEST_DATABASE_URL n’est pas fourni. Les tests HTTP demandent l’autorisation d’ouvrir une écoute locale dans les environnements sandboxés. La suite complète peut être lancée avec TEST_DATABASE_URL pour inclure les tests MySQL dans le même passage.

## Non vérifié

Connexion Google avec un vrai client OAuth, Passkeys réelles sur appareils/gestionnaires, délivrabilité SMTP, installation iPhone/Android, environnement Passenger/cPanel et domaine HTTPS réels, restauration d’un dump de production. Les liens d’e-mail ont été reçus par un transport de test, pas par une boîte SMTP réelle. Les parcours ci-dessus ne constituent ni une certification WCAG AA complète ni un audit de sécurité exhaustif.

Les validations restantes et compromis fonctionnels sont listés dans `docs/limites.md`. Aucun déploiement n’a été effectué.
