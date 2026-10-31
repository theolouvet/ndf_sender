type Enfant = Node | string | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; on?: Record<string, (e: Event) => void> };

/** Crée un élément : h('button', { class: 'btn', on: { click } }, 'Texte'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...enfants: Enfant[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'on') for (const [ev, f] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, f);
    else if (k === 'class') el.className = v as string;
    else if (k in el) (el as unknown as Record<string, unknown>)[k] = v;
    else if (v !== false && v != null) el.setAttribute(k, String(v));
  }
  for (const e of enfants) if (e) el.append(e);
  return el;
}

/** URLs d'objets : celles de l'écran en construction, puis celles de l'écran affiché (libérées au remplacement). */
let enConstruction: string[] = [];
let affichees: string[] = [];
export function urlObjet(b: Blob): string {
  const u = URL.createObjectURL(b);
  enConstruction.push(u);
  return u;
}

/** Remplace l'écran affiché, sauf si un autre écran a été demandé entre-temps. */
export function afficherEcran(app: HTMLElement, actif: () => boolean, ...noeuds: (Node | null | undefined | false)[]): boolean {
  if (!actif()) return false;
  for (const u of affichees) URL.revokeObjectURL(u);
  affichees = enConstruction;
  enConstruction = [];
  app.replaceChildren(...noeuds.filter((n): n is Node => !!n));
  scrollTo(0, 0);
  return true;
}

/** Message bref en bas de l'écran. */
export function toast(message: string): void {
  const el = h('div', { class: 'toast', role: 'status' }, message);
  document.body.append(el);
  setTimeout(() => el.remove(), 4000);
}

/** Taille lisible : « 1,2 Mo » / « 1.2 MB ». */
export function tailleLisible(octets: number, langue: string): string {
  const mo = octets / (1024 * 1024);
  return new Intl.NumberFormat(langue, { style: 'unit', unit: mo < 1 ? 'kilobyte' : 'megabyte', maximumFractionDigits: 1 })
    .format(mo < 1 ? octets / 1024 : mo);
}

/** Date affichée selon la langue : 03/10/2026 ou 10/3/2026. */
export function dateLisible(iso: string, langue: string): string {
  return new Date(iso).toLocaleDateString(langue === 'fr' ? 'fr-FR' : 'en-GB');
}
