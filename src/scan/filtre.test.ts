import { describe, expect, it } from 'vitest';
import { appliquerFiltre, type Pixels } from './filtre';

/** Fond qui passe du gris 120 (gauche) au gris 200 (droite), trait noir (20) horizontal au milieu. */
function ticketOmbre(): Pixels {
  const width = 60, height = 60;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = y >= 28 && y < 32 ? 20 : Math.round(120 + (80 * x) / (width - 1));
      data.set([v, v, v, 255], (y * width + x) * 4);
    }
  return { data, width, height };
}
const estTrait = (i: number) => {
  const y = Math.floor(i / 60);
  return y >= 28 && y < 32;
};

describe('appliquerFiltre', () => {
  it('« document » blanchit le fond ombré et garde le texte noir', () => {
    const sortie = appliquerFiltre(ticketOmbre(), 'document');
    for (let i = 0; i < 60 * 60; i++) {
      const v = sortie.data[i * 4];
      if (estTrait(i)) expect(v).toBeLessThanOrEqual(60);
      else expect(v).toBeGreaterThanOrEqual(230);
      expect(sortie.data[i * 4 + 3]).toBe(255);
    }
  });
  it('« couleur » laisse l\'image intacte', () => {
    const img = ticketOmbre();
    expect(appliquerFiltre(img, 'couleur').data).toEqual(img.data);
  });
});
