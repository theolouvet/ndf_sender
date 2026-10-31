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
