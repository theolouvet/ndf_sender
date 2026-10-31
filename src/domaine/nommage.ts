const MAX_SLUG = 40;

/** Début de la note en minuscules, sans accents, mots séparés par des tirets. */
export function slug(note: string): string {
  return note
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
}

/** 'AAAA-MM_NN_<slug>.pdf', ou 'AAAA-MM_NN.pdf' sans note utilisable. */
export function nomFichier(mois: string, numero: number, note: string): string {
  const s = slug(note);
  return `${mois}_${String(numero).padStart(2, '0')}${s ? `_${s}` : ''}.pdf`;
}
