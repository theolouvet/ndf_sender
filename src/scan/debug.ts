// Page de démonstration temporaire (?debug-scan) — retirée à la tâche 10.
import { appliquerFiltre, type Pixels } from './filtre';
import { coinsParDefaut } from './geometrie';
import { chargerOpenCV, detecterCoins, redresser } from './opencv';

export function pageDebug(app: HTMLElement): void {
  app.innerHTML = '<input type="file" accept="image/*"><p id="s"></p><div id="r" style="display:flex;gap:8px;flex-wrap:wrap"></div>';
  const statut = app.querySelector('#s')!;
  const traiter = async (f: Blob) => {
    statut.textContent = 'Chargement OpenCV…';
    const { cv } = await chargerOpenCV();
    const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
    const k = Math.min(1, 2500 / Math.max(bmp.width, bmp.height));
    const src = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
    src.getContext('2d')!.drawImage(bmp, 0, 0, src.width, src.height);
    const pixels = src.getContext('2d')!.getImageData(0, 0, src.width, src.height);
    const t0 = performance.now();
    const coins = detecterCoins(cv, pixels);
    const t1 = performance.now();
    const red = redresser(cv, pixels, coins ?? coinsParDefaut(src.width, src.height));
    const t2 = performance.now();
    const filtre = appliquerFiltre(red, 'document');
    const t3 = performance.now();
    const versCanvas = (p: Pixels) => {
      const c = Object.assign(document.createElement('canvas'), { width: p.width, height: p.height });
      c.getContext('2d')!.putImageData(new ImageData(p.data as Uint8ClampedArray<ArrayBuffer>, p.width, p.height), 0, 0);
      return c;
    };
    const redC = versCanvas(red);
    const doc = versCanvas(filtre);
    const c2 = src.getContext('2d')!;
    if (coins) {
      c2.strokeStyle = '#3ddc97'; c2.lineWidth = 8; c2.beginPath();
      coins.forEach((p, i) => (i ? c2.lineTo(p.x, p.y) : c2.moveTo(p.x, p.y)));
      c2.closePath(); c2.stroke();
    }
    (window as unknown as { resultatDebug: unknown }).resultatDebug = { coins, ms: [t1 - t0, t2 - t1, t3 - t2] };
    statut.textContent = `coins: ${coins ? 'trouvés' : 'non trouvés'} · détection ${Math.round(t1 - t0)} ms · redressement ${Math.round(t2 - t1)} ms · filtre ${Math.round(t3 - t2)} ms`;
    const r = app.querySelector('#r')!;
    r.replaceChildren(...[src, redC, doc].map((c) => Object.assign(c, { style: 'max-width:32%;border:1px solid #ccc' })));
  };
  app.querySelector('input')!.addEventListener('change', (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (f) void traiter(f);
  });
  const img = new URLSearchParams(location.search).get('img');
  if (img) void fetch(img).then((r) => r.blob()).then(traiter);
}
