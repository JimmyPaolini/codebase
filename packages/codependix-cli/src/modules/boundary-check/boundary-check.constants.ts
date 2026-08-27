// ♟️ Constants

import type { CodependixGraphType } from "@codependix/configuration";

/**
 * The order the four graph levels are judged in.
 *
 * Cheapest first, and it is not a small difference: the Nx level reads a graph
 * the run already holds, while the NestJS level boots every container in
 * preview mode and the TypeScript level builds a `ts.Program` per project. A
 * workspace declaring only Nx rules never pays for either, because a level
 * with no rules is not built at all.
 *
 * Written as a list rather than left implicit in the order of four `if`
 * blocks, so the order a report comes out in is stated once, in the place a
 * reader looks for it.
 */
export const BOUNDARY_LEVEL_ORDER = [
  "nx",
  "nestjs",
  "imports",
  "pythonImports",
] as const satisfies readonly CodependixGraphType[];
