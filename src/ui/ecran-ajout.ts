import { moisDe } from '../domaine/mois';
import type { Coins, Filtre, Source } from '../domaine/types';
import { t } from '../i18n';
import { fichierAccepte } from '../partage/reception';
import { coinsParDefaut } from '../scan/geometrie';
import { chargerOpenCV, detecterCoins, type CV } from '../scan/opencv';
import { decoderImage, imageScannee, jpegOriginal, MAX_COTE_ORIGINAL, produireScan, versPixels } from '../scan/pipeline';
import { ajouterElement, lireElement, modifierElement } from '../stockage/db';
import { h, toast, urlObjet } from './dom';
import { creerEditeur } from './editeur-coins';
import { naviguer } from './routeur';

/** Fichiers reçus par le menu Partager, traités un par un. */
let filePartage: File[] = [];
let totalPartage = 0;

export function traiterPartages(fichiers: File[]): void {
  const acceptes = fichiers.filter((f) => fichierAccepte(f));
  const ignores = fichiers.length - acceptes.length;
  if (ignores > 0) toast(t.n('ignores', ignores));
  filePartage = acceptes;
  totalPartage = acceptes.length;
  suivantOuRetour(null);
}

/** Passe au fichier partagé suivant, ou revient au mois (sans laisser l'ajout dans l'historique). */
function suivantOuRetour(mois: string | null): void {
  const f = filePartage.shift();
  if (f) naviguer({ ecran: 'ajout', source: fichierAccepte(f) === 'pdf' ? 'pdf' : 'galerie', fichier: f }, true);
  else if (mois) naviguer({ ecran: 'mois', mois }, true);
  else naviguer({ ecran: 'mois', mois: moisDe(new Date()) }, true);
}

export async function ecranAjout(app: HTMLElement, source: Source, fichier: File | undefined, idExistant?: string): Promise<void> {
  if (!fichier) return suivantOuRetour(null);
  const existant = idExistant ? await lireElement(idExistant) : undefined;
  const rang = totalPartage > 0 ? totalPartage - filePartage.length : 0;

  const note = h('input', { class: 'champ', type: 'text', placeholder: t('note'), value: existant?.note ?? '', enterKeyHint: 'done' });
  const statut = h('p', { class: 'statut', role: 'status' });
  const enregistrer = h('button', { class: 'btn principal large' }, t('enregistrer'));
  const corps = h('main', { class: 'ajout' });

  app.replaceChildren(
    h('header', { class: 'entete' },
      h('div', { class: 'titre-mois' },
        h('button', { class: 'fleche', 'aria-label': t('fermer'), on: { click: () => suivantOuRetour(null) } }, '✕'),
        h('h1', {}, t('nouveau')),
        h('span', { class: 'fleche' }),
      ),
      rang > 0 && h('p', { class: 'sous-titre' }, t('partageSuivant', { n: rang, total: totalPartage })),
    ),
    corps,
    h('footer', { class: 'barre-bas' }, note, enregistrer),
  );

  const terminer = async (sauver: () => Promise<{ mois: string }>) => {
    enregistrer.disabled = true;
    enregistrer.textContent = t('enregistrement');
    try {
      const { mois } = await sauver();
      suivantOuRetour(mois);
    } catch (e) {
      toast(t('erreur', { msg: (e as Error).message }));
      enregistrer.disabled = false;
      enregistrer.textContent = t('enregistrer');
    }
  };

  if (source === 'pdf') {
    corps.append(h('div', { class: 'fichier-pdf' }, h('div', { class: 'vignette pdf grande' }, 'PDF'), h('p', {}, fichier.name)));
    enregistrer.addEventListener('click', () =>
      terminer(() => ajouterElement({ source: 'pdf', note: note.value.trim(), pdf: fichier })),
    );
    return;
  }

  // Image : original conservé, scan réglable.
  const original = await decoderImage(fichier, MAX_COTE_ORIGINAL);
  const pleine: Coins = [{ x: 0, y: 0 }, { x: original.width, y: 0 }, { x: original.width, y: original.height }, { x: 0, y: original.height }];
  const editeur = creerEditeur(original, existant?.coins ?? coinsParDefaut(original.width, original.height));
  let filtre: Filtre = existant?.filtre ?? 'document';
  let cv: CV | null = null;

  const apercu = h('img', { class: 'apercu', alt: '' });
  const zone = h('div', { class: 'zone-scan' }, editeur.el);
  let enApercu = false;
  const boutonApercu = h('button', { class: 'btn', disabled: true, on: { click: () => basculerApercu() } }, '👁');
  const basculerApercu = () => {
    enApercu = !enApercu;
    if (enApercu) {
      apercu.removeAttribute('src');
      imageScannee(cv, original, editeur.coins(), filtre).toBlob((b) => b && (apercu.src = urlObjet(b)), 'image/jpeg', 0.8);
      zone.replaceChildren(apercu);
    } else zone.replaceChildren(editeur.el);
    boutonApercu.classList.toggle('actif', enApercu);
  };

  const filtres = (['document', 'couleur'] as const).map((f) =>
    h('button', {
      class: `segment${f === filtre ? ' actif' : ''}`,
      on: {
        click: () => {
          filtre = f;
          filtres.forEach((b, i) => b.classList.toggle('actif', (['document', 'couleur'] as const)[i] === f));
          if (enApercu) {
            enApercu = false;
            basculerApercu();
          }
        },
      },
    }, t(f)),
  );

  corps.append(
    zone,
    statut,
    h('div', { class: 'outils' },
      h('div', { class: 'segments' }, ...filtres),
      h('button', { class: 'btn', on: { click: () => { editeur.definir(pleine); if (enApercu) { enApercu = false; basculerApercu(); } } } }, t('imageEntiere')),
      boutonApercu,
    ),
  );

  enregistrer.addEventListener('click', () =>
    terminer(async () => {
      const coins = editeur.coins();
      const { image, pdf } = await produireScan(imageScannee(cv, original, coins, filtre));
      if (existant) return modifierElement(existant.id, { image, pdf, coins, filtre, note: note.value.trim() });
      return ajouterElement({ source, note: note.value.trim(), pdf, image, original: await jpegOriginal(original), coins, filtre });
    }),
  );

  // OpenCV : détection automatique des bords (sauf nouveau scan, qui garde les coins mémorisés).
  statut.textContent = t('preparation');
  enregistrer.disabled = true;
  try {
    ({ cv } = await chargerOpenCV());
    statut.textContent = '';
    if (!existant) {
      const trouves = detecterCoins(cv, versPixels(original));
      if (trouves) editeur.definir(trouves);
      else statut.textContent = t('bordsNonTrouves');
    }
  } catch {
    statut.textContent = t('scanIndispo');
    filtre = 'couleur';
    filtres.forEach((b, i) => b.classList.toggle('actif', i === 1));
    editeur.definir(pleine);
  } finally {
    enregistrer.disabled = false;
    boutonApercu.disabled = false;
  }
}
