import { t } from '../i18n';
import { h } from './dom';

/** Boîte de confirmation (pas de confirm() : bloquant et peu lisible sur mobile). */
/** Demande une adresse web ; null si annulé. */
export function demanderLien(): Promise<string | null> {
  return new Promise((ok) => {
    const champ = h('input', { class: 'champ', type: 'url', inputMode: 'url', placeholder: t('adresseLien'), autofocus: true });
    const fermer = (r: string | null) => {
      d.close();
      d.remove();
      ok(r);
    };
    const d = h('dialog', { class: 'dialogue' },
      h('form', { method: 'dialog', on: { submit: (e) => { e.preventDefault(); fermer(champ.value.trim() || null); } } },
        h('p', {}, t('adresseLien')),
        champ,
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn', on: { click: () => fermer(null) } }, t('annuler')),
          h('button', { type: 'submit', class: 'btn principal' }, t('ajouter')),
        ),
      ),
    );
    d.addEventListener('cancel', () => fermer(null));
    document.body.append(d);
    d.showModal();
  });
}

export function confirmer(message: string, libelleOk: string): Promise<boolean> {
  return new Promise((ok) => {
    const fermer = (r: boolean) => {
      d.close();
      d.remove();
      ok(r);
    };
    const d = h('dialog', { class: 'dialogue' },
      h('p', {}, message),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', on: { click: () => fermer(false) } }, t('annuler')),
        h('button', { class: 'btn danger', on: { click: () => fermer(true) } }, libelleOk),
      ),
    );
    d.addEventListener('cancel', () => fermer(false));
    document.body.append(d);
    d.showModal();
  });
}
