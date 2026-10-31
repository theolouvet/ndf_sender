const deux = (n: number) => String(n).padStart(2, '0');

/** Mois 'AAAA-MM' de la date, en heure locale. */
export function moisDe(d: Date): string {
  return `${d.getFullYear()}-${deux(d.getMonth() + 1)}`;
}

/** Date ISO 8601 locale avec décalage, ex. '2026-10-14T21:05:00+02:00'. */
export function isoLocal(d: Date): string {
  const decalage = -d.getTimezoneOffset();
  const signe = decalage >= 0 ? '+' : '-';
  const abs = Math.abs(decalage);
  return (
    `${moisDe(d)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}:${deux(d.getSeconds())}` +
    `${signe}${deux(Math.floor(abs / 60))}:${deux(abs % 60)}`
  );
}

const NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** 'octobre 2026' */
export function libelleMois(mois: string): string {
  const [a, m] = mois.split('-');
  return `${NOMS[Number(m) - 1]} ${a}`;
}

/** '14/10/2026' à partir d'une date ISO (date telle qu'écrite, sans conversion de fuseau). */
export function dateCourte(iso: string): string {
  const [a, m, j] = iso.slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
}
