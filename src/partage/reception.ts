/** Cache où le service worker dépose les fichiers reçus par le menu Partager d'Android. */
export const CACHE_PARTAGE = 'ndf-partage';

export function fichierAccepte(f: { type: string; name: string }): 'image' | 'pdf' | null {
  if (f.type.startsWith('image/')) return 'image';
  if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) return 'pdf';
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
