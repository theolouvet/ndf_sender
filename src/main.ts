import './style.css';
import { moisDe } from './domaine/mois';
import { t } from './i18n';
import { prechargerOpenCV } from './scan/opencv';
import { demanderPersistance } from './stockage/db';
import { libererUrls, toast } from './ui/dom';
import { lireFichiersPartages } from './partage/reception';
import { ecranAjout, traiterPartages } from './ui/ecran-ajout';
import { ecranDetail } from './ui/ecran-detail';
import { ecranMois, signalerPersistanceRefusee } from './ui/ecran-mois';
import { demarrerRouteur, naviguer, type Route } from './ui/routeur';

// En développement, le cache du service worker servirait des modules périmés.
if ('serviceWorker' in navigator && import.meta.env.PROD) void navigator.serviceWorker.register('./sw.js');
document.documentElement.lang = t.langue;
document.title = t('titre');

const app = document.querySelector<HTMLElement>('#app')!;

async function rendu(r: Route): Promise<void> {
  libererUrls();
  scrollTo(0, 0);
  try {
    if (r.ecran === 'mois') await ecranMois(app, r.mois);
    else if (r.ecran === 'ajout') await ecranAjout(app, r.source, r.fichier, r.idExistant);
    else await ecranDetail(app, r.id);
  } catch (e) {
    toast(t('erreur', { msg: (e as Error).message }));
  }
}

async function demarrer(): Promise<void> {
  if (!(await demanderPersistance())) signalerPersistanceRefusee();
  demarrerRouteur(rendu, () => moisDe(new Date()));
  // Ouverture depuis le menu Partager d'Android : le service worker a rangé les fichiers.
  if (new URLSearchParams(location.search).has('partage')) {
    history.replaceState(null, '', location.pathname + location.hash);
    traiterPartages(await lireFichiersPartages());
  }
  prechargerOpenCV();
}

void demarrer();

// Développement uniquement : piloter l'appli depuis la console (retiré du build de production).
if (import.meta.env.DEV) Object.assign(window, { ndf: { naviguer, traiterPartages } });
