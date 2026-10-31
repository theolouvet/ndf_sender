/** Jetons de rendu : un écran lent ne doit pas écraser l'écran affiché après lui. */
export function creerJetons(): { nouveau(): () => boolean } {
  let dernier = 0;
  return {
    nouveau() {
      const moi = ++dernier;
      return () => moi === dernier;
    },
  };
}

/** Actions à terminer avant de quitter l'écran courant (ex. enregistrer une note en cours de saisie). */
let departs: (() => Promise<void>)[] = [];

export function enregistrerDepart(f: () => Promise<void>): void {
  departs.push(f);
}

export async function executerDeparts(): Promise<void> {
  const aFaire = departs;
  departs = [];
  await Promise.all(aFaire.map((f) => f().catch(() => {})));
}
