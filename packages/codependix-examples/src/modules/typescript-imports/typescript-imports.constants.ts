// ♟️ Constants

import type { NonEdgeCase } from "./typescript-imports.types";

/** Path segment every TypeScript fixture sits under, inside `fixtures/`. */
export const TYPESCRIPT_FIXTURES_SEGMENT = "typescript";

/** Fixture exercising every resolution case and every deliberate non-case. */
export const RESOLUTION_FIXTURE = "resolution";

/** Fixture whose `tsconfig.json` the compiler refuses to parse. */
export const BROKEN_FIXTURE = "broken";

/**
 * The specifiers the resolution fixture declares that draw no edge.
 *
 * Named here so the guide can list them without a reader opening every fixture
 * file, and so a resolver change that started drawing one of them fails the
 * example rather than quietly widening what the graph claims.
 */
export const NON_EDGE_CASES: NonEdgeCase[] = [
  {
    file: "src/re-exported.ts",
    reason: "an ExportDeclaration, not an ImportDeclaration",
    statement: 'export * from "./settings.js"',
  },
  {
    file: "src/deferred.ts",
    reason: "a call expression, not a declaration",
    statement: 'import("./settings.js")',
  },
  {
    file: "src/required.ts",
    reason: "a call expression, not a declaration",
    statement: 'require("./settings.js")',
  },
  {
    file: "src/external.ts",
    reason: "resolves outside the project",
    statement: 'import ts from "typescript"',
  },
];
