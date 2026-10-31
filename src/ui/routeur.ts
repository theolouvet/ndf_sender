import type { Source } from '../domaine/types';
import { creerJetons, executerDeparts } from './rendu';

export type Route =
  | { ecran: 'mois'; mois: string }
  | { ecran: 'ajout'; source: Source; fichier?: File; idExistant?: string }
  | { ecran: 'detail'; id: string };

export function routeVersHash(r: Route): string {
  if (r.ecran === 'mois') return `#/mois/${r.mois}`;
  if (r.ecran === 'detail') return `#/detail/${r.id}`;
  return '#/ajout';
}

/** L'écran d'ajout ne survit pas à un rechargement (le fichier est en mémoire) : retour au mois. */
export function hashVersRoute(hash: string, moisCourant: string): Route {
  const [, ecran, valeur] = hash.split('/');
  if (ecran === 'mois' && /^\d{4}-\d{2}$/.test(valeur ?? '')) return { ecran: 'mois', mois: valeur };
  if (ecran === 'detail' && valeur) return { ecran: 'detail', id: valeur };
  return { ecran: 'mois', mois: moisCourant };
}

/** `actif()` devient faux dès qu'un autre écran est demandé : l'écran lent abandonne alors son affichage. */
type Rendu = (r: Route, actif: () => boolean) => void | Promise<void>;
let rendu: Rendu = () => {};
let courante: Route | null = null;
const jetons = creerJetons();

/** Lance le routeur : le bouton retour d'Android suit l'historique des hash. */
export function demarrerRouteur(f: Rendu, moisCourant: () => string, afficherTout = true): void {
  rendu = f;
  addEventListener('hashchange', () => {
    // Le retour arrière vers « #/ajout » ne peut pas rouvrir un fichier : on garde la route en mémoire si elle correspond.
    const r = location.hash === '#/ajout' && courante?.ecran === 'ajout' ? courante : hashVersRoute(location.hash, moisCourant());
    afficher(r);
  });
  if (afficherTout) afficher(hashVersRoute(location.hash, moisCourant()));
}

function afficher(r: Route): void {
  courante = r;
  const actif = jetons.nouveau();
  // Termine d'abord ce que l'écran quitté doit enregistrer (note en cours de saisie…).
  void executerDeparts().then(() => actif() && rendu(r, actif));
}

export function naviguer(r: Route, remplacer = false): void {
  const hash = routeVersHash(r);
  courante = r;
  if (location.hash === hash) afficher(r);
  else if (remplacer) {
    history.replaceState(null, '', hash);
    afficher(r);
  } else location.hash = hash; // déclenche hashchange → afficher
}

export function routeCourante(): Route | null {
  return courante;
}
