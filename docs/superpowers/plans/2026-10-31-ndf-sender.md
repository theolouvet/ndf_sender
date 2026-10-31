# ndf_sender — plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** une PWA Android qui capture, scanne et range les justificatifs de frais par mois, puis les partage vers Gmail en fin de mois (un PDF par élément, avec un récapitulatif).

**Architecture :** une appli statique Vite + TypeScript sans framework, sans backend. Les données sont dans IndexedDB. Le scan utilise OpenCV.js, chargé à la demande dans un chunk séparé. Les PDF sont écrits à la main (une page JPEG). L'envoi passe par Web Share, et la réception de fichiers depuis d'autres applis par Web Share Target, géré dans le service worker.

**Tech Stack :** Vite 8, TypeScript 7, `idb`, `@techstark/opencv-js`, Vitest, `fake-indexeddb`, GitHub Pages (Actions).

**Spec :** `docs/superpowers/specs/2026-10-31-ndf-sender-design.md`

## Global Constraints

- Projet perso : identité git locale `Théo Louvet` / `49097939+theolouvet@users.noreply.github.com`, remote `git@github-perso:theolouvet/ndf_sender.git`. Aucune mention pro. **Ne jamais pousser.** Les étapes « Commit » sont des commits locaux ; si Théo n'a pas autorisé les commits pour cette exécution, laisser les changements non commités.
- Interface en français. Aucun appel réseau contenant des justificatifs ou des notes, pas d'analytics.
- OpenCV.js ne doit jamais être dans le chunk principal ni bloquer le premier affichage.
- Hors ligne : ajouter, consulter et supprimer doivent marcher sans réseau, scan compris une fois OpenCV en cache.
- Nom de fichier : `AAAA-MM_NN_<slug>.pdf`, ou `AAAA-MM_NN.pdf` sans note. Slug en minuscules, sans accents, mots séparés par `-`, 40 caractères au maximum.
- Objet du mail : `Notes de frais AAAA-MM`. Limite Gmail : 25 Mo par mail.
- `recap.json` : `{ mois, genere_le, elements: [{ id, fichier, ajoute_le, source, note }] }`. `source` vaut `photo`, `galerie` ou `pdf`. Dates ISO 8601 avec le décalage horaire local (`+01:00` / `+02:00`).
- Un renvoi contient toujours tout le mois. Les numéros `NN` sont attribués à l'ajout et ne sont jamais réattribués.
- Rien n'est supprimé sans confirmation. L'original d'une photo est toujours conservé.

## Review Focus

1. **Ajout tard le soir** (31/10 à 23h30 heure locale) : l'élément doit aller en `2026-10`, pas dans le mois UTC. Test dans la tâche 2.
2. **Note sans caractère utilisable** (`"!!!"`, emoji seul) : nom sans slug `2026-10_04.pdf`, jamais `2026-10_04_.pdf`. Test dans la tâche 2.
3. **Mois de plus de 25 Mo** : découpage en plusieurs mails `(1/2)`, `(2/2)`, chacun sous la limite. Le recap complet est joint à chaque partie. Test dans la tâche 5.
4. **Partage de fichiers non pris en charge** (`.docx`, vidéo) en même temps que des fichiers valides : les fichiers valides sont ajoutés, les autres sont ignorés avec un message. Test dans la tâche 8.
5. **Photo portrait de l'appareil photo** (orientation EXIF) : le scan doit être à l'endroit. Vérification manuelle dans la tâche 10, en décodant avec `createImageBitmap(file, { imageOrientation: 'from-image' })`.

---

### Task 1 : socle du projet

**Files :**
- Create : `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.gitattributes`, `index.html`, `src/main.ts`, `src/style.css`, `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`, `.github/workflows/pages.yml`, `README.md`

**Interfaces :**
- Produces : `npm run dev` (`vite --host`), `npm run build` (`tsc --noEmit && vite build`), `npm test` (`vitest run`).

