/**
 * Type-level replacement for `clsx`'s `ClassValue` — vendored to avoid a runtime dependency on
 * `clsx` (the Spartan brain code only imports the *type*, never the function). Compatible shape.
 */
export type ClassValue =
  | ClassValue[]
  | Record<string, boolean | undefined | null>
  | string
  | number
  | bigint
  | null
  | boolean
  | undefined;
