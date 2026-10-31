import { describe, expect, it } from 'vitest';
import type { Element } from '../domaine/types';
import { partager, preparerEnvois } from './partager';

const Mo = 1024 * 1024;
const element = (numero: number, taille: number): Element => ({
  id: `id${numero}`, mois: '2026-10', numero, ajouteLe: '2026-10-03T12:40:00+02:00', source: 'photo', note: '',
  pdf: new Blob([new Uint8Array(taille)], { type: 'application/pdf' }),
});
const maintenant = new Date(2026, 10, 1, 9, 12);

describe('preparerEnvois', () => {
  it('fait un seul envoi avec les PDF nommés et recap.json quand tout tient', () => {
    const [envoi, ...reste] = preparerEnvois('2026-10', [element(1, 10), element(2, 10)], maintenant, () => true);
    expect(reste).toEqual([]);
    expect(envoi.objet).toBe('Notes de frais 2026-10');
    expect(envoi.fichiers.map((f) => [f.name, f.type])).toEqual([
      ['2026-10_01.pdf', 'application/pdf'],
      ['2026-10_02.pdf', 'application/pdf'],
      ['recap.json', 'application/json'],
    ]);
  });

  it('découpe un mois trop lourd en parties, chacune avec le recap complet', async () => {
    const envois = preparerEnvois('2026-10', [element(1, 10 * Mo), element(2, 10 * Mo), element(3, 10 * Mo)], maintenant, () => true);
    expect(envois.map((e) => e.objet)).toEqual(['Notes de frais 2026-10 (1/2)', 'Notes de frais 2026-10 (2/2)']);
    for (const e of envois) {
      const recap = e.fichiers.find((f) => f.name === 'recap.json')!;
      expect(JSON.parse(await recap.text()).elements).toHaveLength(3);
      expect(e.fichiers.reduce((t, f) => t + f.size, 0)).toBeLessThan(25 * Mo);
    }
    expect(envois[1].corps).toMatch(/partie 2\/2/);
  });

  it('se replie sur recap.txt quand le JSON n\'est pas partageable', () => {
    const peutPartager = (fichiers: File[]) => !fichiers.some((f) => f.type === 'application/json');
    const [envoi] = preparerEnvois('2026-10', [element(1, 10)], maintenant, peutPartager);
    expect(envoi.fichiers.at(-1)!.name).toBe('recap.txt');
    expect(envoi.fichiers.at(-1)!.type).toBe('text/plain');
  });
});

describe('partager', () => {
  const envoi = { objet: 'o', corps: 'c', fichiers: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] };

  it('renvoie « annule » quand l\'utilisateur ferme le menu de partage', async () => {
    const nav = { canShare: () => true, share: () => Promise.reject(new DOMException('', 'AbortError')) } as unknown as Navigator;
    expect(await partager(envoi, nav)).toBe('annule');
  });

  it('transmet objet, corps et fichiers au menu de partage', async () => {
    let recu: ShareData | undefined;
    const nav = { canShare: () => true, share: async (d: ShareData) => { recu = d; } } as unknown as Navigator;
    expect(await partager(envoi, nav)).toBe('partage');
    expect(recu).toEqual({ title: 'o', text: 'c', files: envoi.fichiers });
  });
});
