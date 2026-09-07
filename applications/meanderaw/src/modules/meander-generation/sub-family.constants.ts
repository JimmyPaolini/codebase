// ♟️ Constants

import { SUPPORTED_SUB_FAMILIES } from "../mosaic-tile/mosaic-tile.constants";

import type { MeanderType } from "./meander-generation.types";

// 🎯 A sub-family names one member of a family's unit space, so everything
// about naming one — the vocabulary each family admits, and the four ways
// naming one can be refused — sits here rather than in
// `meander-generation.constants.ts`. That file holds what every drawing has
// (row and repeat bounds, modifier compatibility) and was over its line
// limit; these five names are the one group in it that reads as a subject
// of its own.

/**
 * Which sub-family names each type admits. A sub-family is a named
 * predicate over a family's unit space, so a family whose unit space is
 * latent rather than materialized has none to admit — which today is every
 * family but `mosaic`. `MeanderGenerationService.generate` rejects any
 * `parameters.subFamily` not listed for `parameters.type`.
 */
export const SUB_FAMILIES: Record<MeanderType, readonly string[]> = {
  boxes: [],
  branch: [],
  chain: [],
  cross: [],
  mosaic: SUPPORTED_SUB_FAMILIES,
  negative: [],
  parallel: [],
  snake: [],
  swirl: [],
  whirl: [],
};

// 🚨 Errors

/**
 * Thrown when a sub-family and a modifier are requested together. Both
 * decide which repeat unit is drawn — a modifier by constructing one, a
 * sub-family by naming a region of the units the family already generates —
 * so honoring one would mean silently discarding the other.
 */
export class ConflictingSubFamilyError extends Error {
  constructor(subFamily: string, modifierName: string) {
    super(
      `sub-family "${subFamily}" cannot be combined with modifier "${modifierName}"; a modifier constructs a repeat unit and a sub-family names one, so only one of them may choose it`,
    );
    this.name = "ConflictingSubFamilyError";
  }
}

/** Thrown when a sub-family isn't listed as one of the requested type's own, which for every type but `mosaic` means it has none. */
export class InvalidSubFamilyError extends Error {
  constructor(
    subFamily: string,
    type: string,
    subFamilyNames: readonly string[],
  ) {
    super(
      `sub-family "${subFamily}" is not a sub-family of type "${type}"; sub-families: ${
        subFamilyNames.length > 0 ? subFamilyNames.join(", ") : "none"
      }`,
    );
    this.name = "InvalidSubFamilyError";
  }
}

/**
 * Thrown when a `TILE_DRAWN_TYPES` family is asked for with no `subFamily`
 * to say which member of its space to draw. A refusal rather than a
 * default, and the default was tried: `mosaic` used to draw an unbroken bar
 * when nothing else was named, which is the `bars` sub-family under a
 * second name.
 */
export class MissingSubFamilyError extends Error {
  constructor(type: string, subFamilyNames: readonly string[]) {
    super(
      `type "${type}" draws no repeat unit of its own; name a member of its unit space with a sub-family: ${subFamilyNames.join(", ")}`,
    );
    this.name = "MissingSubFamilyError";
  }
}

/**
 * Thrown when a sub-family names no tile at the requested row count. Only
 * `diamond` can hit this: its vertical dashes cover the bar's interior
 * levels in pairs, so an interior with an odd number of them cannot be
 * covered by vertical dashes alone.
 */
export class UnavailableSubFamilyError extends Error {
  constructor(subFamily: string, rows: number) {
    super(`sub-family "${subFamily}" has no tile at ${rows} rows`);
    this.name = "UnavailableSubFamilyError";
  }
}
