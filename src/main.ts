import './style.css';
import { moisDe } from './domaine/mois';
import { t } from './i18n';
import { prechargerOpenCV } from './scan/opencv';
import { demanderPersistance } from './stockage/db';
import { toast } from './ui/dom';
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

async function rendu(r: Route, actif: () => boolean): Promise<void> {
  try {
    if (r.ecran === 'mois') await ecranMois(app, r.mois, actif);
    else if (r.ecran === 'ajout') await ecranAjout(app, r.source, r.fichier, r.idExistant, actif);
    else await ecranDetail(app, r.id, actif);
  } catch (e) {
    toast(t('erreur', { msg: (e as Error).message }));
  }
}

async function demarrer(): Promise<void> {
  if (!(await demanderPersistance())) signalerPersistanceRefusee();
  // Ouverture depuis le menu Partager d'Android : le service worker a rangé les fichiers.
  // Pas d'écran du mois dans ce cas : il pourrait s'afficher par-dessus l'écran d'ajout.
  const partage = new URLSearchParams(location.search).has('partage');
  demarrerRouteur(rendu, () => moisDe(new Date()), !partage);
  if (partage) {
    const lien = new URLSearchParams(location.search).get('partage') === 'lien';
    history.replaceState(null, '', location.pathname + location.hash);
    if (lien) {
      naviguer({ ecran: 'mois', mois: moisDe(new Date()) }, true);
      toast(t('lienRecu'), 9000);
    } else await traiterPartages(await lireFichiersPartages());
  }
  prechargerOpenCV();
}

void demarrer();

// Développement uniquement : piloter l'appli depuis la console (retiré du build de production).
if (import.meta.env.DEV) Object.assign(window, { ndf: { naviguer, traiterPartages } });
