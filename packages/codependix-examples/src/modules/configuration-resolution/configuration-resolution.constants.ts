// ♟️ Constants

/** Path segment every configuration fixture sits under, inside `fixtures/`. */
export const CONFIGURATION_FIXTURES_SEGMENT = "configuration";

/** Fixture carrying both a TypeScript and a JSON configuration file. */
export const PRECEDENCE_FIXTURE = "precedence";

/** Fixture whose configuration sits above a nested project's `package.json`. */
export const NESTED_FIXTURE = "nested";

/** Fixture whose configuration carries a field codependix does not know. */
export const UNKNOWN_FIELDS_FIXTURE = "unknown-fields";

/** Fixture directory holding no configuration file at all. */
export const ABSENT_FIXTURE = "absent";

/** Fixture whose configuration file has an extension the loader cannot read. */
export const UNSUPPORTED_TYPE_FIXTURE = "unsupported-type";

/** Nested project the upward search has to reach past to find a configuration. */
export const NESTED_PROJECT_SEGMENT = "packages/atlas-service";

/** Configuration file name that does not exist, for the explicit-path refusal. */
export const MISSING_CONFIGURATION_FILE = "codependix.config.missing.ts";

/**
 * The refusals a configuration file can be rejected with.
 *
 * Each is a real configuration object handed to `codependixConfigurationSchema`,
 * so the message rendered into the example is the message a reader would get.
 */
export const REFUSED_CONFIGURATIONS = [
  {
    configuration: { defaults: { nx: { target: "both" } } },
    title: "A `both` target with no `json` destination",
  },
  {
    configuration: { defaults: { nx: { target: "json" } } },
    title: "A `json` target with no `json` destination",
  },
  {
    configuration: {
      defaults: { nx: { json: { path: "graph.json" }, target: "both" } },
    },
    title: "A `both` target with no `markdown` destination",
  },
  {
    configuration: { defaults: { nx: { target: "markdown" } } },
    title: "A `markdown` target with no `markdown` destination",
  },
  {
    configuration: {
      defaults: { nx: { markdown: {}, target: "markdown" } },
    },
    title: "A `markdown` destination naming neither an anchor nor a path",
  },
] as const;
