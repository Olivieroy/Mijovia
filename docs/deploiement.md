# Déploiement o2switch/cPanel

## Ce qui est confirmé et ce qui reste à vérifier

La [documentation officielle o2switch](https://faq.o2switch.fr/cpanel/logiciels/hebergement-nodejs-multi-version/) décrit Setup Node.js App, Passenger et la sélection des versions Node. Elle ne prouve pas la configuration du compte cible. Aucun accès cPanel, SSH, domaine de production ou base distante n’a été fourni.

Avant déploiement : confirmer la propriété du compte, le domaine dédié à Mijovia, Node 22 ou 24, les versions MySQL/MariaDB, Setup Node.js App, les variables d’environnement, SMTP, cron, HTTPS, sauvegardes et limites de ressources. Tester les dépendances sur cet environnement. Prévoir une seule instance API tant que la limitation de débit est en mémoire.

## Architecture retenue

Un domaine HTTPS, API `/api/v1`, frontend compilé servi sous `/`. Le processus Express sert les fichiers statiques de `apps/web/dist`, avec fallback sur `index.html` uniquement hors API. Les sources, `.env`, migrations et sauvegardes restent hors du document root public.

Créer dans cPanel une application Node dont **Application root** est le répertoire du monorepo hors document root et dont **Application startup file** est `apps/api/passenger.cjs`. Ce wrapper CommonJS importe le serveur ESM compilé. Sélectionner l’URL de l’application à la racine du domaine confirmé. Passenger doit gérer l’écoute ; ne pas lancer un serveur permanent additionnel ni PM2. Valider la prise en charge du wrapper sur le compte réel.

Cette organisation évite de maintenir deux configurations Apache concurrentes. Si le compte impose le frontend statique directement sous Apache et Passenger sous `/api`, conserver le proxy vers l’API et exclure `/api`, les fichiers et les répertoires existants de toute réécriture vers `index.html`. Ne jamais remplacer le `.htaccess` d’une autre application ; laisser cPanel produire ses directives Passenger. Deux domaines exigeraient CORS et une adaptation explicite des cookies/CSRF : ce mode n’est pas activé dans cette version.

## Préparation et première installation

1. Sauvegarder l’existant et créer une base dédiée avec un utilisateur limité à cette base. Aucune autre application ne doit être touchée.
2. Construire avec Node 22+ : `npm ci`, `npm run build`, `npm test`. Exécuter les tests MySQL sur une base de préproduction, jamais sur des données réelles.
3. Transférer les sources nécessaires et les trois dossiers `dist` (shared, API, web) dans l’application. Pour un build effectué ailleurs, installer les dépendances de production avec le lockfile. Ne pas transférer `.env` local ou `node_modules` d’un autre système.
4. Définir les variables côté cPanel : NODE_ENV=production, APP_ORIGIN=https://domaine-confirmé, DATABASE_URL, RP_ID, SMTP et fournisseurs souhaités. Aucun préfixe VITE pour les secrets. Les variables cPanel sont préférables à un fichier public ; si `.env` est utilisé en SSH, le placer hors document root et restreindre ses droits.
5. Depuis la racine du projet, appliquer les migrations une seule fois avec `npm run db:migrate`. Elles nécessitent les outils de développement tsx ; conserver ces dépendances dans l’environnement de migration ou appliquer manuellement les SQL versionnés en suivant exactement le registre de migrations. Le script contrôle les checksums et un verrou de migration. En cas d’échec DDL partiel, arrêter et restaurer la sauvegarde ou réparer de manière documentée, sans relancer aveuglément.
6. Initialiser facultativement le catalogue avec `npm run db:seed`, créer le compte propriétaire, puis `npm run account:admin -- email`. Aucun compte admin automatique.
7. Redémarrer via cPanel. Vérifier le journal Passenger et une requête vers `/auth/config` via `/api/v1`. Configurer TRUST_PROXY=true uniquement si le proxy d’entrée nettoie les en-têtes transmis et si l’API n’est pas directement accessible.
8. Programmer `npm run db:cleanup` par cron dans l’environnement Node du compte. Les tâches CLI doivent disposer de l’environnement et de `.env` si les scripts npm l’utilisent.

## Configuration des fournisseurs

Google : client OAuth Web, origine JavaScript autorisée égale au domaine HTTPS, GOOGLE_CLIENT_ID et GOOGLE_ENABLED=true. Passkeys : PASSKEYS_ENABLED=true, RP_ID=nom d’hôte et APP_ORIGIN exacte. Les clés créées sur localhost ne sont pas réutilisables sur un autre RP. Apple ne doit pas être activé : seule son extension future est prévue.

SMTP : serveur du compte, port et expéditeur autorisé, identifiants côté serveur. L’envoi exige TLS (465 implicite, STARTTLS sur 587). Tester la réception et la délivrabilité avant ouverture des inscriptions publiques.

## Recette après mise en ligne

Vérifier assets et en-têtes réellement servis, routes directes React, 404 JSON pour `/api/...`, cookies HttpOnly/Secure/SameSite, connexion/déconnexion, origine/CSRF, session après redémarrage, récupération e-mail, Google réel, Passkeys sur iPhone et ordinateur, génération et partage des courses, permissions entre comptes, PWA/manifest/service worker, mise à jour et page hors ligne. Contrôler restauration de sauvegarde et suppression du compte. Un build local n’est pas une validation de ces opérations.

Toute bascule DNS ou publication sur un domaine non confirmé exige une validation explicite. Compléter les documents légaux et le cadrage de protection des données avant ouverture à des tiers.
