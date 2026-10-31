import { describe, expect, it } from 'vitest';
import { creerJetons, enregistrerDepart, executerDeparts } from './rendu';

describe('jetons de rendu', () => {
  it('seul le dernier rendu lancé reste actif', () => {
    const jetons = creerJetons();
    const premier = jetons.nouveau();
    const second = jetons.nouveau();
    expect(premier()).toBe(false);
    expect(second()).toBe(true);
  });
});

describe('départs', () => {
  it('exécute et attend les actions de sortie d\'écran, une seule fois', async () => {
    const faits: string[] = [];
    enregistrerDepart(async () => {
      await new Promise((r) => setTimeout(r, 5));
      faits.push('note');
    });
    await executerDeparts();
    await executerDeparts();
    expect(faits).toEqual(['note']);
  });
});
