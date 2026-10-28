# Authentification

## Configuration

Copier `.env.example` et renseigner l’environnement côté serveur. GOOGLE_ENABLED=false et PASSKEYS_ENABLED=false masquent les méthodes correspondantes. Google exige GOOGLE_CLIENT_ID et une origine JavaScript autorisée exactement égale à APP_ORIGIN. Les clés privées ne passent jamais au frontend ; le client ID public est renvoyé par `/api/v1/auth/config`.

Pour WebAuthn : RP_ID est le nom d’hôte sans protocole ni port, APP_ORIGIN est l’origine exacte avec le port si nécessaire. Utiliser localhost pour les essais locaux et HTTPS en production. Les clés d’un RP ne sont pas transférables vers un autre domaine. Node 22+ est requis par la chaîne de dépendances retenue.

## Méthodes et association

Connexion classique avec mots de passe hachés par scrypt natif Node (N=32768, r=8, p=3). Google utilise GIS en mode bouton/callback et un ID token OpenID Connect. Il n’y a pas de code d’autorisation ni refresh token : PKCE et state ne s’appliquent pas à ce flux. La bibliothèque Google valide signature, émetteur, audience et expiration ; l’API contrôle un nonce serveur de cinq minutes à usage unique et l’e-mail vérifié.

L’identité est indexée par `(provider,subject)`. Un e-mail existant bloque la création d’un second compte, sans association automatique. L’utilisateur se connecte au compte existant puis associe explicitement Google. Une identité appartenant à un autre compte ne peut pas être transférée. Une nouvelle association requiert une identité vérifiée récemment ; une identité Google déjà associée permet de renouveler cette vérification.

Les Passkeys utilisent SimpleWebAuthn : validation de l’origine, du RP ID, du challenge, de la signature et vérification utilisateur exigée. Les challenges sont persistés et consommés atomiquement. Les compteurs des clés sont verrouillés pendant la vérification. Le serveur ne reçoit aucune donnée biométrique. Plusieurs clés peuvent être associées au même compte.

## Sessions et protection des mutations

Sessions persistées en MySQL, secrets de 256 bits dont seul le condensat SHA-256 est stocké. Cookies HttpOnly, SameSite=Lax, Secure en production et préfixe __Host- sans Domain. Rotation à la connexion et expiration absolue de 30 jours. Origine exacte et jeton CSRF par session pour chaque mutation. Limites par IP globales, sur l’authentification et sur l’inscription ; honeypot sur l’inscription. Le rate limiting en mémoire suppose une seule instance API.

L’ajout/retrait d’une méthode et le changement de mot de passe exigent une vérification de moins de cinq minutes. Le retrait verrouille le compte et exige une autre méthode effectivement activée ; les autres sessions sont révoquées après retrait/changement du mot de passe. L’administration peut suspendre un compte, ce qui révoque ses sessions et interdit une nouvelle connexion.

## E-mail et récupération

Configurer SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD et MAIL_FROM pour la vérification et la récupération. TLS implicite sur 465 ou STARTTLS sur 587. Les liens sont aléatoires, seuls leurs condensats sont stockés. Expiration de 24 h pour la vérification, 1 h pour la réinitialisation ; consommation atomique à usage unique. Une réinitialisation révoque les sessions du compte. La réponse de demande de récupération ne révèle pas l’existence de l’adresse.

Une panne SMTP ne bloque pas la connexion classique ; l’absence de SMTP est indiquée au moment d’une demande de lien. La vérification peut être redemandée dans le profil. Une invitation de foyer adressée à un e-mail exige que cette adresse soit vérifiée. La récupération par e-mail seule n’est pas comptée comme méthode de connexion restante lors d’une dissociation.

## Apple

Le modèle identities permet un futur provider apple. APPLE_ENABLED est réservé et n’active aucune interface. Une intégration réelle demanderait Team ID, Key ID, Service ID et clé privée côté serveur, un flux authorization code avec state/nonce, la validation JWT et une stratégie de callback form_post compatible avec SameSite. Aucun abonnement Apple Developer n’est nécessaire pour les méthodes livrées.

## Références et recette

[Validation des ID tokens Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [GIS et nonce](https://developers.google.com/identity/gsi/web/reference/js-reference), [SimpleWebAuthn serveur](https://simplewebauthn.dev/docs/packages/server). Voir `docs/recette.md` pour la distinction entre tests locaux réussis et validations réelles restantes.
