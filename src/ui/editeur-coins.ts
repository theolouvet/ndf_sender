import type { Coins } from '../domaine/types';
import { h } from './dom';

const NS = 'http://www.w3.org/2000/svg';

/** Image avec 4 poignées déplaçables au doigt sur les coins du ticket. */
export function creerEditeur(source: HTMLCanvasElement, initial: Coins): { el: HTMLElement; coins(): Coins; definir(c: Coins): void } {
  let coins = initial.map((p) => ({ ...p })) as Coins;
  const img = h('img', { class: 'editeur-image', src: source.toDataURL('image/jpeg', 0.8), alt: '', draggable: false });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${source.width} ${source.height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('editeur-trace');
  const poly = document.createElementNS(NS, 'polygon');
  svg.append(poly);
  const poignees = coins.map(() => h('div', { class: 'poignee' }));
  const el = h('div', { class: 'editeur' }, img, svg, ...poignees);

  const dessiner = () => {
    poly.setAttribute('points', coins.map((p) => `${p.x},${p.y}`).join(' '));
    coins.forEach((p, i) => {
      poignees[i].style.left = `${(100 * p.x) / source.width}%`;
      poignees[i].style.top = `${(100 * p.y) / source.height}%`;
    });
  };

  poignees.forEach((poignee, i) => {
    poignee.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      poignee.setPointerCapture(e.pointerId);
      poignee.classList.add('active');
    });
    poignee.addEventListener('pointermove', (e) => {
      if (!poignee.hasPointerCapture(e.pointerId)) return;
      const r = img.getBoundingClientRect();
      const x = Math.min(Math.max(0, ((e.clientX - r.left) / r.width) * source.width), source.width);
      const y = Math.min(Math.max(0, ((e.clientY - r.top) / r.height) * source.height), source.height);
      coins[i] = { x, y };
      dessiner();
    });
    const lacher = () => poignee.classList.remove('active');
    poignee.addEventListener('pointerup', lacher);
    poignee.addEventListener('pointercancel', lacher);
  });

  dessiner();
  return {
    el,
    coins: () => coins.map((p) => ({ ...p })) as Coins,
    definir(c) {
      coins = c.map((p) => ({ ...p })) as Coins;
      dessiner();
    },
  };
}
