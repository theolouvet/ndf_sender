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

/** Première adresse web trouvée dans les champs d'un partage (lien, texte, titre). */
export function extraireLien(...textes: (string | null | undefined)[]): string | null {
  for (const t of textes) {
    const m = t?.match(/https?:\/\/[^\s<>"']+/);
    if (m) return m[0];
  }
  return null;
}

/**
 * Télécharge le justificatif d'un lien. Possible seulement si le site l'autorise (en-têtes CORS) :
 * sinon le navigateur bloque et l'erreur l'indique.
 */
export async function telechargerLien(url: string, recuperer: typeof fetch = fetch): Promise<File> {
  const rep = await recuperer(url);
  if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
  const blob = await rep.blob();
  const nomServeur = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(rep.headers.get('Content-Disposition') ?? '')?.[1];
  const nomUrl = new URL(url).pathname.split('/').filter(Boolean).pop();
  const brut = new File([blob], decodeURIComponent(nomServeur ?? nomUrl ?? 'document'), { type: blob.type });
  const type = await typeFichier(brut);
  if (!type) throw new Error('format');
  if (type === 'image') return brut;
  const nom = /\.pdf$/i.test(brut.name) ? brut.name : `${brut.name}.pdf`;
  return new File([blob], nom, { type: 'application/pdf' });
}

/** Lit puis vide les fichiers et liens partagés en attente. */
export async function lirePartages(): Promise<{ fichiers: File[]; liens: string[] }> {
  const fichiers: File[] = [];
  const liens: string[] = [];
  if (!('caches' in self)) return { fichiers, liens };
  const cache = await caches.open(CACHE_PARTAGE);
  for (const req of await cache.keys()) {
    const rep = await cache.match(req);
    if (rep) {
      const lien = rep.headers.get('X-Lien');
      if (lien) liens.push(decodeURIComponent(lien));
      else {
        const nom = decodeURIComponent(rep.headers.get('X-Nom') ?? 'fichier');
        fichiers.push(new File([await rep.blob()], nom, { type: rep.headers.get('Content-Type') ?? '' }));
      }
    }
    await cache.delete(req);
  }
  return { fichiers, liens };
}
