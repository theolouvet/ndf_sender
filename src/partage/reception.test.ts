import { describe, expect, it } from 'vitest';
import { fichierAccepte, typeFichier } from './reception';

const fichier = (contenu: BlobPart, nom: string, type = '') => new File([contenu], nom, { type });

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

describe('typeFichier', () => {
  it('reconnaît un PDF à son contenu malgré un type générique et sans extension', async () => {
    expect(await typeFichier(fichier('%PDF-1.7 ...', 'document', 'application/octet-stream'))).toBe('pdf');
  });
  it('reconnaît un JPEG et un PNG à leur contenu', async () => {
    expect(await typeFichier(fichier(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]), 'x', 'application/octet-stream'))).toBe('image');
    expect(await typeFichier(fichier(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]), 'x'))).toBe('image');
  });
  it('refuse un fichier inconnu', async () => {
    expect(await typeFichier(fichier('PK\x03\x04 docx', 'a.docx', 'application/octet-stream'))).toBeNull();
  });
});
