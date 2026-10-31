# ndf_sender

PWA Android pour ranger les justificatifs de frais du mois et se les envoyer par mail.

- **Ajouter** : photo (scannée : bords détectés, perspective redressée, rendu « document »), photo de la galerie, PDF, ou partage depuis une autre appli (menu Partager d'Android, une fois l'appli installée).
- **Consulter** : liste par mois, note, changement de mois, nouveau scan à partir de l'original, suppression.
- **Envoyer** : « Envoyer le mois » ouvre le menu Partager (Gmail) avec un PDF par justificatif (`AAAA-MM_NN_<note>.pdf`), un `recap.json` et la liste dans le corps du mail. Au-delà de 22 Mo, l'envoi est découpé en plusieurs mails.

Tout reste sur le téléphone (IndexedDB) : pas de serveur, pas de compte. Interface en anglais, en français si le navigateur est en français ; le mail et `recap.json` gardent un format fixe en français.

## Développement

```bash
npm install
npm run dev     # http://localhost:5173 (et sur le réseau local)
npm test        # Vitest (OpenCV compris : ~5 s)
npm run build   # dist/
```

Le service worker n'est actif que sur le build de production (`npm run build && npm run preview`).
En développement, `window.ndf.naviguer(...)` et `window.ndf.traiterPartages(...)` permettent de piloter l'appli depuis la console.

Sur téléphone, l'appareil photo, le partage de fichiers et l'installation demandent HTTPS : tester sur la version déployée (ou via un tunnel HTTPS).

## Déploiement

GitHub Pages via GitHub Actions (`.github/workflows/pages.yml`) à chaque push sur `main`.
Une fois le dépôt créé : Settings → Pages → Source = **GitHub Actions**.

## Choix techniques

- Vite + TypeScript sans framework, `idb` pour IndexedDB.
- Scan : OpenCV.js (≈ 15 Mo, ≈ 4 Mo compressé), chargé à la demande comme script classique puis gardé en cache par le service worker pour fonctionner hors ligne.
- PDF écrit à la main (une page JPEG), sans bibliothèque.
