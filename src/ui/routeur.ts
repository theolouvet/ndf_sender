import type { Source } from '../domaine/types';

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

type Rendu = (r: Route) => void | Promise<void>;
let rendu: Rendu = () => {};
let courante: Route | null = null;

/** Lance le routeur : le bouton retour d'Android suit l'historique des hash. */
export function demarrerRouteur(f: Rendu, moisCourant: () => string): void {
  rendu = f;
  addEventListener('hashchange', () => {
    // Le retour arrière vers « #/ajout » ne peut pas rouvrir un fichier : on garde la route en mémoire si elle correspond.
    const r = location.hash === '#/ajout' && courante?.ecran === 'ajout' ? courante : hashVersRoute(location.hash, moisCourant());
    afficher(r);
  });
  afficher(hashVersRoute(location.hash, moisCourant()));
}

function afficher(r: Route): void {
  courante = r;
  void rendu(r);
}

export function naviguer(r: Route, remplacer = false): void {
  const hash = routeVersHash(r);
  courante = r;
  if (location.hash === hash) void rendu(r);
  else if (remplacer) {
    history.replaceState(null, '', hash);
    void rendu(r);
  } else location.hash = hash; // déclenche hashchange → rendu
}

export function routeCourante(): Route | null {
  return courante;
}
