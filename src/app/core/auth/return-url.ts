/**
 * Validation des URLs de retour post-login — protection open redirect (US01.1.4).
 *
 * Règle de sécurité (Red Team) : un `returnUrl` n'est accepté QUE s'il s'agit
 * d'une URL relative interne :
 * - commence par `/` (jamais d'URL absolue, de scheme `javascript:` ou `https:`) ;
 * - ne commence pas par `//` ni `/\` (URLs protocol-relative → domaine externe) ;
 * - ne contient aucun backslash (les navigateurs normalisent `\` en `/`) ;
 * - ne contient aucun caractère de contrôle (tab/CR/LF sont supprimés par les
 *   navigateurs, ce qui permettrait de contourner les checks précédents) ;
 * - reste sûre après décodage URL (bloque `%2F%2Fevil.com`, `%5C`, double encodage).
 *
 * Toute valeur non conforme est ignorée → redirection vers {@link DEFAULT_POST_LOGIN_URL}.
 *
 * Utilitaire volontairement pur et sans dépendance Angular : réutilisable par
 * tout consommateur (guards, intercepteurs — ex. US01.1.5 logout sur 401).
 */

/** Destination par défaut après login quand aucun `returnUrl` valide n'est fourni. */
export const DEFAULT_POST_LOGIN_URL = '/home';

/** Nombre maximal de passes de décodage URL (bloque le double encodage `%252F`). */
const MAX_DECODE_PASSES = 2;

/**
 * Vérifie qu'une valeur candidate (déjà décodée ou non) est une URL relative interne sûre.
 *
 * @param value valeur à contrôler
 * @returns `true` si la valeur est une URL relative interne sûre
 */
function isSafeCandidate(value: string): boolean {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\') &&
    !value.includes('\\') &&
    !hasControlCharacter(value)
  );
}

/**
 * Détecte les caractères de contrôle ASCII (U+0000–U+001F, U+007F).
 * Les navigateurs suppriment tab/CR/LF des URLs, ce qui permettrait de
 * transformer `/&#9;/evil.com` en `//evil.com` après nettoyage navigateur.
 *
 * @param value chaîne à inspecter
 * @returns `true` si un caractère de contrôle est présent
 */
function hasControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Indique si `value` est un `returnUrl` interne sûr (protection open redirect).
 * La valeur brute ET ses formes décodées (jusqu'à deux passes) doivent toutes
 * satisfaire les règles — défense en profondeur contre l'encodage URL.
 *
 * @param value valeur du `returnUrl` (query param ou session Angular)
 * @returns `true` uniquement pour une URL relative interne sûre
 */
export function isSafeReturnUrl(value: string | null | undefined): boolean {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  const candidates: string[] = [value];
  let current = value;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      // Encodage malformé (%zz…) → valeur suspecte, rejet.
      return false;
    }
    if (decoded === current) {
      break;
    }
    candidates.push(decoded);
    current = decoded;
  }
  return candidates.every(isSafeCandidate);
}

/**
 * Retourne `value` si c'est un `returnUrl` interne sûr, sinon la destination
 * par défaut {@link DEFAULT_POST_LOGIN_URL}.
 *
 * @param value valeur du `returnUrl` à assainir
 * @returns URL interne sûre vers laquelle naviguer après login
 */
export function sanitizeReturnUrl(value: string | null | undefined): string {
  return isSafeReturnUrl(value) ? (value as string) : DEFAULT_POST_LOGIN_URL;
}
