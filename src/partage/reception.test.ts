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

import { extraireLien, telechargerLien } from './reception';

describe('extraireLien', () => {
  it('trouve la première adresse web dans un lien ou un texte partagé', () => {
    expect(extraireLien(null, 'Votre ticket : https://www.bene-system.com/hp/pdfservice?pdf=ABC123 merci')).toBe(
      'https://www.bene-system.com/hp/pdfservice?pdf=ABC123',
    );
    expect(extraireLien('https://a.fr/x.pdf', 'autre https://b.fr')).toBe('https://a.fr/x.pdf');
    expect(extraireLien('', 'pas de lien', undefined)).toBeNull();
  });
});

describe('telechargerLien', () => {
  const reponse = (corps: BlobPart, entetes: Record<string, string> = {}, status = 200) =>
    (async () => new Response(corps, { status, headers: entetes })) as unknown as typeof fetch;

  it('récupère un PDF et lui donne un nom en .pdf', async () => {
    const f = await telechargerLien('https://www.bene-system.com/hp/pdfservice?pdf=ABC', reponse('%PDF-1.4 x', { 'Content-Type': 'application/pdf' }));
    expect(f.type).toBe('application/pdf');
    expect(f.name).toBe('pdfservice.pdf');
  });
  it('reprend le nom donné par le serveur', async () => {
    const f = await telechargerLien('https://a.fr/t', reponse('%PDF-1.4', { 'Content-Disposition': 'inline; filename="Ticket 42.pdf"' }));
    expect(f.name).toBe('Ticket 42.pdf');
  });
  it('refuse une page web ou une erreur', async () => {
    await expect(telechargerLien('https://a.fr', reponse('<html></html>', { 'Content-Type': 'text/html' }))).rejects.toThrow('format');
    await expect(telechargerLien('https://a.fr', reponse('%PDF', {}, 404))).rejects.toThrow('404');
  });
});
