// Interface en anglais, en français si le navigateur préfère le français.
// Le mail, recap.json et les noms de fichiers restent en français (format fixe pour l'agent).

export type Langue = 'fr' | 'en';

const fr = {
  titre: 'Notes de frais',
  photo: 'Photo',
  galerie: 'Galerie',
  pdf: 'PDF',
  envoyerMois: 'Envoyer le mois',
  envoyerPartie: 'Envoyer {n}/{total}',
  tropLourd: 'Le mois dépasse la taille d\'un mail : il partira en {total} mails.',
  envoyeLe: 'Envoyé le {date}',
  nonEnvoye: 'non envoyé',
  sansNote: '(sans note)',
  vide: 'Aucun justificatif ce mois-ci.',
  viderMois: 'Vider le mois',
  confirmerVider: 'Supprimer définitivement {nb} de {mois} ?',
  supprimer: 'Supprimer',
  annuler: 'Annuler',
  persistance: 'Le navigateur peut effacer les données en cas de manque d\'espace : installez l\'appli sur l\'écran d\'accueil.',
  telecharge: 'Partage indisponible : les fichiers ont été téléchargés.',
  moisPrecedent: 'Mois précédent',
  moisSuivant: 'Mois suivant',
  nouveau: 'Nouveau justificatif',
  preparation: 'Préparation du scan…',
  document: 'Document',
  couleur: 'Couleur',
  imageEntiere: 'Image entière',
  note: 'Note (facultatif)',
  enregistrer: 'Enregistrer',
  enregistrement: 'Enregistrement…',
  scanIndispo: 'Le scan n\'est pas disponible hors ligne pour l\'instant. La photo sera enregistrée telle quelle.',
  bordsNonTrouves: 'Bords non détectés : placez les coins à la main.',
  partageSuivant: 'Fichier partagé {n} sur {total}',
  fermer: 'Fermer',
  mois: 'Mois',
  ajouteLe: 'Ajouté le',
  source_photo: 'photo',
  source_galerie: 'galerie',
  source_pdf: 'PDF',
  refaireScan: 'Refaire le scan',
  ouvrirPdf: 'Ouvrir le PDF',
  confirmerSupprimer: 'Supprimer ce justificatif ?',
  erreur: 'Une erreur est survenue : {msg}',
  justificatifs_un: '{n} justificatif',
  justificatifs_autres: '{n} justificatifs',
  ajoutesDepuis_un: '{n} ajouté depuis',
  ajoutesDepuis_autres: '{n} ajoutés depuis',
  ignores_un: '{n} fichier ignoré : format non pris en charge',
  ignores_autres: '{n} fichiers ignorés : format non pris en charge',
};

export type Cle = keyof typeof fr;
type CleNombre = { [K in Cle]: K extends `${infer B}_un` ? B : never }[Cle];

const en: Record<Cle, string> = {
  titre: 'Expense receipts',
  photo: 'Photo',
  galerie: 'Gallery',
  pdf: 'PDF',
  envoyerMois: 'Send the month',
  envoyerPartie: 'Send {n}/{total}',
  tropLourd: 'This month is too large for one email: it will be sent in {total} emails.',
  envoyeLe: 'Sent on {date}',
  nonEnvoye: 'not sent',
  sansNote: '(no note)',
  vide: 'No receipts this month.',
  viderMois: 'Clear the month',
  confirmerVider: 'Permanently delete {nb} of {mois}?',
  supprimer: 'Delete',
  annuler: 'Cancel',
  persistance: 'The browser may delete data when storage runs low: install the app on your home screen.',
  telecharge: 'Sharing unavailable: the files were downloaded.',
  moisPrecedent: 'Previous month',
  moisSuivant: 'Next month',
  nouveau: 'New receipt',
  preparation: 'Preparing the scanner…',
  document: 'Document',
  couleur: 'Colour',
  imageEntiere: 'Whole image',
  note: 'Note (optional)',
  enregistrer: 'Save',
  enregistrement: 'Saving…',
  scanIndispo: 'Scanning is not available offline yet. The photo will be saved as is.',
  bordsNonTrouves: 'Edges not found: place the corners by hand.',
  partageSuivant: 'Shared file {n} of {total}',
  fermer: 'Close',
  mois: 'Month',
  ajouteLe: 'Added on',
  source_photo: 'photo',
  source_galerie: 'gallery',
  source_pdf: 'PDF',
  refaireScan: 'Rescan',
  ouvrirPdf: 'Open the PDF',
  confirmerSupprimer: 'Delete this receipt?',
  erreur: 'Something went wrong: {msg}',
  justificatifs_un: '{n} receipt',
  justificatifs_autres: '{n} receipts',
  ajoutesDepuis_un: '{n} added since',
  ajoutesDepuis_autres: '{n} added since',
  ignores_un: '{n} file ignored: unsupported format',
  ignores_autres: '{n} files ignored: unsupported format',
};

const dictionnaires: Record<Langue, Record<Cle, string>> = { fr, en };

export function choisirLangue(preferees: readonly string[]): Langue {
  return preferees[0]?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export interface Traducteur {
  (cle: Cle, params?: Record<string, string | number>): string;
  /** Accord selon le nombre : 1 → « _un », sinon « _autres » (0 compris, comme en anglais). */
  n(cle: CleNombre, n: number): string;
  langue: Langue;
}

export function creerTraducteur(langue: Langue): Traducteur {
  const d = dictionnaires[langue];
  const t = ((cle: Cle, params: Record<string, string | number> = {}) =>
    d[cle].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))) as Traducteur;
  t.n = (cle, n) => t(`${cle}_${n === 1 ? 'un' : 'autres'}` as Cle, { n });
  t.langue = langue;
  return t;
}

/** Traducteur de l'appli, selon les langues préférées du navigateur. */
export const t: Traducteur = creerTraducteur(
  choisirLangue(typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language]),
);
