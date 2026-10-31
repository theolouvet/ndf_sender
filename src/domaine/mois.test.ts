import { describe, expect, it } from 'vitest';
import { dateCourte, isoLocal, libelleMois, moisDe } from './mois';

describe('mois', () => {
  it('rattache un ajout tardif au mois local, pas au mois UTC', () => {
    expect(moisDe(new Date(2026, 9, 31, 23, 30))).toBe('2026-10');
  });
  it('formate une date ISO avec le décalage horaire local (été et hiver)', () => {
    expect(isoLocal(new Date(2026, 9, 14, 21, 5))).toBe('2026-10-14T21:05:00+02:00');
    expect(isoLocal(new Date(2026, 10, 1, 9, 12))).toBe('2026-11-01T09:12:00+01:00');
  });
  it('donne le libellé français du mois', () => {
    expect(libelleMois('2026-10')).toBe('octobre 2026');
  });
  it('donne la date courte jour/mois/année', () => {
    expect(dateCourte('2026-10-03T12:40:00+02:00')).toBe('03/10/2026');
  });
});

import { moisVoisins } from './mois';

describe('moisVoisins', () => {
  it('remonte librement et avance jusqu\'au mois courant', () => {
    expect(moisVoisins('2026-10', '2026-10')).toEqual({ precedent: '2026-09', suivant: null });
    expect(moisVoisins('2026-01', '2026-10')).toEqual({ precedent: '2025-12', suivant: '2026-02' });
    expect(moisVoisins('2025-12', '2026-10')).toEqual({ precedent: '2025-11', suivant: '2026-01' });
  });
});
