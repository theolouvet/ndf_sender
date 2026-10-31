import { libelleMois, moisDe } from '../domaine/mois';
import type { Element } from '../domaine/types';
import { t } from '../i18n';
import { deplacerVersMois, lireElement, modifierElement, supprimerElement } from '../stockage/db';
import { confirmer } from './confirmer';
import { afficherEcran, dateLisible, h, toast, urlObjet } from './dom';
import { enregistrerDepart } from './rendu';
import { naviguer } from './routeur';

/** Les 12 derniers mois, plus celui de l'élément s'il est plus ancien. */
function moisProposes(actuel: string): string[] {
  const d = new Date();
  const liste = Array.from({ length: 12 }, (_, i) => moisDe(new Date(d.getFullYear(), d.getMonth() - i, 1)));
  return liste.includes(actuel) ? liste : [actuel, ...liste];
}

export async function ecranDetail(app: HTMLElement, id: string, actif: () => boolean = () => true): Promise<void> {
  const e = await lireElement(id);
  if (!e) return naviguer({ ecran: 'mois', mois: moisDe(new Date()) }, true);

  const retour = () => naviguer({ ecran: 'mois', mois: e.mois });

  const note = h('input', { class: 'champ', type: 'text', value: e.note, placeholder: t('note'), enterKeyHint: 'done' });
  // Enregistrée à la validation, et aussi en quittant l'écran (bouton retour d'Android sans validation).
  let noteEnregistree = e.note;
  const enregistrerNote = async () => {
    const valeur = note.value.trim();
    if (valeur === noteEnregistree) return;
    try {
      await modifierElement(e.id, { note: valeur });
      noteEnregistree = valeur;
    } catch (err) {
      toast(t('erreur', { msg: (err as Error).message }));
    }
  };
  note.addEventListener('change', () => void enregistrerNote());
  enregistrerDepart(enregistrerNote);

  const choixMois = h('select', { class: 'champ' },
    ...moisProposes(e.mois).map((m) => h('option', { value: m, selected: m === e.mois }, libelleMois(m, t.langue))),
  );
  choixMois.addEventListener('change', async () => {
    try {
      await enregistrerNote();
      const deplace = await deplacerVersMois(e.id, choixMois.value);
      naviguer({ ecran: 'mois', mois: deplace.mois }, true);
    } catch (err) {
      toast(t('erreur', { msg: (err as Error).message }));
    }
  });

  const supprimer = async () => {
    if (!(await confirmer(t('confirmerSupprimer'), t('supprimer')))) return;
    await supprimerElement(e.id);
    naviguer({ ecran: 'mois', mois: e.mois }, true);
  };

  afficherEcran(app, actif,
    h('header', { class: 'entete' },
      h('div', { class: 'titre-mois' },
        h('button', { class: 'fleche', 'aria-label': t('fermer'), on: { click: retour } }, '‹'),
        h('h1', {}, `${String(e.numero).padStart(2, '0')} · ${e.note || t('sansNote')}`),
        h('span', { class: 'fleche' }),
      ),
    ),
    h('main', { class: 'detail' },
      visuel(e),
      h('label', { class: 'ligne' }, h('span', {}, t('note')), note),
      h('label', { class: 'ligne' }, h('span', {}, t('mois')), choixMois),
      h('p', { class: 'ligne info-ajout' }, `${t('ajouteLe')} ${dateLisible(e.ajouteLe, t.langue)} · ${t(`source_${e.source}`)}`),
      h('div', { class: 'actions-detail' },
        e.original && h('button', {
          class: 'btn',
          on: {
            click: () => naviguer({
              ecran: 'ajout', source: e.source, idExistant: e.id,
              fichier: new File([e.original!], 'original.jpg', { type: 'image/jpeg' }),
            }),
          },
        }, `↺ ${t('refaireScan')}`),
        h('button', { class: 'btn danger', on: { click: supprimer } }, `🗑 ${t('supprimer')}`),
      ),
    ),
  );
}

function visuel(e: Element): HTMLElement {
  if (e.image) return h('img', { class: 'scan-grand', src: urlObjet(e.image), alt: '' });
  // PDF importé : Android l'ouvre dans sa visionneuse.
  return h('div', { class: 'fichier-pdf' },
    h('div', { class: 'vignette pdf grande' }, 'PDF'),
    h('a', { class: 'btn contour', href: urlObjet(e.pdf), target: '_blank', rel: 'noopener' }, t('ouvrirPdf')),
  );
}
