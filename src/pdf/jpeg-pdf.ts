const LARGEUR_A4 = 595; // points

/**
 * PDF 1.4 d'une page contenant le JPEG, écrit à la main (pas de bibliothèque).
 * La page garde la largeur d'un A4 et prend la hauteur proportionnelle à l'image.
 * Le JPEG doit avoir 3 composantes (c'est toujours le cas avec canvas.toBlob).
 */
export function jpegVersPdf(jpeg: Uint8Array, largeurPx: number, hauteurPx: number): Uint8Array<ArrayBuffer> {
  const l = LARGEUR_A4;
  const h = Math.round((LARGEUR_A4 * hauteurPx) / largeurPx);
  const contenu = `q ${l} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  const enc = new TextEncoder();

  const morceaux: Uint8Array[] = [];
  const offsets: number[] = [];
  let taille = 0;
  const ajouter = (m: string | Uint8Array) => {
    const b = typeof m === 'string' ? enc.encode(m) : m;
    morceaux.push(b);
    taille += b.length;
  };
  const objet = (n: number, corps: string | (string | Uint8Array)[]) => {
    offsets[n - 1] = taille;
    ajouter(`${n} 0 obj\n`);
    for (const m of typeof corps === 'string' ? [corps] : corps) ajouter(m);
    ajouter('\nendobj\n');
  };

  ajouter('%PDF-1.4\n');
  objet(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objet(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objet(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${l} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  objet(4, [
    `<< /Type /XObject /Subtype /Image /Width ${largeurPx} /Height ${hauteurPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    jpeg,
    '\nendstream',
  ]);
  objet(5, `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`);

  const debutXref = taille;
  ajouter(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
  for (const o of offsets) ajouter(`${String(o).padStart(10, '0')} 00000 n \n`);
  ajouter(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`);

  const sortie = new Uint8Array(taille);
  let pos = 0;
  for (const m of morceaux) {
    sortie.set(m, pos);
    pos += m.length;
  }
  return sortie;
}
