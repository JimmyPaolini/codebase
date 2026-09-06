/**
 * The same generated file, in the project next door that excluded nothing.
 *
 * This project has no `callidescope.config.ts` at all, so nothing excludes
 * this file and it is traced like any other — while its twin in `gated-leaf`
 * is not. Exclusions are a project's own business, and a sibling's glob cannot
 * reach across a project boundary however it is written.
 */
export function listInheritedLimitKeys(): string[] {
  return ["one", "two"];
}
