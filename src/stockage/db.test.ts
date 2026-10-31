import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ajouterElement, deplacerVersMois, elementsDuMois, etatMois, fermerDb, lireElement,
  marquerEnvoye, moisAvecElements, supprimerElement, viderMois, type NouvelElement,
} from './db';

const pdf = (texte = 'x') => new Blob([texte], { type: 'application/pdf' });
const nouveau = (note = ''): NouvelElement => ({ source: 'photo', note, pdf: pdf() });
const le = (j: number, m = 10) => new Date(2026, m - 1, j, 12, 0);

beforeEach(async () => {
  await fermerDb();
  globalThis.indexedDB = new IDBFactory();
});

describe('stockage', () => {
  it('attribue mois, numéros croissants, id et date d\'ajout', async () => {
    const a = await ajouterElement(nouveau(), le(3));
    const b = await ajouterElement(nouveau('resto'), le(14));
    expect([a.numero, b.numero]).toEqual([1, 2]);
    expect(a.mois).toBe('2026-10');
    expect(a.ajouteLe).toBe('2026-10-03T12:00:00+02:00');
    expect(a.id).not.toBe(b.id);
  });

  it('ne réattribue jamais un numéro après suppression', async () => {
    await ajouterElement(nouveau(), le(3));
    const b = await ajouterElement(nouveau(), le(4));
    await supprimerElement(b.id);
    const c = await ajouterElement(nouveau(), le(5));
    expect(c.numero).toBe(3);
  });

  it('déplace un élément vers un autre mois avec le numéro suivant de ce mois', async () => {
    const a = await ajouterElement(nouveau(), le(3));
    await ajouterElement(nouveau(), le(4));
    const c = await ajouterElement(nouveau(), le(5));
    const deplace = await deplacerVersMois(a.id, '2026-09');
    expect(deplace.mois).toBe('2026-09');
    expect(deplace.numero).toBe(1);
    expect((await elementsDuMois('2026-10')).map((e) => e.numero)).toEqual([2, c.numero]);
  });

  it('marque le mois envoyé ; un ajout ultérieur reste non envoyé', async () => {
    const a = await ajouterElement(nouveau(), le(3));
    await marquerEnvoye('2026-10', le(31));
    const b = await ajouterElement(nouveau(), le(31));
    expect((await lireElement(a.id))?.envoyeLe).toBeDefined();
    expect((await lireElement(b.id))?.envoyeLe).toBeUndefined();
    expect((await etatMois('2026-10'))?.envoyeLe).toBeDefined();
  });

  it('vide un mois entièrement', async () => {
    await ajouterElement(nouveau(), le(3));
    await ajouterElement(nouveau(), le(3, 9));
    await viderMois('2026-10');
    expect(await elementsDuMois('2026-10')).toEqual([]);
    expect(await moisAvecElements()).toEqual(['2026-09']);
    expect(await etatMois('2026-10')).toBeUndefined();
  });

  it('liste les mois du plus récent au plus ancien', async () => {
    await ajouterElement(nouveau(), le(3, 9));
    await ajouterElement(nouveau(), le(3, 11));
    await ajouterElement(nouveau(), le(3, 10));
    expect(await moisAvecElements()).toEqual(['2026-11', '2026-10', '2026-09']);
  });

  it('relit un Blob stocké avec la même taille', async () => {
    const a = await ajouterElement({ source: 'pdf', note: '', pdf: pdf('contenu du pdf') }, le(3));
    expect((await lireElement(a.id))?.pdf.size).toBe(14);
  });
});
