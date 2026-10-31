/** Cache où le service worker dépose les fichiers reçus par le menu Partager d'Android. */
export const CACHE_PARTAGE = 'ndf-partage';

export function fichierAccepte(f: { type: string; name: string }): 'image' | 'pdf' | null {
  if (f.type.startsWith('image/')) return 'image';
  if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) return 'pdf';
  return null;
}

/**
 * Type réel d'un fichier partagé : d'après son type annoncé ou son extension, sinon d'après ses premiers octets
 * (certaines applis partagent un PDF en « application/octet-stream » ou sans extension).
 */
export async function typeFichier(f: Blob & { name: string }): Promise<'image' | 'pdf' | null> {
  const annonce = fichierAccepte(f);
  if (annonce) return annonce;
  const o = new Uint8Array(await f.slice(0, 8).arrayBuffer());
  const debut = String.fromCharCode(...o);
  if (debut.startsWith('%PDF')) return 'pdf';
  if (o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return 'image'; // JPEG
  if (debut.startsWith('PNG')) return 'image';
  if (debut.startsWith('RIFF') || debut.startsWith('GIF8')) return 'image'; // WebP, GIF
  return null;
}

/** Lit puis vide les fichiers partagés en attente. */
export async function lireFichiersPartages(): Promise<File[]> {
  if (!('caches' in self)) return [];
  const cache = await caches.open(CACHE_PARTAGE);
  const fichiers: File[] = [];
  for (const req of await cache.keys()) {
    const rep = await cache.match(req);
    if (rep) {
      const nom = decodeURIComponent(rep.headers.get('X-Nom') ?? 'fichier');
      fichiers.push(new File([await rep.blob()], nom, { type: rep.headers.get('Content-Type') ?? '' }));
    }
    await cache.delete(req);
  }
  return fichiers;
}
