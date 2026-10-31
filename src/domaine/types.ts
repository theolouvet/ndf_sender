export type Source = 'photo' | 'galerie' | 'pdf';
export type Filtre = 'document' | 'couleur';
export type Point = { x: number; y: number };
/** Haut-gauche, haut-droit, bas-droit, bas-gauche. */
export type Coins = [Point, Point, Point, Point];

export interface Element {
  id: string;
  /** 'AAAA-MM' */
  mois: string;
  /** Attribué à l'ajout, jamais réattribué. */
  numero: number;
  /** ISO 8601 avec décalage local. */
  ajouteLe: string;
  source: Source;
  note: string;
  /** Ce qui est envoyé. */
  pdf: Blob;
  /** JPEG scanné (aperçu), absent pour un PDF importé. */
  image?: Blob;
  /** JPEG d'origine, absent pour un PDF importé. */
  original?: Blob;
  coins?: Coins;
  filtre?: Filtre;
  /** Posé à l'envoi. */
  envoyeLe?: string;
}

export interface EtatMois {
  mois: string;
  dernierNumero: number;
  envoyeLe?: string;
}
