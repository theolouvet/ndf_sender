import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { jpegVersPdf } from './jpeg-pdf';

const jpeg = new Uint8Array(readFileSync(new URL('./fixture.jpg', import.meta.url)));
const latin1 = (b: Uint8Array) => Buffer.from(b).toString('latin1');

describe('jpegVersPdf', () => {
  const pdf = jpegVersPdf(jpeg, 120, 200);
  const texte = latin1(pdf);

  it('produit un PDF 1.4 complet', () => {
    expect(texte.startsWith('%PDF-1.4')).toBe(true);
    expect(texte.endsWith('%%EOF\n')).toBe(true);
  });

  it('embarque le JPEG tel quel en DCTDecode', () => {
    expect(texte).toContain('/DCTDecode');
    expect(Buffer.from(pdf).indexOf(Buffer.from(jpeg))).toBeGreaterThan(0);
  });

  it('a une table xref dont chaque offset pointe sur son objet', () => {
    const debutXref = Number(/startxref\n(\d+)/.exec(texte)![1]);
    expect(texte.slice(debutXref, debutXref + 4)).toBe('xref');
    const entrees = [...texte.slice(debutXref).matchAll(/^(\d{10}) 00000 n /gm)].map((m) => Number(m[1]));
    expect(entrees.length).toBeGreaterThanOrEqual(5);
    entrees.forEach((offset, i) => expect(texte.slice(offset, offset + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });

  it('garde la largeur A4 et une hauteur proportionnelle', () => {
    expect(latin1(jpegVersPdf(jpeg, 1000, 2000))).toContain('/MediaBox [0 0 595 1190]');
  });
});
