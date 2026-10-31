import { beforeAll, describe, expect, it } from 'vitest';
import type { Coins } from '../domaine/types';
import type { Pixels } from './filtre';
import { chargerOpenCV, detecterCoins, redresser, type CV } from './opencv';

/** Fond sombre bruité avec un « ticket » blanc en forme de quadrilatère et quelques lignes de texte. */
function photoSynthetique(l: number, h: number, q: Coins): Pixels {
  const data = new Uint8ClampedArray(l * h * 4);
  let graine = 7;
  const bruit = () => ((graine = (graine * 1103515245 + 12345) & 0x7fffffff) % 30) - 15;
  const dedans = (x: number, y: number) =>
    q.every((a, i) => {
      const b = q[(i + 1) % 4];
      return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) >= 0;
    });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < l; x++) {
      let v = 70 + bruit();
      if (dedans(x, y)) v = y % 40 < 4 && x % 90 < 60 ? 40 : 235 + bruit() / 3;
      data.set([v, v * 0.9, v * 0.8, 255], (y * l + x) * 4);
    }
  return { data, width: l, height: h };
}

const ticket: Coins = [{ x: 120, y: 80 }, { x: 420, y: 60 }, { x: 450, y: 700 }, { x: 100, y: 720 }];
let cv: CV;

beforeAll(async () => {
  // En Node, pas de <script> : on importe le module directement.
  ({ cv } = await chargerOpenCV(() => import('@techstark/opencv-js').then((m) => m.default)));
}, 60_000);

describe('detecterCoins', () => {
  it('retrouve les coins d\'un ticket incliné à quelques pixels près', () => {
    const coins = detecterCoins(cv, photoSynthetique(560, 800, ticket));
    expect(coins).not.toBeNull();
    coins!.forEach((p, i) => {
      expect(Math.abs(p.x - ticket[i].x)).toBeLessThan(8);
      expect(Math.abs(p.y - ticket[i].y)).toBeLessThan(8);
    });
  });

  it('renvoie null quand aucun ticket n\'est visible', () => {
    const vide: Coins = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    expect(detecterCoins(cv, photoSynthetique(400, 400, vide))).toBeNull();
  });
});

describe('redresser', () => {
  it('produit une image rectangulaire du ticket, majoritairement claire', () => {
    const sortie = redresser(cv, photoSynthetique(560, 800, ticket), ticket);
    expect({ l: sortie.width, h: sortie.height }).toEqual({ l: 351, h: 641 }); // bords les plus longs du quadrilatère
    let clairs = 0;
    for (let i = 0; i < sortie.width * sortie.height; i++) if (sortie.data[i * 4] > 200) clairs++;
    expect(clairs / (sortie.width * sortie.height)).toBeGreaterThan(0.8);
  });
});
