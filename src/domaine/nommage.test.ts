import { describe, expect, it } from 'vitest';
import { nomFichier, slug } from './nommage';

describe('slug', () => {
  it('met en minuscules, retire les accents et sépare par des tirets', () => {
    expect(slug('Restaurant client X, 3 couverts')).toBe('restaurant-client-x-3-couverts');
    expect(slug('Hôtel Lyon.1')).toBe('hotel-lyon-1');
  });
  it('renvoie une chaîne vide sans caractère utilisable', () => {
    expect(slug('!!! 🍕')).toBe('');
  });
  it('coupe à 40 caractères sans tiret final', () => {
    expect(slug('a'.repeat(60)).length).toBe(40);
    expect(slug('mot '.repeat(15))).not.toMatch(/-$/);
  });
});

describe('nomFichier', () => {
  it('assemble mois, numéro sur deux chiffres et slug', () => {
    expect(nomFichier('2026-10', 3, 'Restaurant client')).toBe('2026-10_03_restaurant-client.pdf');
    expect(nomFichier('2026-10', 112, 'x')).toBe('2026-10_112_x.pdf');
  });
  it('omet le slug quand la note est vide ou inutilisable', () => {
    expect(nomFichier('2026-10', 4, '')).toBe('2026-10_04.pdf');
    expect(nomFichier('2026-10', 4, '!!!')).toBe('2026-10_04.pdf');
  });
});
