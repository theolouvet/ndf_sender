import { describe, expect, it } from 'vitest';
import { hashVersRoute, routeVersHash } from './routeur';

describe('routes', () => {
  it('écrit le mois et le détail dans le hash', () => {
    expect(routeVersHash({ ecran: 'mois', mois: '2026-10' })).toBe('#/mois/2026-10');
    expect(routeVersHash({ ecran: 'detail', id: 'abc' })).toBe('#/detail/abc');
    expect(routeVersHash({ ecran: 'ajout', source: 'photo' })).toBe('#/ajout');
  });
  it('relit un hash valide et retombe sur le mois courant sinon', () => {
    expect(hashVersRoute('#/mois/2026-09', '2026-10')).toEqual({ ecran: 'mois', mois: '2026-09' });
    expect(hashVersRoute('#/detail/abc', '2026-10')).toEqual({ ecran: 'detail', id: 'abc' });
    expect(hashVersRoute('', '2026-10')).toEqual({ ecran: 'mois', mois: '2026-10' });
    expect(hashVersRoute('#/mois/n-importe', '2026-10')).toEqual({ ecran: 'mois', mois: '2026-10' });
    expect(hashVersRoute('#/ajout', '2026-10')).toEqual({ ecran: 'mois', mois: '2026-10' });
  });
});
