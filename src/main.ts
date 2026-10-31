import './style.css';
import { moisDe } from './domaine/mois';
import { t } from './i18n';
import { prechargerOpenCV } from './scan/opencv';
import { demanderPersistance } from './stockage/db';
import { libererUrls, toast } from './ui/dom';
import { ecranMois, signalerPersistanceRefusee } from './ui/ecran-mois';
import { demarrerRouteur, type Route } from './ui/routeur';

if ('serviceWorker' in navigator) void navigator.serviceWorker.register('./sw.js');
document.documentElement.lang = t.langue;
document.title = t('titre');

const app = document.querySelector<HTMLElement>('#app')!;

async function rendu(r: Route): Promise<void> {
  libererUrls();
  scrollTo(0, 0);
  try {
    if (r.ecran === 'mois') await ecranMois(app, r.mois);
  } catch (e) {
    toast(t('erreur', { msg: (e as Error).message }));
  }
}

async function demarrer(): Promise<void> {
  if (location.search.includes('debug-scan')) {
    (await import('./scan/debug')).pageDebug(app);
    return;
  }
  if (!(await demanderPersistance())) signalerPersistanceRefusee();
  demarrerRouteur(rendu, () => moisDe(new Date()));
  prechargerOpenCV();
}

void demarrer();
