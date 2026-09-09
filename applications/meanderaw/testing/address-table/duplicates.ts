import { EXPECTED_ADDRESS_COLLISIONS } from "./constants";

import type { AddressedDrawing } from "./types";

// 👯 Duplicates

/**
 * Every address more than one drawing of one family carries, with the
 * drawings that carry it.
 *
 * Per family, because across families a shared address is the point: a
 * `parallel` reading as a `mosaic` tile is a discovery, and folding the two
 * together would report it as a fault.
 */
export const collisionsByFamily = (
  drawings: readonly AddressedDrawing[],
): Map<string, Map<string, string[]>> => {
  const families = new Map<string, Map<string, string[]>>();

  for (const drawing of drawings) {
    const addresses =
      families.get(drawing.family) ?? new Map<string, string[]>();

    families.set(drawing.family, addresses);
    addresses.set(drawing.address, [
      ...(addresses.get(drawing.address) ?? []),
      drawing.path,
    ]);
  }

  return new Map(
    [...families].map(([family, addresses]) => [
      family,
      new Map([...addresses].filter(([, paths]) => paths.length > 1)),
    ]),
  );
};

/**
 * What the corpus's collisions and `EXPECTED_ADDRESS_COLLISIONS` disagree
 * about, read in every direction the census can be wrong in.
 *
 * An **undeclared** collision is duplicate art, or an address too coarse to
 * tell two drawings apart — either way a decision somebody has to make rather
 * than something a rewrite can fix. A **vanished** one is a declaration that
 * has stopped being true, which is what stops the census from silently
 * widening into a blanket permission as the corpus moves. A **miscounted** one
 * is an address that still collides at a multiplicity nobody declared: one
 * more drawing landing on a declared address is the same duplicate art as one
 * landing on an undeclared address, and one fewer is a declaration that has
 * half stopped being true.
 */
export const reconcileCollisions = (
  drawings: readonly AddressedDrawing[],
): { miscounted: string[]; undeclared: string[]; vanished: string[] } => {
  const found = collisionsByFamily(drawings);
  const miscounted: string[] = [];
  const undeclared: string[] = [];
  const vanished: string[] = [];

  for (const [family, addresses] of found) {
    const declared = EXPECTED_ADDRESS_COLLISIONS[family] ?? {};

    for (const [address, paths] of addresses) {
      const expected = declared[address];

      if (expected === undefined) {
        undeclared.push(`${family} ${address}: ${paths.join(", ")}`);
      } else if (expected !== paths.length) {
        miscounted.push(
          `${family} ${address}: ${paths.length} drawings share it, not the declared ${expected} — ${paths.join(", ")}`,
        );
      }
    }
  }

  for (const [family, declared] of Object.entries(
    EXPECTED_ADDRESS_COLLISIONS,
  )) {
    for (const address of Object.keys(declared)) {
      if (!found.get(family)?.has(address)) {
        vanished.push(`${family} ${address}`);
      }
    }
  }

  return { miscounted, undeclared, vanished };
};
