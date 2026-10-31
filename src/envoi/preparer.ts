import { dateCourte, isoLocal } from '../domaine/mois';
import { nomFichier } from '../domaine/nommage';
import type { Element, Source } from '../domaine/types';

export interface Recap {
  mois: string;
  genere_le: string;
  elements: { id: string; fichier: string; ajoute_le: string; source: Source; note: string }[];
}
export interface Partie { n: number; total: number }

/** Marge sous les 25 Mo de Gmail (encodage des pièces jointes, recap). */
export const LIMITE_MAIL = 22 * 1024 * 1024;

export function construireRecap(mois: string, elements: Element[], maintenant: Date): Recap {
  return {
    mois,
    genere_le: isoLocal(maintenant),
    elements: elements.map((e) => ({
      id: e.id,
      fichier: nomFichier(e.mois, e.numero, e.note),
      ajoute_le: e.ajouteLe,
      source: e.source,
      note: e.note,
    })),
  };
}

export function objetMail(mois: string, partie?: Partie): string {
  return `Notes de frais ${mois}${partie ? ` (${partie.n}/${partie.total})` : ''}`;
}

/** Corps du mail ; pour une partie, seuls ses fichiers sont listés (passer le recap filtré). */
export function corpsMail(recap: Recap, partie?: Partie): string {
  const n = recap.elements.length;
  const titre = `Notes de frais ${recap.mois} — ${n} justificatif${n > 1 ? 's' : ''}${partie ? ` — partie ${partie.n}/${partie.total}` : ''}`;
  const lignes = recap.elements.map((e) => `${e.fichier} — ajouté le ${dateCourte(e.ajoute_le)} — ${e.note || '(sans note)'}`);
  return [titre, '', ...lignes].join('\n');
}

/** Regroupe les fichiers dans l'ordre en parties ne dépassant pas la limite (un fichier trop gros reste seul). */
export function decouperEnParties<T extends { size: number }>(fichiers: T[], limite: number): T[][] {
  const parties: T[][] = [[]];
  let taille = 0;
  for (const f of fichiers) {
    const courante = parties[parties.length - 1];
    if (courante.length > 0 && taille + f.size > limite) {
      parties.push([f]);
      taille = f.size;
    } else {
      courante.push(f);
      taille += f.size;
    }
  }
  return parties;
}
