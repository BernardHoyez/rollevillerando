# Rollevillerando

Site statique présentant les randonnées faites autour du village de Rolleville.
Chaque randonnée est une vignette photo + un titre + 3 liens : **Visite**,
**KML**, **GPX**. Les trois fichiers liés sont produits par la PWA
[GeoTour](https://bernardhoyez.github.io/geotour).

Aucune dépendance, aucun build : HTML/CSS/JS statiques, déployables tels
quels sur Netlify.

## Ajouter une randonnée

1. Dans GeoTour, préparez votre randonnée puis :
   - onglet **Visite** → bouton **« Exporter HTML »** → fichier `.html`
     autonome (idéalement la version « hors-ligne » si vous voulez qu'elle
     fonctionne sans réseau une fois ouverte).
   - onglet **Déploiement** → export du paquet → dézippez-le, vous y
     trouverez les fichiers `.kml` et `.gpx`.
2. Choisissez un nom de dossier sans espace ni accent, par exemple
   `bois-de-la-garenne`.
3. Créez `randonnees/bois-de-la-garenne/` et déposez-y :
   - une photo de vignette (`vignette.jpg`, idéalement carrée ou proche),
   - le fichier de visite exporté,
   - le `.kml` et le `.gpx`,
   - un fichier `rando.json` (voir modèle ci-dessous).
4. Ajoutez `"bois-de-la-garenne"` dans `randonnees.json`, à la place où vous
   voulez qu'il apparaisse dans la liste.
5. Déployez (glisser-déposer le dossier sur Netlify, ou `git push` si le
   site est relié à un dépôt).

### Modèle de `rando.json`

```json
{
  "titre": "Le bois de la Garenne",
  "vignette": "vignette.jpg",
  "visite": "visite.html",
  "kml": "bois-de-la-garenne.kml",
  "gpx": "bois-de-la-garenne.gpx",
  "distance": "4,8 km",
  "duree": "1 h 30",
  "denivele": "60"
}
```

Seuls `titre`, `vignette`, `visite`, `kml` et `gpx` sont utilisés pour
l'affichage des liens. `distance`, `durée` et `dénivelé` sont optionnels et
n'apparaissent que s'ils sont renseignés. Les noms de fichiers peuvent être
ceux que GeoTour a générés (pas besoin de les renommer).

Le site n'a besoin d'aucune autre intervention : `app.js` lit
`randonnees.json` puis, pour chaque dossier listé, son `rando.json`, et
construit les vignettes automatiquement.

### Téléchargement du fichier de visite

Les visites exportées en mode hors-ligne (fond de carte MBtiles embarqué)
peuvent peser 100 à 200 Mo. Le bouton « Visite » ne fait donc pas un simple
lien : il télécharge le fichier via `fetch()` en suivant sa progression
(barre en haut de page + pourcentage affiché sur le bouton), ouvre un onglet
dès le clic pour éviter le blocage pop-up, puis y affiche la visite une fois
le fichier reçu. Aucune configuration n'est nécessaire ; cela fonctionne
automatiquement pour n'importe quelle taille de fichier.

## Dossier d'exemple

`randonnees/etang-de-rolleville/` est un exemple de démonstration (avec des
fichiers Visite/KML/GPX factices) pour vérifier que tout s'affiche
correctement. Remplacez-le par une vraie randonnée ou supprimez-le (et
retirez `"etang-de-rolleville"` de `randonnees.json`).

## Déploiement Netlify

- **Nom du site** : `rollevillerando` → `rollevillerando.netlify.app`
- Déploiement le plus simple : glisser tout le dossier du projet sur
  [app.netlify.com/drop](https://app.netlify.com/drop).
- Ou en connectant un dépôt Git : aucune commande de build, dossier de
  publication = racine du projet.

## Service worker (cache)

Le site suit la convention « brise-cache » : `sw.js` porte une constante de
version (`CACHE_NAME`). **Incrémentez cette version à chaque mise à jour des
fichiers statiques** (`index.html`, `style.css`, `app.js`, `manifest.json`,
icônes) pour forcer les navigateurs à récupérer la nouvelle version. Les
fichiers de contenu (`randonnees.json`, les `rando.json`, les visites/KML/GPX)
sont, eux, toujours relus en priorité sur le réseau — ajouter une randonnée
n'exige donc pas d'incrémenter la version du cache.

## Structure du projet

```
index.html
style.css
app.js
manifest.json
sw.js
netlify.toml
randonnees.json
img/etang-rolleville.jpg      (bandeau héros)
icons/
randonnees/
  etang-de-rolleville/         (exemple, à remplacer)
    vignette.jpg
    visite.html
    etang-de-rolleville.kml
    etang-de-rolleville.gpx
    rando.json
```
