// ♟️ Constants

/**
 * Directory, relative to this project's root, every rendered example lands in.
 *
 * Committed rather than gitignored: the whole point of the package is that a
 * reader sees the diagram, the JSON shape, and the refusal without running
 * anything first.
 */
export const EXAMPLES_OUTPUT_DIRECTORY = "output";

/** Subdirectory of `output/` the committed JSON exports land in. */
export const EXAMPLES_JSON_DIRECTORY = "json";

/**
 * Prefix every anchor name used anywhere in this package carries.
 *
 * `codebase:codependix:write` claims the anchors named in
 * `configuration/codependix.config.ts` — `codependix-nx`, `codependix-nestjs`,
 * `codependix-imports`, `codependix-imports-python`, and
 * `codependix-workspace` — in every `README.md` in the workspace. An example
 * that printed one of those names inside a Markdown file here would be an
 * anchor the real run could claim and overwrite, so every example uses a name
 * outside that set, and writes into `output/` rather than into a `README.md`.
 */
export const EXAMPLE_ANCHOR_PREFIX = "example";

/** Builds an anchor name no real codependix run will ever claim. */
export const buildExampleAnchor = (suffix: string): string =>
  `${EXAMPLE_ANCHOR_PREFIX}-${suffix}`;

/** Usage message shown when the command line names neither or both modes. */
export const USAGE_MESSAGE = "💡 Usage: examples --check (or examples --write)";
