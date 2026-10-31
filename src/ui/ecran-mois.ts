import { libelleMois, moisDe } from '../domaine/mois';
import type { Element, Source } from '../domaine/types';
import { partager, preparerEnvois, suivreParties, type Envoi } from '../envoi/partager';
import { t } from '../i18n';
import { elementsDuMois, etatMois, marquerEnvoye, moisAvecElements, viderMois } from '../stockage/db';
import { confirmer } from './confirmer';
import { afficherEcran, dateLisible, h, tailleLisible, toast, urlObjet } from './dom';
import { naviguer } from './routeur';

let persistanceRefusee = false;
export function signalerPersistanceRefusee(): void {
  persistanceRefusee = true;
}

export async function ecranMois(app: HTMLElement, mois: string, actif: () => boolean = () => true): Promise<void> {
  const [elements, etat, moisConnus] = await Promise.all([elementsDuMois(mois), etatMois(mois), moisAvecElements()]);
  const taille = elements.reduce((s, e) => s + e.pdf.size, 0);

  // Navigation : mois ayant des éléments, plus le mois courant et le mois affiché.
  const liste = [...new Set([...moisConnus, moisDe(new Date()), mois])].sort().reverse();
  const i = liste.indexOf(mois);
  const plusAncien = liste[i + 1];
  const plusRecent = liste[i - 1];

  const nonEnvoyes = etat?.envoyeLe ? elements.filter((e) => !e.envoyeLe).length : 0;

  afficherEcran(app, actif, ...[
    h('header', { class: 'entete' },
      h('div', { class: 'titre-mois' },
        h('button', { class: 'fleche', 'aria-label': t('moisPrecedent'), disabled: !plusAncien, on: { click: () => naviguer({ ecran: 'mois', mois: plusAncien }) } }, '‹'),
        h('h1', {}, capitaliser(libelleMois(mois, t.langue))),
        h('button', { class: 'fleche', 'aria-label': t('moisSuivant'), disabled: !plusRecent, on: { click: () => naviguer({ ecran: 'mois', mois: plusRecent }) } }, '›'),
      ),
      h('p', { class: 'sous-titre' }, `${t.n('justificatifs', elements.length)} · ${tailleLisible(taille, t.langue)}`),
    ),
    persistanceRefusee && h('p', { class: 'bandeau alerte' }, t('persistance')),
    !!etat?.envoyeLe && h('p', { class: 'bandeau succes' },
      `✓ ${t('envoyeLe', { date: dateLisible(etat!.envoyeLe!, t.langue) })}`,
      nonEnvoyes > 0 && ` — ${t.n('ajoutesDepuis', nonEnvoyes)}`,
    ),
    h('main', { class: 'liste' },
      elements.length === 0
        ? h('p', { class: 'vide' }, t('vide'))
        : h('ul', {}, ...elements.map((e) => ligne(e, !!etat?.envoyeLe))),
      elements.length > 0 && h('button', { class: 'lien danger', on: { click: () => vider(app, mois, elements.length) } }, t('viderMois')),
    ),
    barreBas(app, mois, elements),
  ]);
}

function ligne(e: Element, moisEnvoye: boolean): HTMLElement {
  const vignette = e.image
    ? h('img', { class: 'vignette', src: urlObjet(e.image), alt: '' })
    : h('div', { class: 'vignette pdf' }, 'PDF');
  return h('li', {},
    h('button', { class: 'element', on: { click: () => naviguer({ ecran: 'detail', id: e.id }) } },
      vignette,
      h('span', { class: 'texte' },
        h('span', { class: 'note' },
          `${String(e.numero).padStart(2, '0')} · ${e.note || t('sansNote')}`,
          moisEnvoye && !e.envoyeLe && h('span', { class: 'badge' }, t('nonEnvoye')),
        ),
        h('span', { class: 'date' }, dateLisible(e.ajouteLe, t.langue)),
      ),
    ),
  );
}

function barreBas(app: HTMLElement, mois: string, elements: Element[]): HTMLElement {
  const choisir = (source: Source) => {
    const input = h('input', {
      type: 'file',
      accept: source === 'pdf' ? 'application/pdf' : 'image/*',
      ...(source === 'photo' ? { capture: 'environment' } : {}),
      on: {
        change: () => {
          const f = input.files?.[0];
          if (f) naviguer({ ecran: 'ajout', source, fichier: f });
        },
      },
    });
    input.click();
  };
  const zoneEnvoi = h('div', { class: 'envoi' },
    h('button', { class: 'btn contour large', disabled: elements.length === 0, on: { click: () => envoyer(app, mois, elements, zoneEnvoi) } }, `${t('envoyerMois')} ✉`),
  );
  return h('footer', { class: 'barre-bas' },
    h('div', { class: 'ajouts' },
      h('button', { class: 'btn principal', on: { click: () => choisir('photo') } }, `📷 ${t('photo')}`),
      h('button', { class: 'btn', on: { click: () => choisir('galerie') } }, `🖼 ${t('galerie')}`),
      h('button', { class: 'btn', on: { click: () => choisir('pdf') } }, `📄 ${t('pdf')}`),
    ),
    zoneEnvoi,
  );
}

async function envoyer(app: HTMLElement, mois: string, elements: Element[], zone: HTMLElement): Promise<void> {
  const envois = preparerEnvois(mois, elements, new Date(), (f) => navigator.canShare?.({ files: f }) ?? false);
  // Fichier trop lourd pour Gmail : prévenir une fois, le clic suivant envoie quand même.
  if (envois.some((e) => e.tropLourd) && !zone.dataset.averti) {
    zone.dataset.averti = '1';
    zone.prepend(h('p', { class: 'info alerte-texte' }, `⚠ ${t('fichierTropLourd')}`));
    zone.querySelector('button')!.textContent = t('envoyerQuandMeme');
    return;
  }
  if (envois.length === 1) {
    if (await lancer(envois[0])) {
      await marquerEnvoye(mois, new Date());
      await ecranMois(app, mois);
    }
    return;
  }
  // Plusieurs mails : un bouton par partie, car chaque partage exige un geste de l'utilisateur.
  // Le mois n'est marqué envoyé qu'une fois toutes les parties parties.
  const suivi = suivreParties(envois.length);
  zone.replaceChildren(
    h('p', { class: 'info' }, t('tropLourd', { total: envois.length })),
    h('div', { class: 'parties' }, ...envois.map((envoi, i) => {
      const b = h('button', {
        class: 'btn contour',
        on: {
          click: async () => {
            if (await lancer(envoi)) {
              b.textContent = `✓ ${i + 1}/${envois.length}`;
              b.disabled = true;
              if (suivi.marquer(i)) {
                await marquerEnvoye(mois, new Date());
                await ecranMois(app, mois);
              }
            }
          },
        },
      }, t('envoyerPartie', { n: i + 1, total: envois.length }));
      return b;
    })),
  );
}

async function lancer(envoi: Envoi): Promise<boolean> {
  try {
    const r = await partager(envoi);
    if (r === 'telechargement') toast(t('telecharge'));
    return r !== 'annule';
  } catch (e) {
    toast(t('erreur', { msg: (e as Error).message }));
    return false;
  }
}

async function vider(app: HTMLElement, mois: string, n: number): Promise<void> {
  if (!(await confirmer(t('confirmerVider', { nb: t.n('justificatifs', n), mois: libelleMois(mois, t.langue) }), t('supprimer')))) return;
  await viderMois(mois);
  await ecranMois(app, mois);
}

const capitaliser = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
