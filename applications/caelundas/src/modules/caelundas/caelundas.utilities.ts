/**
 * Strongly-typed wrapper around `Object.keys()` that preserves the key union type.
 */
export function typedObjectKeys<T extends object>(object: T): (keyof T)[] {
  // type-coverage:ignore-next-line
  return Object.keys(object) as (keyof T)[];
}
