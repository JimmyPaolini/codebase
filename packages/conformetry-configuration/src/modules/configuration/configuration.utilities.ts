// 🛠️ Utilities

import path from "node:path";

import type { z } from "zod";

/**
 * Fails when two generators would answer to the same thing.
 *
 * A host resolves `<name-or-alias>` by taking the *first* generator whose name
 * or alias matches, so a collision does not error where it is used — it
 * silently shadows, and the losing generator becomes unreachable while still
 * appearing in the configuration. Two generators sharing a template collide
 * differently: validation then finds candidates that fit both equally and
 * reports them as matching nothing.
 *
 * Reported through Zod rather than thrown, so every collision in a
 * configuration surfaces in one pass and each one carries the index of the
 * entry it came from.
 *
 * A generator is described structurally rather than taken as
 * `ParsedGeneratorEntry`, which is inferred from the very schema these checks
 * are attached to: naming it would make the schema depend on this file and
 * this file on the schema.
 */
export function assertNoCollisions(
  definitions: {
    readonly aliases?: string[] | undefined;
    readonly name: string;
    readonly templatePath: string;
  }[],
  context: z.RefinementCtx,
): void {
  const issues = [
    // Names and aliases share one namespace because a host searches both at
    // once: an alias equal to another generator's name is as ambiguous as two
    // equal names.
    ...findDuplicates({
      definitions,
      describe: (key, owners) =>
        `"${key}" is the name or alias of more than one generator: ${owners.join(", ")}. A host resolves the first match, leaving the others unreachable.`,
      // A generator listing its own name as an alias is redundant rather than
      // ambiguous, so it counts once.
      keysOf: (definition) => [
        ...new Set([definition.name, ...(definition.aliases ?? [])]),
      ],
    }),
    ...findDuplicates({
      definitions,
      describe: (key, owners) =>
        `${key} is the template of more than one generator: ${owners.join(", ")}. Validation cannot tell which one a matching instance belongs to.`,
      keysOf: (definition) => [definition.templatePath],
    }),
    ...findUnusableHandles(definitions),
  ];

  for (const issue of issues) {
    context.addIssue({
      code: "custom",
      message: issue.message,
      path: issue.path,
    });
  }
}

/** Reports every key more than one generator claims. */
function findDuplicates<Definition extends { name: string }>(args: {
  definitions: Definition[];
  describe: (key: string, owners: string[]) => string;
  keysOf: (definition: Definition) => string[];
}): { message: string; path: (number | string)[] }[] {
  const ownersByKey = new Map<string, { lastIndex: number; names: string[] }>();

  for (const [index, definition] of args.definitions.entries()) {
    for (const key of args.keysOf(definition)) {
      const owner = ownersByKey.get(key);

      ownersByKey.set(key, {
        // The later entry is the one to change: the first is what a host will
        // have resolved to all along.
        lastIndex: index,
        names: [...(owner?.names ?? []), definition.name],
      });
    }
  }

  return [...ownersByKey.entries()]
    .filter(([, owner]) => owner.names.length > 1)
    .map(([key, owner]) => ({
      message: args.describe(key, owner.names),
      path: [owner.lastIndex],
    }));
}

/** Reports names and aliases that could not be addressed or emitted. */
function findUnusableHandles(
  definitions: {
    readonly aliases?: string[] | undefined;
    readonly name: string;
  }[],
): { message: string; path: (number | string)[] }[] {
  return definitions.flatMap((definition, index) => {
    return [definition.name, ...(definition.aliases ?? [])]
      .filter((handle) => handle === "" || handle !== path.basename(handle))
      .map((handle) => ({
        message: `Generator ${definition.name} uses "${handle}" as a name or alias. A generator is addressed by that text and emitted to a file named after it, so it cannot contain a path separator.`,
        path: [index],
      }));
  });
}
