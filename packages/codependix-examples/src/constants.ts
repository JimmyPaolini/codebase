import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({});

/**
 * This project's own root, resolved from this file rather than from the
 * process working directory.
 *
 * Every example reads a fixture from disk, and the two callers that run them —
 * the `examples` Nx target and vitest — do not agree on a working directory in
 * every harness. Resolving from `import.meta.url` makes a fixture path mean the
 * same thing either way.
 */
export const PROJECT_ROOT_DIRECTORY = path.resolve(
  fileURLToPath(import.meta.url),
  "../..",
);

/** Directory every fixture this package graphs lives under. */
export const FIXTURES_DIRECTORY = path.join(PROJECT_ROOT_DIRECTORY, "fixtures");

/** Resolves one fixture's absolute root. */
export const resolveFixture = (...segments: string[]): string =>
  path.join(FIXTURES_DIRECTORY, ...segments);
