import type { Coins, Point } from '../domaine/types';

/** Grand côté maximal d'un scan redressé (lisible et léger). */
export const MAX_COTE_SCAN = 1600;

/** Ordonne 4 points : haut-gauche, haut-droit, bas-droit, bas-gauche. */
export function ordonnerCoins(p: Point[]): Coins {
  const somme = (q: Point) => q.x + q.y;
  const diff = (q: Point) => q.x - q.y;
  const min = (f: (q: Point) => number) => p.reduce((a, b) => (f(b) < f(a) ? b : a));
  const max = (f: (q: Point) => number) => p.reduce((a, b) => (f(b) > f(a) ? b : a));
  return [min(somme), max(diff), max(somme), min(diff)];
}

/** Rectangle en retrait de 5 % des bords. */
export function coinsParDefaut(l: number, h: number): Coins {
  const x0 = l * 0.05, y0 = h * 0.05, x1 = l - x0, y1 = h - y0;
  return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Taille du scan redressé : largeur = plus long bord horizontal, hauteur = plus long bord vertical, réduite à maxCote. */
export function tailleSortie(c: Coins, maxCote: number): { l: number; h: number } {
  const [hg, hd, bd, bg] = c;
  const l = Math.max(distance(hg, hd), distance(bg, bd));
  const h = Math.max(distance(hg, bg), distance(hd, bd));
  const f = Math.min(1, maxCote / Math.max(l, h));
  return { l: Math.round(l * f), h: Math.round(h * f) };
}

export function mettreAEchelle(c: Coins, facteur: number): Coins {
  return c.map((p) => ({ x: p.x * facteur, y: p.y * facteur })) as Coins;
}
