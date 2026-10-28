# API REST v1

Base : `/api/v1`. JSON, cookies de session ; pas de bearer token dans le navigateur. Toutes les mutations exigent `Origin` égal à APP_ORIGIN et `X-CSRF-Token` obtenu via `GET /auth/config`. Les réponses API portent `Cache-Control: no-store`. Erreurs `{error:string}` ; 400 validation, 401 connexion, 403 permission, 404 absent, 409 conflit, 429 limite, 503 SMTP indisponible. Les erreurs internes ne renvoient pas les détails SQL.

## Authentification

| Méthode | Route                             | Corps / comportement                                                                          |
| ------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| GET     | `/auth/config`                    | CSRF, méthodes configurées, état des inscriptions                                             |
| GET     | `/auth/me`                        | Compte courant ou null                                                                        |
| POST    | `/auth/register`                  | name, email, password, confirmation, legalAccepted=true, website vide, invitation facultative |
| POST    | `/auth/password`                  | email, password ; rotation de session                                                         |
| POST    | `/auth/password/set`              | password, vérification récente exigée                                                         |
| POST    | `/auth/logout`                    | Détruit la session                                                                            |
| POST    | `/auth/forgot`                    | email ; réponse générique, SMTP requis                                                        |
| POST    | `/auth/reset`                     | token, password, confirmation ; lien à usage unique, révocation des sessions                  |
| POST    | `/auth/verify/request`            | Compte connecté, envoi du lien                                                                |
| POST    | `/auth/verify`                    | token à usage unique                                                                          |
| POST    | `/auth/google/options`            | mode login/link ; nonce lié à la session                                                      |
| POST    | `/auth/google`                    | credential, mode, legalAccepted pour une création, invitation éventuelle                      |
| POST    | `/auth/passkeys/register/options` | Compte vérifié récemment                                                                      |
| POST    | `/auth/passkeys/register`         | response WebAuthn, name                                                                       |
| POST    | `/auth/passkeys/options`          | Connexion découvrable                                                                         |
| POST    | `/auth/passkeys/authenticate`     | Réponse WebAuthn                                                                              |
| DELETE  | `/auth/methods/:kind/:id`         | kind google/passkey/password, accès restant et identité récente contrôlés                     |

## Données métier

`GET /data` lit le périmètre personnel. `?householdId=UUID` sélectionne un foyer dont le compte doit être membre. Ce paramètre s’applique aussi aux calculs métier. Les types privés ne sont jamais inscriptibles dans un foyer.

`POST /data/:kind` : `{data:…}`. `PUT /data/:kind/:id` : `{data:…,revision:n}`. `DELETE /data/:kind/:id` : `{revision:n}`. La réponse de création est `{id}`. Les listes contiennent id, kind, data, revision, householdId et updatedAt. Les schémas exhaustifs sont dans `packages/shared/src/index.ts`.

Types : profiles, goals, weights, measurements, sports, exercises, workouts, foods, preferences, recipes, meals, stores, products, prices, inventory, shoppingLists, shoppingItems, budgets, expenses, notifications. Les références liées à un autre périmètre sont refusées, même avec un UUID valide.

| Route POST            | Entrée principale                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `/shopping/preview`   | start, end, storeId facultatif ; quantités, tarifs, total et coûts moyens                               |
| `/shopping/generate`  | Même entrée ; crée une nouvelle liste et ses articles dans une transaction                              |
| `/shopping/optimize`  | start, end ; compare les offres disponibles et signale les prix absents                                 |
| `/meals/generate`     | start, end, slots[], servings, maxPrep/budgetCents/storeId facultatifs ; conserve les repas verrouillés |
| `/meals/copy`         | start, end, target ; destination vide requise                                                           |
| `/meals/alternatives` | date, servings, mode rapide/stock/prix/similaire, recipeId facultatif                                   |
| `/recipes/portions`   | recipeId, servings ; ingrédients recalculés et nutrition partielle identifiée                           |
| `/workouts/expand`    | workoutId, until ; occurrences hebdomadaires persistées, sans doublons générés                          |
| `/prices/import`      | items[] (500 maximum), chaque prix validé et références contrôlées                                      |
| `/catalogue/import`   | Copie explicite du catalogue commun et remappage des références                                         |

`GET /statistics?start=YYYY-MM-DD&end=YYYY-MM-DD` : poids personnel, activités, séries, repas, nutrition, budgets, dépenses et prix du périmètre choisi. `GET /catalogue` expose uniquement les modèles publiés par le propriétaire.

## Foyers

`GET /households`, `POST /households {name,currency}`. Invitations : `POST /households/:id/invitations {email?}` renvoie un lien temporaire, `DELETE /households/:id/invitations/:invitation` le révoque. `POST /households/join {token}` consomme le lien. Si l’invitation désigne un e-mail, cette adresse doit être vérifiée sur le compte destinataire. `DELETE /households/:id/members/:member` : propriétaire ou départ de soi-même ; le propriétaire doit transférer avant de partir. `POST /households/:id/transfer {userId}` et `DELETE /households/:id` exigent une identité récente.

## Compte et administration

`GET /account/export`, `GET /account/sessions`, `DELETE /account/sessions` (autres appareils), `DELETE /account {confirmation:'SUPPRIMER'}`. Les opérations sensibles exigent une vérification de moins de cinq minutes.

Routes réservées au rôle admin : `GET /admin`, `PUT /admin/registration {enabled,invitationOnly}`, `POST /admin/invitations`, `PUT /admin/users/:id {suspended}`, `PUT /admin/sources {sources:[{name,url?,note}]}`, `POST /admin/catalogue/publish`. Le rôle propriétaire est attribué explicitement hors HTTP via `npm run account:admin -- email` ; aucune inscription ne peut choisir son rôle.
