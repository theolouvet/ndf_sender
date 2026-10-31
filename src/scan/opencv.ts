import type { Coins } from '../domaine/types';
import type { Pixels } from './filtre';
import { MAX_COTE_SCAN, ordonnerCoins, tailleSortie } from './geometrie';

export type CV = typeof import('@techstark/opencv-js');

let chargement: Promise<{ cv: CV }> | null = null;

/**
 * Charge opencv.js comme script classique : l'interopérabilité CommonJS du bundler
 * enveloppe mal son export (une promesse), on passe donc par la variable globale `cv` du script UMD.
 */
async function chargerScript(): Promise<unknown> {
  const { default: url } = await import('@techstark/opencv-js/dist/opencv.js?url');
  await new Promise<void>((ok, ko) => {
    const s = Object.assign(document.createElement('script'), { src: url, async: true });
    s.onload = () => ok();
    s.onerror = () => ko(new Error('OpenCV.js indisponible'));
    document.head.append(s);
  });
  return (globalThis as unknown as { cv: unknown }).cv;
}

/**
 * Charge OpenCV.js (≈ 15 Mo, mis en cache par le service worker) une seule fois.
 * Renvoie { cv } et non cv : on évite qu'une promesse tente d'« adopter » l'objet OpenCV.
 */
export function chargerOpenCV(charger: () => Promise<unknown> = chargerScript): Promise<{ cv: CV }> {
  chargement ??= charger()
    .then(async (exporte) => {
      // Selon la version : promesse du module, module prêt, ou module en cours d'initialisation.
      const brut = (exporte instanceof Promise ? await exporte : exporte) as CV & { onRuntimeInitialized?: () => void };
      if (brut.Mat) return { cv: brut };
      return new Promise<{ cv: CV }>((ok) => {
        brut.onRuntimeInitialized = () => ok({ cv: brut });
      });
    })
    .catch((e) => {
      chargement = null; // nouvelle tentative au prochain appel (ex. retour du réseau)
      throw e;
    });
  return chargement;
}

/** Précharge OpenCV quand le navigateur est inactif, sans bloquer l'affichage. */
export function prechargerOpenCV(): void {
  const lancer = () => void chargerOpenCV().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(lancer, { timeout: 5000 });
  else setTimeout(lancer, 2000);
}

const COTE_DETECTION = 500;

/** Cherche le contour du ticket ; renvoie ses coins dans le repère de la source, ou null. */
export function detecterCoins(cv: CV, source: Pixels): Coins | null {
  const f = Math.min(1, COTE_DETECTION / Math.max(source.width, source.height));
  const mats: { delete(): void }[] = [];
  const garder = <T extends { delete(): void }>(m: T) => (mats.push(m), m);
  try {
    const src = garder(cv.matFromImageData(source as ImageData));
    const petit = garder(new cv.Mat());
    cv.resize(src, petit, new cv.Size(Math.round(source.width * f), Math.round(source.height * f)), 0, 0, cv.INTER_AREA);
    const gris = garder(new cv.Mat());
    cv.cvtColor(petit, gris, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gris, gris, new cv.Size(5, 5), 0);
    const bords = garder(new cv.Mat());
    cv.Canny(gris, bords, 75, 200);
    const noyau = garder(cv.Mat.ones(3, 3, cv.CV_8U));
    cv.dilate(bords, bords, noyau);
    const contours = garder(new cv.MatVector());
    const hierarchie = garder(new cv.Mat());
    cv.findContours(bords, contours, hierarchie, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const aireMin = 0.2 * petit.rows * petit.cols;
    const candidats: { aire: number; i: number }[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = garder(contours.get(i));
      candidats.push({ aire: cv.contourArea(c), i });
    }
    candidats.sort((a, b) => b.aire - a.aire);
    for (const { aire, i } of candidats) {
      if (aire < aireMin) break;
      const c = contours.get(i);
      garder(c);
      const approx = garder(new cv.Mat());
      cv.approxPolyDP(c, approx, 0.02 * cv.arcLength(c, true), true);
      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        const pts = [];
        for (let k = 0; k < 4; k++) pts.push({ x: approx.data32S[k * 2] / f, y: approx.data32S[k * 2 + 1] / f });
        return ordonnerCoins(pts);
      }
    }
    return null;
  } finally {
    for (const m of mats) m.delete();
  }
}

/** Redresse la zone délimitée par les coins. */
export function redresser(cv: CV, source: Pixels, coins: Coins): Pixels {
  const { l, h } = tailleSortie(coins, MAX_COTE_SCAN);
  const mats: { delete(): void }[] = [];
  const garder = <T extends { delete(): void }>(m: T) => (mats.push(m), m);
  try {
    const src = garder(cv.matFromImageData(source as ImageData));
    const de = garder(cv.matFromArray(4, 1, cv.CV_32FC2, coins.flatMap((p) => [p.x, p.y])));
    const vers = garder(cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, l, 0, l, h, 0, h]));
    const m = garder(cv.getPerspectiveTransform(de, vers));
    const dst = garder(new cv.Mat());
    cv.warpPerspective(src, dst, m, new cv.Size(l, h), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());
    return { data: new Uint8ClampedArray(dst.data), width: dst.cols, height: dst.rows };
  } finally {
    for (const m of mats) m.delete();
  }
}
