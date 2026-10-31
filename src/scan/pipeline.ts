import type { Coins, Filtre } from '../domaine/types';
import { jpegVersPdf } from '../pdf/jpeg-pdf';
import { appliquerFiltre, type Pixels } from './filtre';
import { MAX_COTE_SCAN, tailleSortie } from './geometrie';
import { redresser, type CV } from './opencv';

export const MAX_COTE_ORIGINAL = 2500;
const QUALITE_ORIGINAL = 0.85;
const QUALITE_SCAN = 0.7;

/** Décode une image (orientation EXIF appliquée) dans un canvas dont le grand côté ≤ maxCote. */
export async function decoderImage(f: Blob, maxCote: number): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
  const k = Math.min(1, maxCote / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

export function versPixels(c: HTMLCanvasElement): Pixels {
  return c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height);
}

export function versCanvas(p: Pixels): HTMLCanvasElement {
  const c = Object.assign(document.createElement('canvas'), { width: p.width, height: p.height });
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.width, p.height), 0, 0);
  return c;
}

export function versJpeg(c: HTMLCanvasElement, qualite: number): Promise<Blob> {
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('JPEG'))), 'image/jpeg', qualite));
}

export const jpegOriginal = (c: HTMLCanvasElement) => versJpeg(c, QUALITE_ORIGINAL);

/**
 * Image redressée et filtrée. Sans OpenCV (hors ligne avant le premier chargement),
 * simple recadrage du rectangle englobant les coins.
 */
export function imageScannee(cv: CV | null, original: HTMLCanvasElement, coins: Coins, filtre: Filtre): HTMLCanvasElement {
  let redresse: Pixels;
  if (cv) redresse = redresser(cv, versPixels(original), coins);
  else {
    const xs = coins.map((p) => p.x), ys = coins.map((p) => p.y);
    const x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys));
    const l = Math.min(original.width, Math.max(...xs)) - x0, h = Math.min(original.height, Math.max(...ys)) - y0;
    const { l: lo, h: ho } = tailleSortie([{ x: 0, y: 0 }, { x: l, y: 0 }, { x: l, y: h }, { x: 0, y: h }], MAX_COTE_SCAN);
    const c = Object.assign(document.createElement('canvas'), { width: lo, height: ho });
    c.getContext('2d')!.drawImage(original, x0, y0, l, h, 0, 0, lo, ho);
    redresse = versPixels(c);
  }
  return versCanvas(appliquerFiltre(redresse, filtre));
}

/** JPEG du scan (aperçu) et PDF d'une page à envoyer. */
export async function produireScan(scan: HTMLCanvasElement): Promise<{ image: Blob; pdf: Blob }> {
  const image = await versJpeg(scan, QUALITE_SCAN);
  const octets = new Uint8Array(await image.arrayBuffer());
  return { image, pdf: new Blob([jpegVersPdf(octets, scan.width, scan.height)], { type: 'application/pdf' }) };
}
