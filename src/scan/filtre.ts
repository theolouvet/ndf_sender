import type { Filtre } from '../domaine/types';

/** Compatible ImageData. */
export interface Pixels { data: Uint8ClampedArray; width: number; height: number }

/**
 * « couleur » : image intacte.
 * « document » : fond blanc et texte noir, ombres et papier jauni supprimés.
 *   1. luminance ; 2. fond estimé par un maximum glissant (efface le texte) puis un flou boîte ;
 *   3. division par le fond ; 4. étirement du contraste entre le centile 2 % et la médiane (le papier).
 */
export function appliquerFiltre(img: Pixels, filtre: Filtre): Pixels {
  if (filtre === 'couleur') return img;
  const { width: l, height: h, data } = img;
  const n = l * h;
  const gris = new Float32Array(n);
  for (let i = 0; i < n; i++) gris[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];

  const r = Math.max(1, Math.round(Math.max(l, h) / 30));
  const fond = flouBoite(maxGlissant(gris, l, h, r), l, h, r);

  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = Math.min(255, (255 * gris[i]) / Math.max(fond[i], 1));

  // Haut = médiane : le papier occupe l'essentiel du ticket, tout ce qui est au moins aussi clair devient blanc.
  const [bas, haut] = centiles(v, 0.02, 0.5);
  const echelle = haut > bas ? 255 / (haut - bas) : 1;
  const sortie = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const g = (v[i] - bas) * echelle;
    sortie[i * 4] = sortie[i * 4 + 1] = sortie[i * 4 + 2] = g;
    sortie[i * 4 + 3] = 255;
  }
  return { data: sortie, width: l, height: h };
}

/** Maximum sur une fenêtre carrée de rayon r (deux passes 1D, file monotone : O(n)). */
function maxGlissant(src: Float32Array, l: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  const file = new Int32Array(Math.max(l, h));
  const passe = (entree: Float32Array, sortie: Float32Array, long: number, nb: number, pas: number, saut: number) => {
    for (let k = 0; k < nb; k++) {
      const base = k * saut;
      let debut = 0, fin = 0;
      for (let i = 0; i < long + r; i++) {
        if (i < long) {
          const val = entree[base + i * pas];
          while (fin > debut && entree[base + file[fin - 1] * pas] <= val) fin--;
          file[fin++] = i;
        }
        const centre = i - r;
        if (centre >= 0) {
          while (file[debut] < centre - r) debut++;
          sortie[base + centre * pas] = entree[base + file[debut] * pas];
        }
      }
    }
  };
  passe(src, tmp, l, h, 1, l); // lignes
  passe(tmp, dst, h, l, l, 1); // colonnes
  return dst;
}

/** Moyenne sur une fenêtre carrée de rayon r, via une image intégrale. */
function flouBoite(src: Float32Array, l: number, h: number, r: number): Float32Array {
  const I = new Float64Array((l + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let ligne = 0;
    for (let x = 0; x < l; x++) {
      ligne += src[y * l + x];
      I[(y + 1) * (l + 1) + x + 1] = I[y * (l + 1) + x + 1] + ligne;
    }
  }
  const dst = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < l; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(l, x + r + 1);
      const s = I[y1 * (l + 1) + x1] - I[y0 * (l + 1) + x1] - I[y1 * (l + 1) + x0] + I[y0 * (l + 1) + x0];
      dst[y * l + x] = s / ((y1 - y0) * (x1 - x0));
    }
  }
  return dst;
}

function centiles(v: Float32Array, a: number, b: number): [number, number] {
  const histo = new Uint32Array(256);
  for (const x of v) histo[Math.round(x)]++;
  const cherche = (p: number) => {
    let cumul = 0;
    for (let i = 0; i < 256; i++) if ((cumul += histo[i]) >= p * v.length) return i;
    return 255;
  };
  return [cherche(a), cherche(b)];
}
