import { describe, expect, it } from 'vitest';
import { choisirLangue, creerTraducteur } from './i18n';
import { libelleMois } from './domaine/mois';

describe('choisirLangue', () => {
  it('prend le français si le navigateur le préfère, l\'anglais sinon', () => {
    expect(choisirLangue(['fr-FR', 'en'])).toBe('fr');
    expect(choisirLangue(['fr-BE'])).toBe('fr');
    expect(choisirLangue(['de-DE', 'fr'])).toBe('en');
    expect(choisirLangue(['en-US'])).toBe('en');
    expect(choisirLangue([])).toBe('en');
  });
});

describe('traducteur', () => {
  it('traduit et remplace les paramètres', () => {
    expect(creerTraducteur('fr')('envoyeLe', { date: '01/11' })).toBe('Envoyé le 01/11');
    expect(creerTraducteur('en')('envoyeLe', { date: '11/1' })).toBe('Sent on 11/1');
  });
  it('accorde selon le nombre', () => {
    const t = creerTraducteur('fr');
    expect(t.n('justificatifs', 1)).toBe('1 justificatif');
    expect(t.n('justificatifs', 4)).toBe('4 justificatifs');
    expect(creerTraducteur('en').n('justificatifs', 0)).toBe('0 receipts');
  });
});

describe('libelleMois', () => {
  it('suit la langue de l\'interface', () => {
    expect(libelleMois('2026-10', 'fr')).toBe('octobre 2026');
    expect(libelleMois('2026-10', 'en')).toBe('October 2026');
  });
});
