# ndf_sender — conception

Date : 2026-10-31

## Intention

Théo prend en photo ses justificatifs de frais (tickets de caisse, factures) au fil du mois. Aujourd'hui, en fin de mois, il doit retrouver les bonnes photos dans sa galerie au milieu des autres, passer chacune dans une appli de scan (iScanner) pour obtenir un PDF lisible et léger, puis se les envoyer par mail. Sur son ordinateur, un agent traite ensuite ce mail pour produire ses notes de frais.

ndf_sender remplace ces trois étapes manuelles : les justificatifs sont rangés à part dès l'ajout, scannés à ce moment-là, et un bouton en fin de mois prépare le mail.

## Objectifs

- Ajouter un justificatif en quelques secondes :
  - **photo** prise avec l'appareil photo, puis scannée ;
  - **photo existante** importée depuis la galerie, puis scannée de la même façon ;
  - **PDF existant** (facture reçue par mail, etc.) importé tel quel, sans traitement.
  - **Partage depuis une autre appli** : ndf_sender apparaît dans le menu Partager d'Android (Web Share Target). Une photo partagée depuis la galerie suit le flux « galerie » (avec scan), un PDF partagé depuis Gmail ou un gestionnaire de fichiers suit le flux « pdf ». Décidé avec Théo.
- **Un élément = une seule image ou un seul PDF.** Pas de multipage dans l'app : pour un justificatif en plusieurs morceaux, Théo crée plusieurs éléments et les relie par sa note (par exemple `Hôtel Lyon.1`, `Hôtel Lyon.2`), et l'agent les rassemble. Décidé avec Théo.
- Ajouter une **note** texte facultative à chaque élément, modifiable ensuite.
- **Scan** façon iScanner : détection des bords du ticket, recadrage, redressement de la perspective et amélioration de la lisibilité (rendu « document »), avec un résultat léger.
- **Consulter un mois** : liste des éléments du mois, ouverture d'un élément pour le voir en grand, modification de la note, suppression.
- **Envoyer un mois** : un bouton prépare un mail vers Théo lui-même, avec les pièces jointes du mois, via le menu Partager d'Android (Gmail).
- Tout reste **sur le téléphone** jusqu'à l'envoi.

## Non-objectifs

- Pas de backend, pas de compte, pas de synchronisation, pas de sauvegarde dans le cloud.
- Pas d'envoi automatique sans intervention : Théo appuie lui-même sur « Envoyer » dans Gmail.
- Pas d'OCR, pas d'extraction de montant ou de date : c'est le travail de l'agent côté ordinateur.
- Pas de catégories, de montants ni de totaux saisis dans l'app.
- Pas d'iOS à cibler (Théo est sur Android). Rien ne doit empêcher l'app de s'ouvrir ailleurs, mais aucun effort spécifique n'est demandé.

## Anti-objectifs (ce qui en ferait un échec même si « ça marche »)

- Perdre un justificatif sans le vouloir : suppression sans confirmation, purge automatique, données effacées par le navigateur sans précaution.
- Un mail trop lourd pour partir : la limite des pièces jointes Gmail est de 25 Mo par mail.
- Un scan moins lisible que la photo d'origine, sans moyen de revenir à l'original.
- Plus de manipulations qu'aujourd'hui pour ajouter un ticket.

## Contraintes

- **Plateforme** : PWA installable sur Android (Chrome), hébergée sur GitHub Pages depuis le dépôt perso `theolouvet/ndf_sender`. Décidé avec Théo.
- **Stack** : Vite et TypeScript sans framework, comme le projet perso `dispo-total`. Choix de Claude, cohérent avec l'existant.
- **Sobriété** : micro-projet, bibliothèques légères.
- **Scan avec OpenCV.js** (décidé par Théo, de préférence à Scanic) : détection des contours du ticket, puis `warpPerspective` pour le redressement. OpenCV.js pèse environ 8 à 10 Mo : il doit être chargé à la demande (à la première ouverture de l'écran de scan, ou en tâche de fond après le premier affichage), puis mis en cache par le service worker pour que le scan fonctionne hors ligne. Il ne doit jamais bloquer le premier affichage de l'app. Un build OpenCV.js réduit aux modules nécessaires est bienvenu s'il reste simple à maintenir.
- **Hors ligne** : l'app s'ouvre et permet d'ajouter, consulter et supprimer sans réseau. L'envoi passe par Gmail, qui gère lui-même l'absence de réseau.
- **Confidentialité** : aucune requête réseau contenant des justificatifs ou des notes. Pas d'analytics.
- **Langue de l'interface** : français.

## Ce qui a été décidé

### Rattachement à un mois
- Un élément appartient au **mois affiché** au moment de l'ajout (le mois en cours par défaut ; un partage depuis une autre appli va dans le mois en cours). Modifié après les premiers essais de Théo, qui ne pouvait pas aller sur un mois vide.
- Théo peut changer le mois d'un élément à la main, pour un ticket de fin de mois ajouté le 1er par exemple.
- L'écran principal affiche le mois en cours ; les flèches passent d'un mois à l'autre, sans limite vers le passé et jusqu'au mois en cours vers l'avenir.

### Après l'envoi
- Rien n'est supprimé automatiquement. Le mois est marqué « envoyé le JJ/MM » (indicatif, puisque l'app ne peut pas savoir si le mail est vraiment parti) et reste consultable.
- Théo peut vider un mois lui-même, après confirmation.
- Un élément ajouté après l'envoi est signalé comme non envoyé, et le mois peut être renvoyé.
- **Un renvoi contient toujours tout ce qui est stocké pour le mois**, pas seulement les nouveaux éléments. Décidé avec Théo ; c'est à l'agent côté ordinateur de gérer les doublons.
- **Numéros stables** (choix de Claude, pour faciliter ce dédoublonnage) : le numéro `NN` est attribué à l'ajout et ne change plus. Une suppression laisse un trou, et un élément déplacé vers un autre mois reçoit le numéro suivant de ce mois. Le même justificatif garde donc le même nom de fichier d'un envoi à l'autre, tant que sa note ne change pas. `recap.json` contient aussi un `id` stable par élément.

