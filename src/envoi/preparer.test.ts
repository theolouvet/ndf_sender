import { describe, expect, it } from 'vitest';
import type { Element } from '../domaine/types';
import { construireRecap, corpsMail, decouperEnParties, objetMail } from './preparer';

const element = (numero: number, note: string, ajouteLe: string, id: string, source: Element['source']): Element => ({
  id, mois: '2026-10', numero, ajouteLe, source, note, pdf: new Blob(['x']),
});
const elements = [
  element(1, '', '2026-10-03T12:40:00+02:00', 'b7f3c2e0', 'photo'),
  element(3, 'Restaurant client', '2026-10-14T21:05:00+02:00', '4a91d8aa', 'pdf'),
];
const maintenant = new Date(2026, 10, 1, 9, 12);
const Mo = 1024 * 1024;

describe('construireRecap', () => {
  it('reprend chaque élément avec son id stable, son nom de fichier et sa note', () => {
    expect(construireRecap('2026-10', elements, maintenant)).toEqual({
      mois: '2026-10',
      genere_le: '2026-11-01T09:12:00+01:00',
      elements: [
        { id: 'b7f3c2e0', fichier: '2026-10_01.pdf', ajoute_le: '2026-10-03T12:40:00+02:00', source: 'photo', note: '' },
        { id: '4a91d8aa', fichier: '2026-10_03_restaurant-client.pdf', ajoute_le: '2026-10-14T21:05:00+02:00', source: 'pdf', note: 'Restaurant client' },
      ],
    });
  });
});

describe('corpsMail', () => {
  it('liste les fichiers avec date et note', () => {
    expect(corpsMail(construireRecap('2026-10', elements, maintenant))).toBe(
      'Notes de frais 2026-10 — 2 justificatifs\n\n' +
        '2026-10_01.pdf — ajouté le 03/10/2026 — (sans note)\n' +
        '2026-10_03_restaurant-client.pdf — ajouté le 14/10/2026 — Restaurant client',
    );
  });
  it('accorde au singulier', () => {
    expect(corpsMail(construireRecap('2026-10', elements.slice(0, 1), maintenant))).toMatch(/^Notes de frais 2026-10 — 1 justificatif\n/);
  });
});

describe('objetMail', () => {
  it('numérote les parties', () => {
    expect(objetMail('2026-10')).toBe('Notes de frais 2026-10');
    expect(objetMail('2026-10', { n: 1, total: 2 })).toBe('Notes de frais 2026-10 (1/2)');
  });
});

describe('decouperEnParties', () => {
  const f = (mo: number) => ({ size: mo * Mo });
  it('regroupe dans l\'ordre sans dépasser la limite', () => {
    expect(decouperEnParties([f(10), f(10), f(10)], 22 * Mo).map((p) => p.map((x) => x.size / Mo))).toEqual([[10, 10], [10]]);
  });
  it('isole un fichier plus gros que la limite', () => {
    expect(decouperEnParties([f(5), f(30), f(5)], 22 * Mo).map((p) => p.length)).toEqual([1, 1, 1]);
  });
  it('renvoie une seule partie vide pour une liste vide', () => {
    expect(decouperEnParties([], 22 * Mo)).toEqual([[]]);
  });
});
