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

/** Borne supérieure (incluse) de la plage basse des caractères de contrôle ASCII (unit separator). */
const CONTROL_RANGE_LOW_MAX = 31;

/** Code du caractère de contrôle DEL. */
const CONTROL_CHAR_DEL = 127;

/**
 * Détecte les caractères de contrôle ASCII (codes 0 à {@link CONTROL_RANGE_LOW_MAX}, et DEL).
 * Les navigateurs suppriment tab/CR/LF des URLs, ce qui permettrait de
 * transformer `/&#9;/evil.com` en `//evil.com` après nettoyage navigateur.
 *
 * Implémenté via `Array.prototype.some` (plutôt qu'une boucle `for` indexée) :
 * un compteur de boucle manuel est une surface de mutation inutile pour les
 * outils de mutation testing (un mutateur `i++` → `i--` transforme la boucle
 * en boucle infinie pour toute chaîne sans caractère de contrôle — observé en
 * CI : mutant tué uniquement par la limite de garde de Stryker après ~39 000
 * itérations, alourdissant significativement le temps total du job).
 *
 * @param value chaîne à inspecter
 * @returns `true` si un caractère de contrôle est présent
 */
function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code <= CONTROL_RANGE_LOW_MAX || code === CONTROL_CHAR_DEL;
  });
}

/**
 * Décode `value` autant de fois que nécessaire (jusqu'à {@link MAX_DECODE_PASSES}
 * passes) et retourne chaque forme intermédiaire rencontrée — défense en
 * profondeur contre le double encodage (`%252F` → `%2F` → `/`).
 *
 * Bornée par la croissance de la liste retournée plutôt que par un compteur
 * de boucle manuel (`for (...; pass++)`) : un compteur est une surface de
 * mutation inutile pour les outils de mutation testing (un mutateur `++` →
 * `--` peut transformer la condition de sortie en boucle infinie). Ici, la
 * seule façon de continuer est d'ajouter une valeur à `candidates`, ce qui
 * fait mécaniquement progresser la condition d'arrêt.
 *
 * @param value valeur brute à décoder
 * @returns `null` si un décodage échoue (encodage malformé) ; sinon la liste
 *          `[value, ...formes décodées]`
 */
function decodeCandidates(value: string): string[] | null {
  const candidates: string[] = [value];
  let current = value;
  while (candidates.length <= MAX_DECODE_PASSES) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      // Encodage malformé (%zz…) → valeur suspecte, rejet.
      return null;
    }
    if (decoded === current) {
      break;
    }
    candidates.push(decoded);
    current = decoded;
  }
  return candidates;
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
  const candidates = decodeCandidates(value);
  return candidates !== null && candidates.every(isSafeCandidate);
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
