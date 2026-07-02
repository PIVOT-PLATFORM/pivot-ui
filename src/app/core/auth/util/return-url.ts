/**
 * Validation locale de `returnUrl` pour la redirection post-expiration de session (US01.1.5).
 *
 * Protection open redirect : seule une URL **relative interne** est acceptée —
 * elle doit commencer par `/` mais pas par `//` (protocol-relative URL) ni `/\`
 * (variante backslash interprétée comme `//` par certains navigateurs).
 *
 * NOTE déduplication : l'US01.1.4 (redirection post-login) introduit un validateur
 * returnUrl réutilisable. Cette implémentation locale minimale sera fusionnée avec
 * cet utilitaire au merge des deux US (même contrat : relative interne uniquement).
 */

/**
 * Valide et normalise une URL de retour candidate.
 *
 * @param url l'URL courante au moment de l'expiration (ex. `router.url`)
 * @returns l'URL si c'est une URL relative interne sûre et utile, sinon `null`
 *          (`null` = pas de paramètre `returnUrl` ajouté à la redirection /login)
 */
export function sanitizeReturnUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  // Relative interne uniquement : commence par '/', mais ni '//' ni '/\' (open redirect).
  if (!url.startsWith('/') || url.startsWith('//') || url.startsWith('/\\')) {
    return null;
  }
  // Inutile de revenir sur la racine ou sur les pages d'auth après reconnexion.
  if (url === '/' || url === '/auth' || url.startsWith('/auth/') || url.startsWith('/auth?')) {
    return null;
  }
  return url;
}