### Format de sortie (pour l'agent)
Validé par Théo :
- **Un PDF par élément**, nommé `AAAA-MM_NN_<slug-de-la-note>.pdf` : le mois, un numéro d'ordre sur deux chiffres selon l'ordre d'ajout, puis les premiers mots de la note en minuscules, sans accents, séparés par des tirets et tronqués à environ 40 caractères. Sans note : `AAAA-MM_NN.pdf`. Exemple : `2026-10_03_restaurant-client.pdf`.
  - Photo scannée : le PDF contient l'image scannée sur une page.
  - PDF importé : il est joint tel quel, seul son nom change.
- **Corps du mail** : la liste des éléments avec le nom du fichier, la date d'ajout et la note complète.
- **Objet du mail** : `Notes de frais AAAA-MM`.
- **`recap.json`** en pièce jointe, avec les mêmes informations :
  ```json
  {
    "mois": "2026-10",
    "genere_le": "2026-11-01T09:12:00+01:00",
    "elements": [
      { "id": "b7f3c2e0-…", "fichier": "2026-10_01.pdf", "ajoute_le": "2026-10-03T12:40:00+02:00", "source": "photo", "note": "" },
      { "id": "4a91d8aa-…", "fichier": "2026-10_03_restaurant-client.pdf", "ajoute_le": "2026-10-14T21:05:00+02:00", "source": "pdf", "note": "Restaurant client X, 3 couverts" }
    ]
  }
  ```
  `source` vaut `photo`, `galerie` ou `pdf` (un élément arrivé par le menu Partager prend `galerie` ou `pdf` selon son type). `id` est un UUID généré à l'ajout.

### Envoi
- Le bouton utilise l'API Web Share avec fichiers (`navigator.share({ files, title, text })`). Théo choisit Gmail ; l'objet et le corps sont pré-remplis dans la mesure où Gmail reprend `title` et `text`.
- Le destinataire ne peut pas être pré-rempli par Web Share : Théo le choisit dans Gmail (sa propre adresse, en saisie automatique). C'est accepté.

## Laissé au constructeur

- **Algorithme de scan** (avec OpenCV.js) : détection automatique des bords, avec ajustement manuel des quatre coins quand la détection échoue ou se trompe. Deux filtres seulement (décidé avec Théo) : **Document** par défaut (fond blanc, texte noir, ombres supprimées) et **Couleur** (photo d'origine recadrée), et conservation de l'original pour pouvoir refaire le scan ou l'annuler.
- **Compression** : résolution et qualité JPEG dans le PDF, avec pour cible quelques centaines de Ko par ticket, sans perdre la lisibilité des petits caractères. Avant l'envoi, prévenir si la taille totale approche les 25 Mo ; proposer alors un envoi en plusieurs mails ou une compression plus forte (au choix du constructeur).
- **Génération PDF** : bibliothèque au choix (jsPDF, pdf-lib…).
- **Stockage** : IndexedDB est attendu. Appeler `navigator.storage.persist()` pour limiter le risque d'éviction, et signaler dans l'app si la persistance est refusée.
- **Type MIME de `recap.json`** : Chrome Android filtre les types de fichiers partageables. Si `application/json` est refusé, trouver un contournement (`text/plain` avec extension `.json`, ou `recap.txt` contenant du JSON) et le vérifier sur un vrai téléphone.
- **Share Target** : déclaration dans le manifeste (`share_target` en POST `multipart/form-data`, types `image/*` et `application/pdf`), réception des fichiers dans le service worker, puis ouverture de l'écran d'ajout (scan pour une image, note pour un PDF). Le partage de plusieurs fichiers d'un coup est accepté : un élément par fichier.
- **Repli** si `navigator.canShare({ files })` est faux : proposer au minimum de télécharger les fichiers.
- **Écran principal** (validé par Théo sur maquette, option A) : liste verticale des éléments (vignette, numéro, note, date, badge « non envoyé »), mois en titre avec des flèches ‹ ›, barre fixe en bas avec Photo / Galerie / PDF puis « Envoyer le mois ». Écran de scan : image avec 4 poignées sur les coins, choix Document / Couleur, note, Enregistrer. Détail : image en grand, note, mois, Refaire le scan, Supprimer.
- Couleurs, icône et finitions : simple, lisible au pouce, mode sombre bienvenu.
- Workflow GitHub Actions pour Pages, comme dans `dispo-total`.

## Règles du projet (perso)

Projet personnel : dépôt `git@github-perso:theolouvet/ndf_sender.git`, identité git locale (`Théo Louvet`, adresse noreply GitHub), aucune mention d'informations professionnelles, commit et push uniquement à la demande de Théo.
