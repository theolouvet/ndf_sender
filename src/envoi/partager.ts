import { nomFichier } from '../domaine/nommage';
import type { Element } from '../domaine/types';
import { construireRecap, corpsMail, decouperEnParties, LIMITE_MAIL, objetMail } from './preparer';

export interface Envoi {
  objet: string;
  corps: string;
  fichiers: File[];
  /** Au-delà de la limite de Gmail (un fichier seul trop gros) : à signaler avant l'envoi. */
  tropLourd: boolean;
}

/**
 * Prépare le ou les mails du mois. Chaque partie reçoit le recap complet du mois.
 * Si Chrome refuse de partager un .json, le recap part en recap.txt (même contenu).
 */
export function preparerEnvois(
  mois: string,
  elements: Element[],
  maintenant: Date,
  peutPartager: (f: File[]) => boolean,
): Envoi[] {
  const recap = construireRecap(mois, elements, maintenant);
  const json = JSON.stringify(recap, null, 2);
  const pdfs = elements.map((e) => new File([e.pdf], nomFichier(e.mois, e.numero, e.note), { type: 'application/pdf' }));

  let fichierRecap = new File([json], 'recap.json', { type: 'application/json' });
  if (!peutPartager([...pdfs.slice(0, 1), fichierRecap])) fichierRecap = new File([json], 'recap.txt', { type: 'text/plain' });

  const parties = decouperEnParties(pdfs, LIMITE_MAIL - fichierRecap.size);
  return parties.map((fichiers) => {
    const partie = parties.length > 1 ? { n: parties.indexOf(fichiers) + 1, total: parties.length } : undefined;
    const noms = new Set(fichiers.map((f) => f.name));
    const recapPartie = { ...recap, elements: recap.elements.filter((e) => noms.has(e.fichier)) };
    const tous = [...fichiers, fichierRecap];
    const tropLourd = tous.reduce((t, f) => t + f.size, 0) > LIMITE_MAIL;
    return { objet: objetMail(mois, partie), corps: corpsMail(recapPartie, partie), fichiers: tous, tropLourd };
  });
}

/** Suit les parties envoyées : le mois n'est « envoyé » qu'une fois toutes ses parties parties. */
export function suivreParties(total: number): { marquer(i: number): boolean } {
  const faites = new Set<number>();
  return {
    marquer(i) {
      faites.add(i);
      return faites.size === total;
    },
  };
}

/** Ouvre le menu Partager d'Android ; sans partage de fichiers possible, télécharge les fichiers. */
export async function partager(envoi: Envoi, nav: Navigator = navigator): Promise<'partage' | 'annule' | 'telechargement'> {
  if (!nav.canShare?.({ files: envoi.fichiers })) {
    for (const f of envoi.fichiers) telecharger(f);
    return 'telechargement';
  }
  try {
    await nav.share({ title: envoi.objet, text: envoi.corps, files: envoi.fichiers });
    return 'partage';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'annule';
    throw e;
  }
}

function telecharger(f: File): void {
  const url = URL.createObjectURL(f);
  const a = Object.assign(document.createElement('a'), { href: url, download: f.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
