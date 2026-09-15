// ♟️ Constants

import type { CodometerStatisticGroup } from "./statistics.types";
import type {
  CodometerSymbolKind,
  CodometerSymbolModifier,
} from "./symbols.types";

/**
 * Badge groups a configured counter may be rendered into.
 *
 * Accepted by name rather than as free text so a misspelled group fails the
 * configuration instead of silently rendering the badge nowhere.
 */
export const CODOMETER_STATISTIC_GROUPS = [
  "conventions",
  "css",
  "hcl",
  "json",
  "jupyter",
  "markdown",
  "python",
  "repository",
  "shell",
  "sql",
  "toml",
  "typescript",
  "yaml",
] as const satisfies readonly CodometerStatisticGroup[];

/** Declaration kinds a symbol counter, or a `comment` selector, may ask for. */
export const CODOMETER_SYMBOL_KINDS = [
  "class",
  "enum",
  "function",
  "getter",
  "interface",
  "method",
  "property",
  "setter",
] as const satisfies readonly CodometerSymbolKind[];

/** Modifiers a symbol counter may require of a declaration. */
export const CODOMETER_SYMBOL_MODIFIERS = [
  "abstract",
  "async",
  "export",
  "override",
  "private",
  "protected",
  "public",
  "readonly",
  "static",
] as const satisfies readonly CodometerSymbolModifier[];
