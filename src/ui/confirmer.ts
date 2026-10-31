import { t } from '../i18n';
import { h } from './dom';

/** Boîte de confirmation (pas de confirm() : bloquant et peu lisible sur mobile). */
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
