import { describe, expect, it } from 'vitest';
import { coinsParDefaut, mettreAEchelle, ordonnerCoins, tailleSortie } from './geometrie';

describe('ordonnerCoins', () => {
  it('remet un quadrilatère incliné dans l\'ordre haut-gauche, haut-droit, bas-droit, bas-gauche', () => {
    const hg = { x: 70, y: 48 }, hd = { x: 205, y: 30 }, bd = { x: 228, y: 330 }, bg = { x: 88, y: 350 };
    expect(ordonnerCoins([bd, hg, bg, hd])).toEqual([hg, hd, bd, bg]);
  });
});

describe('coinsParDefaut', () => {
  it('place un rectangle en retrait de 5 %', () => {
    expect(coinsParDefaut(200, 400)).toEqual([{ x: 10, y: 20 }, { x: 190, y: 20 }, { x: 190, y: 380 }, { x: 10, y: 380 }]);
  });
});

describe('tailleSortie', () => {
  it('réduit pour que le plus grand côté ne dépasse pas le maximum', () => {
    const r: Parameters<typeof tailleSortie>[0] = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 3000 }, { x: 0, y: 3000 }];
    expect(tailleSortie(r, 1600)).toEqual({ l: 533, h: 1600 });
  });
  it('garde la taille d\'origine si elle est déjà sous le maximum', () => {
    const r: Parameters<typeof tailleSortie>[0] = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 500 }, { x: 0, y: 500 }];
    expect(tailleSortie(r, 1600)).toEqual({ l: 300, h: 500 });
  });
});

describe('mettreAEchelle', () => {
  it('multiplie chaque coordonnée', () => {
    expect(mettreAEchelle(coinsParDefaut(200, 400), 2)[2]).toEqual({ x: 380, y: 760 });
  });
});
