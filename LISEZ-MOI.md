# Installer Chocolat sur ton téléphone Android

## Pourquoi le raccourci ne marchait pas

Chrome sur Android désactive « Ajouter à l'écran d'accueil » pour les fichiers ouverts
en `file://` (un fichier téléchargé sur le téléphone). L'installation d'une application
web exige que la page soit **servie en HTTPS** par un serveur. C'est une règle de sécurité
de Chrome, pas un problème du fichier.

La solution la plus simple et gratuite : **GitHub Pages**.

---

## Mise en ligne sur GitHub Pages — 5 minutes

À faire depuis un ordinateur, c'est plus confortable.

1. Va sur **github.com** → bouton **New** (nouveau dépôt).
2. Nom du dépôt : `chocolat`. Visibilité : **Public** (obligatoire pour Pages gratuit).
   Ne coche rien d'autre. → **Create repository**.
3. Sur la page du dépôt vide : **uploading an existing file**.
4. Fais glisser **les 8 fichiers** de ce dossier (pas le dossier lui-même) :
   - `index.html`
   - `mouvements.js`  ← indispensable pour les schémas animés des exercices
   - `manifest.webmanifest`
   - `sw.js`
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable-512.png`
   - `apple-touch-icon.png`

   > ⚠️ Si `mouvements.js` manque, l'application fonctionne mais **les petits personnages
   > qui montrent les mouvements n'apparaissent pas**. C'est la cause n°1 des animations
   > absentes sur une copie de l'app.
5. **Commit changes**.
6. Onglet **Settings** → menu de gauche **Pages** → sous *Branch*, choisis `main`
   et le dossier `/ (root)` → **Save**.
7. Attends une à deux minutes, puis recharge la page Settings → Pages.
   L'adresse s'affiche : `https://<ton-compte>.github.io/chocolat/`

---

## Installation sur le téléphone

1. Ouvre cette adresse dans **Chrome** sur Android.
2. Chrome propose une bannière **« Installer l'application »** en bas de l'écran.
   Sinon : menu **⋮** → **Ajouter à l'écran d'accueil** ou **Installer l'application**.
   Un bouton **Installer sur l'écran d'accueil** apparaît aussi dans l'app, en bas
   de l'onglet **Toi**.
3. L'icône apparaît sur l'écran d'accueil. L'app se lance en plein écran, sans barre
   d'adresse, et **fonctionne sans connexion** (le service worker met tout en cache
   à la première ouverture).

Sur iPhone, c'est Safari → bouton Partager → **Sur l'écran d'accueil**.

---

## Où sont mes données

Poids, tour de taille, profil et disponibilités sont stockés **uniquement dans le
navigateur du téléphone** (`localStorage`). Rien n'est envoyé nulle part, le dépôt
GitHub ne contient que le code de l'application.

Conséquence : si tu vides les données de Chrome ou si tu désinstalles l'app, l'historique
part avec. Le bouton **Effacer toutes mes données** dans l'onglet *Toi* fait la même chose,
volontairement.

---

## Mettre l'app à jour plus tard

Remplace `index.html` dans le dépôt GitHub, et incrémente la ligne
`const CACHE = 'chocolat-v1';` en haut de `sw.js` (`chocolat-v2`, etc.).
Sans ce changement de numéro, le téléphone continuera à servir l'ancienne version
depuis son cache.

---

## Alternative sans GitHub

Ton NAS Synology peut aussi héberger le dossier via **Web Station**, mais l'installation
en tant qu'application exigera un certificat HTTPS valide (DDNS Synology + Let's Encrypt,
tous deux gratuits dans le DSM). C'est faisable mais nettement plus long que GitHub Pages.

Autre option en deux minutes : **app.netlify.com/drop** — on y dépose le dossier, l'adresse
HTTPS est générée immédiatement, sans compte.
