import { describe, expect, it } from 'vitest';
import { fichierAccepte } from './reception';

describe('fichierAccepte', () => {
  it('accepte les images et les PDF', () => {
    expect(fichierAccepte({ type: 'image/jpeg', name: 'a.jpg' })).toBe('image');
    expect(fichierAccepte({ type: 'application/pdf', name: 'f.pdf' })).toBe('pdf');
  });
  it('reconnaît un PDF à son extension quand le type manque', () => {
    expect(fichierAccepte({ type: '', name: 'facture.PDF' })).toBe('pdf');
  });
  it('refuse les autres formats', () => {
    expect(fichierAccepte({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', name: 'a.docx' })).toBeNull();
    expect(fichierAccepte({ type: 'video/mp4', name: 'v.mp4' })).toBeNull();
  });
});