- [ ] **Step 1 : initialiser git** (règles projet-perso, dans `C:\Users\theo\perso\ndf_sender`)
```bash
git init -b main
git config user.name "Théo Louvet"
git config user.email "49097939+theolouvet@users.noreply.github.com"
git remote add origin git@github-perso:theolouvet/ndf_sender.git
```
- [ ] **Step 2 : fichiers de configuration**, en copiant les modèles de `../dispo-total` (`tsconfig.json`, `.gitignore`, `.gitattributes` avec `* text=auto eol=lf` et `*.png/*.ico/*.jpg binary`, workflow Pages sans l'étape `maj-total` ni le `schedule`). `vite.config.ts` : `base: './'`, `build.rollupOptions.output.chunkFileNames: 'assets/lazy-[name]-[hash].js'`, `build.chunkSizeWarningLimit: 12000`. Dépendances : `idb`, `@techstark/opencv-js` ; devDependencies : `vite`, `typescript`, `vitest`, `fake-indexeddb`.
- [ ] **Step 3 : manifeste** (`lang: fr`, `display: standalone`, `start_url`/`scope` `./`, `name` « ndf_sender — notes de frais », icônes 192/512 any + maskable) avec :
```json
"share_target": {
  "action": "./partage",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": { "files": [{ "name": "fichiers", "accept": ["image/*", "application/pdf"] }] }
}
```
Les icônes sont simples (un reçu stylisé). Le moyen de les produire est libre, mais il ne doit pas laisser de dépendance permanente.
Le `.gitignore` exclut aussi `.superpowers/` (maquettes du brainstorming).
- [ ] **Step 4 : vérifier** `git check-ignore .env` (doit afficher `.env`), puis lancer `npm install` et `npm run build` : il doit sortir sans erreur et produire `dist/index.html`.
- [ ] **Step 5 : commit** `chore: socle Vite + PWA`

### Task 2 : domaine — mois, dates, nommage

**Files :** Create `src/domaine/mois.ts`, `src/domaine/nommage.ts`, `src/domaine/types.ts` ; Test `src/domaine/mois.test.ts`, `src/domaine/nommage.test.ts`

**Interfaces — Produces :**
```ts
// types.ts
export type Source = 'photo' | 'galerie' | 'pdf';
export type Filtre = 'document' | 'couleur';
export type Point = { x: number; y: number };
export type Coins = [Point, Point, Point, Point]; // haut-gauche, haut-droit, bas-droit, bas-gauche
export interface Element {
  id: string; mois: string; numero: number; ajouteLe: string; source: Source; note: string;
  pdf: Blob;            // ce qui est envoyé
  image?: Blob;         // JPEG scanné (aperçu), absent pour un PDF importé
  original?: Blob;      // JPEG d'origine, absent pour un PDF importé
  coins?: Coins; filtre?: Filtre;
  envoyeLe?: string;    // ISO, posé à l'envoi
}
export interface EtatMois { mois: string; dernierNumero: number; envoyeLe?: string }
// mois.ts
export function moisDe(d: Date): string;            // 'AAAA-MM' en heure locale
export function isoLocal(d: Date): string;          // '2026-10-14T21:05:00+02:00'
export function libelleMois(mois: string): string;  // 'octobre 2026'
export function dateCourte(iso: string): string;    // '14/10/2026'
// nommage.ts
export function slug(note: string): string;
export function nomFichier(mois: string, numero: number, note: string): string;
```

- [ ] **Step 1 : tests en échec**
```ts
// mois.test.ts — lancer avec TZ=Europe/Paris (le fixer dans vitest.config.ts : process.env.TZ = 'Europe/Paris')
expect(moisDe(new Date(2026, 9, 31, 23, 30))).toBe('2026-10');
expect(isoLocal(new Date(2026, 9, 14, 21, 5))).toBe('2026-10-14T21:05:00+02:00');
expect(isoLocal(new Date(2026, 10, 1, 9, 12))).toBe('2026-11-01T09:12:00+01:00');
expect(libelleMois('2026-10')).toBe('octobre 2026');
expect(dateCourte('2026-10-03T12:40:00+02:00')).toBe('03/10/2026');
// nommage.test.ts
expect(slug('Restaurant client X, 3 couverts')).toBe('restaurant-client-x-3-couverts');
expect(slug('Hôtel Lyon.1')).toBe('hotel-lyon-1');
expect(slug('!!! 🍕')).toBe('');
expect(slug('a'.repeat(60)).length).toBe(40);
expect(slug('mot '.repeat(15))).not.toMatch(/-$/);
expect(nomFichier('2026-10', 3, 'Restaurant client')).toBe('2026-10_03_restaurant-client.pdf');
expect(nomFichier('2026-10', 4, '')).toBe('2026-10_04.pdf');
expect(nomFichier('2026-10', 4, '!!!')).toBe('2026-10_04.pdf');
expect(nomFichier('2026-10', 112, 'x')).toBe('2026-10_112_x.pdf');
```
- [ ] **Step 2 :** `npm test` → FAIL (modules absents).
- [ ] **Step 3 : implémenter.** Le slug suit cet ordre : `normalize('NFD')`, suppression des diacritiques, passage en minuscules, chaque suite de caractères non `[a-z0-9]` remplacée par `-`, suppression des `-` en début et fin, coupe à 40 caractères, puis suppression d'un `-` final. Le numéro est complété à 2 chiffres au minimum.
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : commit** `feat: domaine mois et nommage`

### Task 3 : stockage IndexedDB

**Files :** Create `src/stockage/db.ts` ; Test `src/stockage/db.test.ts` (avec `import 'fake-indexeddb/auto'`)

**Interfaces :**
- Consumes : `Element`, `EtatMois`, `moisDe`, `isoLocal` (tâche 2).
- Produces :
```ts
export type NouvelElement = Pick<Element, 'source' | 'note' | 'pdf' | 'image' | 'original' | 'coins' | 'filtre'>;
export function ajouterElement(e: NouvelElement, maintenant?: Date): Promise<Element>; // attribue id (crypto.randomUUID), mois, numero, ajouteLe
export function lireElement(id: string): Promise<Element | undefined>;
export function elementsDuMois(mois: string): Promise<Element[]>;   // triés par numero
export function moisAvecElements(): Promise<string[]>;              // décroissant
export function etatMois(mois: string): Promise<EtatMois | undefined>;
export function modifierElement(id: string, modif: Partial<Pick<Element, 'note' | 'pdf' | 'image' | 'coins' | 'filtre'>>): Promise<Element>;
export function deplacerVersMois(id: string, mois: string): Promise<Element>; // nouveau numero = dernierNumero+1 du mois cible, envoyeLe effacé
export function supprimerElement(id: string): Promise<void>;
export function viderMois(mois: string): Promise<void>;            // supprime les éléments ET l'EtatMois
export function marquerEnvoye(mois: string, quand: Date): Promise<void>; // EtatMois.envoyeLe et Element.envoyeLe de chaque élément
export function demanderPersistance(): Promise<boolean>;           // navigator.storage?.persist() ?? false
```
Base `ndf_sender` v1 ; stores `elements` (clé `id`, index `mois`) et `mois` (clé `mois`). Le compteur `dernierNumero` est mis à jour dans la même transaction que l'ajout.

- [ ] **Step 1 : tests en échec** (réinitialiser la base entre les tests avec `indexedDB = new IDBFactory()`)
  - deux ajouts le 03/10 et le 14/10 → numéros 1 et 2, mois `2026-10` ;
  - on supprime le n° 2 puis on ajoute → n° 3 (pas de réattribution) ;
  - `deplacerVersMois(n°1, '2026-09')` alors que septembre est vide → `numero === 1` en septembre ; `elementsDuMois('2026-10')` ne contient plus que le n° 3 ;
  - `marquerEnvoye('2026-10', d)` puis un nouvel ajout → l'ancien a `envoyeLe`, le nouveau non, et `etatMois('2026-10').envoyeLe` est défini ;
  - `viderMois('2026-10')` → `elementsDuMois` vide et `moisAvecElements()` ne liste plus `2026-10` ;
  - un `Blob` stocké se relit avec la même taille.
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : implémenter** avec `idb` (`openDB`).
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : commit** `feat: stockage IndexedDB`

### Task 4 : PDF d'une page à partir d'un JPEG

**Files :** Create `src/pdf/jpeg-pdf.ts` ; Test `src/pdf/jpeg-pdf.test.ts`

**Interfaces — Produces :** `export function jpegVersPdf(jpeg: Uint8Array, largeurPx: number, hauteurPx: number): Uint8Array;`

PDF 1.4 écrit à la main, sans bibliothèque : catalogue, pages, une page dont la `MediaBox` garde la largeur de l'A4 (595 pt) et une hauteur proportionnelle à l'image (595 × h / l), une image XObject `/Filter /DCTDecode /ColorSpace /DeviceRGB /BitsPerComponent 8` (`canvas.toBlob` produit toujours un JPEG à 3 composantes, même pour une image grise), un flux de contenu `q W 0 0 H 0 0 cm /Im0 Do Q`, une table `xref` avec les offsets exacts et un `trailer`.

- [ ] **Step 1 : tests en échec** (utiliser un vrai petit JPEG en fixture `src/pdf/fixture.jpg`, de 2 Ko environ)
  - le résultat commence par `%PDF-1.4` et se termine par `%%EOF\n` ;
  - il contient `/DCTDecode` et les octets du JPEG à l'identique ;
  - pour chaque entrée `xref` `n 0 obj`, l'offset indiqué pointe exactement sur `n 0 obj` ;
  - `startxref` pointe sur `xref` ;
  - avec l=1000 et h=2000, la `MediaBox` vaut `[0 0 595 1190]`.
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 :** `npm test` → PASS. Vérification manuelle : écrire le PDF de la fixture sur le disque et l'ouvrir dans un lecteur PDF.
- [ ] **Step 5 : commit** `feat: génération PDF depuis JPEG`

### Task 5 : préparation et partage de l'envoi

**Files :** Create `src/envoi/preparer.ts`, `src/envoi/partager.ts` ; Test `src/envoi/preparer.test.ts`, `src/envoi/partager.test.ts`

**Interfaces :**
- Consumes : `Element`, `nomFichier`, `isoLocal`, `dateCourte`, `elementsDuMois`, `marquerEnvoye`.
- Produces :
```ts
export interface Recap { mois: string; genere_le: string; elements: { id: string; fichier: string; ajoute_le: string; source: Source; note: string }[] }
export function construireRecap(mois: string, elements: Element[], maintenant: Date): Recap;
export function objetMail(mois: string, partie?: { n: number; total: number }): string; // 'Notes de frais 2026-10' / 'Notes de frais 2026-10 (1/2)'
export function corpsMail(recap: Recap, partie?: { n: number; total: number }): string;
export function decouperEnParties<T extends { size: number }>(fichiers: T[], limite: number): T[][];
export const LIMITE_MAIL = 22 * 1024 * 1024; // marge sous les 25 Mo de Gmail (encodage, recap)
// partager.ts
export interface Envoi { objet: string; corps: string; fichiers: File[] }
export function preparerEnvois(mois: string, elements: Element[], maintenant: Date, peutPartager: (f: File[]) => boolean): Envoi[];
export function partager(envoi: Envoi, nav?: Navigator): Promise<'partage' | 'annule' | 'telechargement'>;
```
Format du corps (exact) :
```
Notes de frais 2026-10 — 2 justificatifs

2026-10_01.pdf — ajouté le 03/10/2026 — (sans note)
2026-10_03_restaurant-client.pdf — ajouté le 14/10/2026 — Restaurant client X, 3 couverts
```
Pour une partie, la première ligne se termine par ` — partie 1/2` et seuls les fichiers de la partie sont listés. Le recap joint reste celui du mois complet.

Recap : `recap.json` de type `application/json` si `peutPartager([recap, ...pdfs])` répond vrai ; sinon `recap.txt` de type `text/plain` avec le même contenu (Chrome Android filtre les types partageables). `partager` utilise `nav.share({ files, title: objet, text: corps })` ; une `AbortError` donne `'annule'`. Si `nav.canShare?.({ files })` est faux, chaque fichier est téléchargé avec un `<a download>` et la fonction renvoie `'telechargement'`.

- [ ] **Step 1 : tests en échec**
  - `construireRecap` avec deux éléments (`numero` 1 sans note, `numero` 3 avec note) : la sortie est égale à l'exemple JSON de la spec (ids compris), et `genere_le` vaut `isoLocal(maintenant)` ;
  - `corpsMail` est égal au texte exact ci-dessus ;
  - `objetMail('2026-10', { n: 1, total: 2 })` → `'Notes de frais 2026-10 (1/2)'` ;
  - `decouperEnParties` avec des tailles [10, 10, 10] Mo et une limite de 22 Mo → `[[10,10],[10]]` dans l'ordre ; un fichier seul de 30 Mo forme sa propre partie ;
  - `preparerEnvois` avec 3 PDF de 10 Mo → 2 envois, objets `(1/2)` et `(2/2)`, chacun contenant un fichier recap ;
  - `preparerEnvois` avec `peutPartager = () => false` → le recap s'appelle `recap.txt` avec le type `text/plain` ;
  - `partager` avec un `nav` simulé dont `share` rejette une `DOMException('', 'AbortError')` → `'annule'`.
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : commit** `feat: préparation et partage de l'envoi`

### Task 6 : scan — géométrie et filtre (pur TypeScript)

**Files :** Create `src/scan/geometrie.ts`, `src/scan/filtre.ts` ; Test `src/scan/geometrie.test.ts`, `src/scan/filtre.test.ts`

**Interfaces — Produces :**
```ts
export function ordonnerCoins(p: Point[]): Coins;                    // 4 points dans n'importe quel ordre
export function coinsParDefaut(l: number, h: number): Coins;         // rectangle en retrait de 5 %
export function tailleSortie(c: Coins, maxCote: number): { l: number; h: number }; // largeur = max(haut, bas), hauteur = max(gauche, droite), réduite pour que le plus grand côté ≤ maxCote
export function mettreAEchelle(c: Coins, facteur: number): Coins;
export const MAX_COTE_SCAN = 1600;
export interface Pixels { data: Uint8ClampedArray; width: number; height: number } // compatible ImageData
export function appliquerFiltre(img: Pixels, filtre: Filtre): Pixels; // 'couleur' = identité
```
Filtre `document` : passage en niveaux de gris (luma), estimation du fond par un flou boîte de rayon `round(max(l, h) / 30)` calculé avec une image intégrale, puis `v = clamp(255 × gris / max(fond, 1))`, et enfin étirement du contraste entre les percentiles 2 % et 98 %. La sortie garde l'alpha à 255.

- [ ] **Step 1 : tests en échec**
  - `ordonnerCoins` sur les 4 coins d'un quadrilatère incliné, mélangés → ordre haut-gauche, haut-droit, bas-droit, bas-gauche ;
  - `tailleSortie` d'un rectangle 1000×3000 avec max 1600 → `{ l: 533, h: 1600 }` ;
  - filtre `document` sur une image 60×60 dont le fond passe du gris 120 (à gauche) au gris 200 (à droite), avec un trait noir (20) au milieu : chaque pixel du fond donne ≥ 230, chaque pixel du trait ≤ 60 ;
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 : commit** `feat: géométrie et filtres de scan`

### Task 7 : scan — détection et redressement avec OpenCV.js

**Files :** Create `src/scan/opencv.ts`

**Interfaces :**
- Consumes : `Coins`, `ordonnerCoins`, `coinsParDefaut`, `tailleSortie`, `MAX_COTE_SCAN`.
- Produces :
```ts
export function chargerOpenCV(): Promise<CV>;   // import('@techstark/opencv-js') dynamique, singleton, attend que le runtime soit prêt (Promise ou onRuntimeInitialized selon la version, voir le README du paquet)
export function prechargerOpenCV(): void;       // appelé en requestIdleCallback après le premier affichage ; erreurs ignorées
export function detecterCoins(cv: CV, source: HTMLCanvasElement): Coins | null; // coins dans le repère de la source
export function redresser(cv: CV, source: HTMLCanvasElement, coins: Coins): HTMLCanvasElement;
```
Détection : réduction de l'image à 500 px de grand côté, niveaux de gris, `GaussianBlur` 5×5, `Canny(75, 200)`, `dilate` 3×3, `findContours(RETR_LIST)`, contours triés par aire décroissante, puis `approxPolyDP(0,02 × périmètre)`. On retient le premier quadrilatère convexe dont l'aire dépasse 20 % de l'image, et on remet ses coins à l'échelle de la source. Si aucun ne convient → `null`. Redressement : `getPerspectiveTransform` + `warpPerspective` vers `tailleSortie(coins, MAX_COTE_SCAN)`. Toutes les `Mat` sont libérées par `.delete()` dans un `finally`.

- [ ] **Step 1 : implémenter.** Pas de test unitaire, car OpenCV ne tourne pas sous Vitest sans navigateur ; la vérification se fait aux étapes 2 et 3.
- [ ] **Step 2 :** `npm run build` → `dist/assets/` contient un fichier `lazy-*opencv*` de plusieurs Mo, et le JS d'entrée (référencé par `dist/index.html`) pèse moins de 100 Ko.
- [ ] **Step 3 :** page de démonstration temporaire (`?debug-scan`, à retirer à la tâche 10) : charger une photo de ticket, dessiner les coins détectés puis le résultat redressé. Vérifier sur PC avec 3 photos de tickets.
- [ ] **Step 4 : commit** `feat: détection et redressement OpenCV`

### Task 8 : service worker et réception des partages

**Files :** Create `public/sw.js`, `src/partage/reception.ts` ; Test `src/partage/reception.test.ts`

**Interfaces — Produces :**
```ts
export function fichierAccepte(f: { type: string; name: string }): 'image' | 'pdf' | null; // image/* → image ; application/pdf ou .pdf → pdf
export function lireFichiersPartages(): Promise<File[]>; // lit et vide le cache 'ndf-partage'
```
`sw.js`, sur la base de `../dispo-total/public/sw.js` :
- Cache `ndf-v1` pour le socle (`./`, manifeste, icônes). Navigation : réseau d'abord, cache si hors ligne.
- `assets/` : cache d'abord, puis réseau, avec mise en cache de la réponse. C'est ce qui garde OpenCV disponible hors ligne.
- Nettoyage repris de dispo-total, à **un changement près** : ne jamais supprimer les fichiers `assets/lazy-`, que le HTML ne référence pas.
- `fetch` POST sur `./partage` : lire `formData().getAll('fichiers')`, ranger chaque fichier dans le cache `ndf-partage` sous la clé `./partage/<horodatage>-<i>` avec ses en-têtes `Content-Type` et `X-Nom` (`encodeURIComponent(nom)`), puis répondre `Response.redirect('./?partage=1', 303)`.

Enregistrement du SW dans `main.ts` (`navigator.serviceWorker.register('./sw.js')`), comme dans dispo-total.

- [ ] **Step 1 : tests en échec** pour `fichierAccepte` : `image/jpeg` → `'image'` ; `application/pdf` → `'pdf'` ; `{ type: '', name: 'facture.PDF' }` → `'pdf'` ; `.docx` → `null` ; `video/mp4` → `null`.
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 : implémenter.**
- [ ] **Step 4 :** `npm test` → PASS. Le partage de bout en bout se vérifie sur le téléphone à la tâche 11.
- [ ] **Step 5 : commit** `feat: service worker et Web Share Target`

### Task 9 : écran du mois et envoi

**Files :** Create `src/ui/ecran-mois.ts`, `src/ui/confirmer.ts`, `src/ui/routeur.ts` ; Modify `src/main.ts`, `src/style.css`

**Interfaces :**
- Consumes : stockage (tâche 3), `preparerEnvois`, `partager` (tâche 5), `libelleMois`, `moisDe`, `demanderPersistance`, `prechargerOpenCV`.
- Produces : `routeur.ts` : `naviguer(r: Route)` avec `type Route = { ecran: 'mois'; mois: string } | { ecran: 'ajout'; source: Source; fichier?: File } | { ecran: 'detail'; id: string }`, reflété dans `location.hash`. `confirmer(message: string, libelleOk: string): Promise<boolean>`, une boîte de dialogue `<dialog>` (pas `confirm()`).

Disposition validée par Théo (maquette A) : une liste verticale, et en bas une barre fixe avec trois boutons **Photo** (mis en avant), **Galerie** et **PDF**, puis **Envoyer le mois** en dessous. Le mois se change avec des flèches ‹ › autour du titre.

Contenu de l'écran :
- titre `libelleMois`, sélecteur des mois (`moisAvecElements()` plus le mois courant, même vide) ;
- liste triée par numéro : vignette (`image`, ou pictogramme PDF), nom de fichier, date courte, note tronquée, badge « non envoyé » si `envoyeLe` est absent alors que le mois a déjà été envoyé ;
- bandeau « Envoyé le JJ/MM » si `etatMois.envoyeLe` existe ;
- trois boutons d'ajout bien visibles en bas : **Photo**, **Galerie**, **PDF** ;
- bouton **Envoyer le mois** : `preparerEnvois`. Avec une seule partie, partage direct. Avec plusieurs parties, un bouton par partie (« Envoyer 1/2 »…), car chaque partage exige un geste de l'utilisateur. Si le résultat est `'partage'` ou `'telechargement'` → `marquerEnvoye`. Afficher la taille totale ;
- menu **Vider le mois** → `confirmer('Supprimer définitivement les N justificatifs de octobre 2026 ?', 'Supprimer')` ;
- au démarrage : si `demanderPersistance()` est faux → bandeau discret « Le navigateur peut effacer les données en cas de manque d'espace : installez l'appli sur l'écran d'accueil ». Puis `prechargerOpenCV()` en `requestIdleCallback`.

- [ ] **Step 1 : implémenter.** Style lisible au pouce, mode sombre via `prefers-color-scheme`.
- [ ] **Step 2 :** `npm run build` → OK ; `npm test` → PASS.
- [ ] **Step 3 : vérification manuelle** (`npm run dev`, Chrome en émulation mobile) : avec des éléments factices insérés depuis la console via `ajouterElement`, la liste, le changement de mois, la confirmation avant de vider et l'envoi (`'telechargement'` sur desktop) fonctionnent.
- [ ] **Step 4 : commit** `feat: écran du mois et envoi`

### Task 10 : ajout et scan

**Files :** Create `src/ui/ecran-ajout.ts`, `src/ui/editeur-coins.ts`, `src/scan/pipeline.ts` ; Modify `src/main.ts` ; Delete la page `?debug-scan` de la tâche 7.

**Interfaces :**
- Consumes : `chargerOpenCV`, `detecterCoins`, `redresser`, `appliquerFiltre`, `coinsParDefaut`, `jpegVersPdf`, `ajouterElement`, `modifierElement`, `lireFichiersPartages`, `fichierAccepte`.
- Produces :
```ts
// pipeline.ts
export function decoderImage(f: Blob, maxCote: number): Promise<HTMLCanvasElement>; // createImageBitmap(f, { imageOrientation: 'from-image' })
export function produireScan(cv: CV, original: HTMLCanvasElement, coins: Coins, filtre: Filtre): Promise<{ image: Blob; pdf: Blob }>; // JPEG qualité 0.7, puis jpegVersPdf
// ecran-ajout.ts
export function ouvrirAjout(source: Source, fichier?: File, idExistant?: string): void; // idExistant = refaire le scan d'un élément
```
Flux :
- **Photo** : `<input type="file" accept="image/*" capture="environment">`. **Galerie** : même chose sans `capture`. **PDF** : `accept="application/pdf"`.
- Pour une image : l'original est décodé (grand côté 2500 px max) et gardé en JPEG à qualité 0.85. Affichage de « Préparation du scan… » tant qu'OpenCV n'est pas prêt, puis `detecterCoins`, avec `coinsParDefaut` si le résultat est `null`. L'éditeur de coins montre 4 poignées déplaçables (événements pointer, zones tactiles d'au moins 44 px) et une loupe facultative. Le choix du filtre (Document, défaut / Couleur) met à jour l'aperçu en direct. Un bouton « Image entière » remet les coins sur les bords de l'image. Enfin, le champ note et le bouton **Enregistrer**.
- Pour un PDF : nom du fichier, champ note, **Enregistrer** (le blob est stocké tel quel).
- Si OpenCV n'arrive pas à charger (hors ligne avant toute mise en cache) : message clair, et proposition d'enregistrer la photo sans scan (coins par défaut, filtre `couleur`, warp fait sur canvas 2D sans OpenCV, simple recadrage rectangulaire).
- Au démarrage avec `?partage=1` : `lireFichiersPartages()`. Les fichiers refusés par `fichierAccepte` sont signalés (« 1 fichier ignoré : format non pris en charge »). Les autres passent dans le flux d'ajout un par un, avec `galerie` pour une image et `pdf` pour un PDF.

- [ ] **Step 1 : implémenter.**
- [ ] **Step 2 :** `npm run build` → OK ; `npm test` → PASS.
- [ ] **Step 3 : vérification manuelle sur PC** avec 3 photos de tickets : coins détectés, déplacement des poignées, 2 filtres, enregistrement, élément visible dans la liste. Une photo portrait prise au téléphone doit sortir à l'endroit (Review Focus 5).
- [ ] **Step 4 : commit** `feat: ajout, scan et import`

### Task 11 : détail d'un élément, puis recette sur téléphone

**Files :** Create `src/ui/ecran-detail.ts` ; Modify `README.md`

**Interfaces — Consumes :** `lireElement`, `modifierElement`, `deplacerVersMois`, `supprimerElement`, `ouvrirAjout(…, idExistant)`, `confirmer`.

Contenu de l'écran : grande image (`image`) zoomable par pincement natif ; pour un PDF, bouton **Ouvrir** (`URL.createObjectURL` dans un nouvel onglet, Android ouvre sa visionneuse). Note modifiable, enregistrée à la perte de focus. Changement de mois (sélecteur des 12 derniers mois). **Refaire le scan** (photo uniquement), qui rouvre l'ajout sur `original` avec les `coins` et le `filtre` mémorisés et met à jour l'élément. **Supprimer**, après confirmation.

- [ ] **Step 1 : implémenter.**
- [ ] **Step 2 :** `npm run build` → OK ; `npm test` → PASS.
- [ ] **Step 3 : README** : rôle de l'appli, `npm run dev`, test sur téléphone via le Wi-Fi local (`vite --host`, en notant que `capture` et Web Share demandent HTTPS ou l'appli déployée), déploiement Pages (Settings → Pages → Source = GitHub Actions). Aucune mention pro.
- [ ] **Step 4 : recette sur le téléphone de Théo** (une fois déployée, ou via un tunnel HTTPS local), à cocher avec lui :
  - installation de la PWA, puis ouverture hors ligne ;
  - photo de ticket → scan → note → enregistrement ;
  - import d'une photo de la galerie et d'un PDF ;
  - partage d'une photo depuis Google Photos et d'un PDF depuis Gmail vers ndf_sender ;
  - détail : modification de la note, déplacement vers un autre mois, nouveau scan, suppression ;
  - **Envoyer le mois** → Gmail s'ouvre avec l'objet, le corps et les pièces jointes (PDF + recap, vérifier si `recap.json` passe ou si c'est le repli `.txt`) → mail reçu et lu par l'agent ;
  - après un mode avion, le scan fonctionne toujours (OpenCV en cache).
- [ ] **Step 5 : commit** `feat: écran détail et README`
