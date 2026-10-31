import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { isoLocal, moisDe } from '../domaine/mois';
import type { Element, EtatMois } from '../domaine/types';

export type NouvelElement = Pick<Element, 'source' | 'note' | 'pdf' | 'image' | 'original' | 'coins' | 'filtre'>;

interface Schema extends DBSchema {
  elements: { key: string; value: Element; indexes: { mois: string } };
  mois: { key: string; value: EtatMois };
}

let connexion: Promise<IDBPDatabase<Schema>> | null = null;

function db(): Promise<IDBPDatabase<Schema>> {
  connexion ??= openDB<Schema>('ndf_sender', 1, {
    upgrade(base) {
      base.createObjectStore('elements', { keyPath: 'id' }).createIndex('mois', 'mois');
      base.createObjectStore('mois', { keyPath: 'mois' });
    },
  });
  return connexion;
}

/** Ferme la connexion en cours (utile aux tests qui remplacent indexedDB). */
export async function fermerDb(): Promise<void> {
  if (connexion) (await connexion).close();
  connexion = null;
}

export async function ajouterElement(e: NouvelElement, maintenant = new Date()): Promise<Element> {
  const tx = (await db()).transaction(['elements', 'mois'], 'readwrite');
  const mois = moisDe(maintenant);
  const etat = (await tx.objectStore('mois').get(mois)) ?? { mois, dernierNumero: 0 };
  etat.dernierNumero += 1;
  const element: Element = { ...e, id: crypto.randomUUID(), mois, numero: etat.dernierNumero, ajouteLe: isoLocal(maintenant) };
  await Promise.all([tx.objectStore('mois').put(etat), tx.objectStore('elements').put(element), tx.done]);
  return element;
}

export async function lireElement(id: string): Promise<Element | undefined> {
  return (await db()).get('elements', id);
}

/** Éléments du mois triés par numéro. */
export async function elementsDuMois(mois: string): Promise<Element[]> {
  const liste = await (await db()).getAllFromIndex('elements', 'mois', mois);
  return liste.sort((a, b) => a.numero - b.numero);
}

/** Mois contenant au moins un élément, du plus récent au plus ancien. */
export async function moisAvecElements(): Promise<string[]> {
  const mois: string[] = [];
  let curseur = await (await db()).transaction('elements').store.index('mois').openKeyCursor(null, 'prevunique');
  while (curseur) {
    mois.push(curseur.key);
    curseur = await curseur.continue();
  }
  return mois;
}

export async function etatMois(mois: string): Promise<EtatMois | undefined> {
  return (await db()).get('mois', mois);
}

export async function modifierElement(
  id: string,
  modif: Partial<Pick<Element, 'note' | 'pdf' | 'image' | 'coins' | 'filtre'>>,
): Promise<Element> {
  const tx = (await db()).transaction('elements', 'readwrite');
  const actuel = await tx.store.get(id);
  if (!actuel) throw new Error(`Élément introuvable : ${id}`);
  const element = { ...actuel, ...modif };
  await Promise.all([tx.store.put(element), tx.done]);
  return element;
}

/** Change le mois d'un élément : il reçoit le numéro suivant du mois cible et redevient « non envoyé ». */
export async function deplacerVersMois(id: string, mois: string): Promise<Element> {
  const tx = (await db()).transaction(['elements', 'mois'], 'readwrite');
  const actuel = await tx.objectStore('elements').get(id);
  if (!actuel) throw new Error(`Élément introuvable : ${id}`);
  if (actuel.mois === mois) {
    await tx.done;
    return actuel;
  }
  const etat = (await tx.objectStore('mois').get(mois)) ?? { mois, dernierNumero: 0 };
  etat.dernierNumero += 1;
  const element: Element = { ...actuel, mois, numero: etat.dernierNumero, envoyeLe: undefined };
  await Promise.all([tx.objectStore('mois').put(etat), tx.objectStore('elements').put(element), tx.done]);
  return element;
}

export async function supprimerElement(id: string): Promise<void> {
  await (await db()).delete('elements', id);
}

/** Supprime les éléments du mois et son état (compteur, date d'envoi). */
export async function viderMois(mois: string): Promise<void> {
  const tx = (await db()).transaction(['elements', 'mois'], 'readwrite');
  const ids = await tx.objectStore('elements').index('mois').getAllKeys(mois);
  await Promise.all([...ids.map((id) => tx.objectStore('elements').delete(id)), tx.objectStore('mois').delete(mois), tx.done]);
}

export async function marquerEnvoye(mois: string, quand: Date): Promise<void> {
  const iso = isoLocal(quand);
  const tx = (await db()).transaction(['elements', 'mois'], 'readwrite');
  const etat = (await tx.objectStore('mois').get(mois)) ?? { mois, dernierNumero: 0 };
  const elements = await tx.objectStore('elements').index('mois').getAll(mois);
  await Promise.all([
    tx.objectStore('mois').put({ ...etat, envoyeLe: iso }),
    ...elements.map((e) => tx.objectStore('elements').put({ ...e, envoyeLe: iso })),
    tx.done,
  ]);
}

/** Demande au navigateur de ne pas effacer les données en cas de manque d'espace. */
export async function demanderPersistance(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
