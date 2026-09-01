import path from "node:path";

import { codependixConfigurationSchema } from "@codependix/configuration";
import { z } from "zod";

import { configurationService } from "./builders";
import { fence, fenceJson, table } from "./document";
import { resolveExample } from "./paths";

import type { ExampleDocument, ExampleSection } from "./types";
import type {
  CodependixGraphType,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";

// ♟️ Constants

/** Path segment every configuration example sits under, inside `examples/`. */
const CONFIGURATION_SEGMENT = "configuration-resolution";

/** Path segment the refusal examples sit under, inside `examples/`. */
const REFUSALS_SEGMENT = "refusals";

/** Workspace carrying both a TypeScript and a JSON configuration file. */
const PRECEDENCE = "precedence";

/** Workspace whose configuration sits above a nested project's `package.json`. */
const NESTED = "nested";

/** Workspace whose configuration carries a field codependix does not know. */
const UNKNOWN_FIELDS = "unknown-fields";

/** Directory holding no configuration file at all. */
const ABSENT = "absent";

/** Configuration file with an extension the loader cannot read. */
const UNSUPPORTED_TYPE = "unsupported-type";

/** Nested project the upward search has to reach past. */
const NESTED_PROJECT_SEGMENT = "packages/atlas-service";

/** Configuration file name that does not exist, for the explicit-path refusal. */
const MISSING_CONFIGURATION_FILE = "codependix.config.missing.ts";

/**
 * The refusals a configuration file can be rejected with.
 *
 * Each is a real configuration object handed to `codependixConfigurationSchema`,
 * so the message rendered into the example is the message a reader would get.
 */
const REFUSED_CONFIGURATIONS = [
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
    configuration: { defaults: { nx: { markdown: {}, target: "markdown" } } },
    title: "A `markdown` destination naming neither an anchor nor a path",
  },
] as const;

// ⚙️ Resolution

/** Builds every configuration example document. */
export async function buildConfigurationDocuments(): Promise<
  ExampleDocument[]
> {
  return [
    {
      id: "configuration-resolution",
      jsonExports: [],
      sections: [
        ...buildResolutionSections(),
        ...(await buildDiscoverySections()),
      ],
      summary:
        "Every configuration field, resolved by the real loader — including the two a reader is most likely to assume wrongly.",
      title: "Configuration resolution, field by field",
    },
    {
      id: "refusals",
      jsonExports: [],
      sections: [
        ...buildParseRefusalSections(),
        ...(await buildPathRefusalSections()),
      ],
      summary:
        "Every way codependix refuses a configuration or a command line, each with the reproduction that produces it — because a refusal is where a reader gets stuck.",
      title: "Every refusal, with its reproduction",
    },
  ];
}

/** Builds one section per configuration the schema refuses. */
export function buildParseRefusalSections(): ExampleSection[] {
  return REFUSED_CONFIGURATIONS.map((refusal) => ({
    body: fence(describeParseRefusal(refusal.configuration)),
    heading: refusal.title,
    note: `Reproduced by \`codependixConfigurationSchema.parse(${JSON.stringify(refusal.configuration)})\`.`,
  }));
}

/** Describes where a resolved output would be written. */
export function describeDestination(resolved: {
  json: undefined | { path: string };
  markdown: undefined | { anchor: string | undefined; path: string };
}): string {
  const parts: string[] = [];

  if (resolved.json !== undefined) parts.push(`json \`${resolved.json.path}\``);
  if (resolved.markdown !== undefined) {
    const anchor =
      resolved.markdown.anchor === undefined
        ? ""
        : ` anchor \`${resolved.markdown.anchor}\``;

    parts.push(`markdown \`${resolved.markdown.path}\`${anchor}`);
  }

  return parts.length === 0 ? "_none_" : parts.join(", ");
}

/** Describes a raised value, whether or not it was an `Error`. */
export function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

/** Lists a raised validation error's messages, one per line. */
export function describeIssues(error: unknown): string {
  return error instanceof z.ZodError
    ? error.issues.map((issue) => issue.message).join("\n")
    : describeError(error);
}

/** Loads a configuration by naming its path explicitly, reporting a refusal. */
export async function describeLoadRefusal(
  relativePath: string,
): Promise<string> {
  try {
    await configurationService.loadConfiguration({
      configurationPath: resolveExample(REFUSALS_SEGMENT, relativePath),
    });
  } catch (error) {
    return redactPath(describeError(error));
  }

  /* v8 ignore next -- both configurations named here are refused */
  return "loaded";
}

/** Renders one refusal as the message a reader would actually be shown. */
export function describeParseRefusal(configuration: unknown): string {
  try {
    codependixConfigurationSchema.parse(configuration);
  } catch (error) {
    return describeIssues(error);
  }

  /* v8 ignore next -- every configuration in REFUSED_CONFIGURATIONS is refused */
  return "accepted";
}

// 📄 Documents

/** Loads one configuration example by searching upward from its directory. */
export async function loadConfiguration(
  name: string,
): Promise<ResolvedCodependixConfiguration> {
  return configurationService.loadConfiguration({
    searchDirectory: resolveExample(CONFIGURATION_SEGMENT, name),
  });
}

/**
 * Replaces an absolute path with a repository-relative one.
 *
 * A committed example that carried the absolute path of whichever machine
 * rendered it would fail `examples --check` everywhere else.
 */
export function redactPath(message: string): string {
  return message.replaceAll(
    resolveExample(REFUSALS_SEGMENT),
    "<examples>/refusals",
  );
}

/** Builds the sections covering how a configuration file is found and read. */
async function buildDiscoverySections(): Promise<ExampleSection[]> {
  const precedence = await loadConfiguration(PRECEDENCE);
  const nested = await configurationService.loadConfiguration({
    searchDirectory: resolveExample(
      CONFIGURATION_SEGMENT,
      NESTED,
      NESTED_PROJECT_SEGMENT,
    ),
  });
  const absent = await loadConfiguration(ABSENT);
  const unknownFields = await loadConfiguration(UNKNOWN_FIELDS);

  return [
    {
      body: fenceJson(precedence.defaults),
      heading: "A workspace carrying two configuration files",
      note: "`examples/configuration/precedence/` holds both a `codependix.config.ts` and a `codependix.config.json`. `CONFIGURATION_FILE_NAMES` is searched in order, so the TypeScript one wins — the anchor here is the one it declares.",
    },
    {
      body: fenceJson(nested.projects),
      heading: "The upward search reaches past a nested `package.json`",
      note: "The search started inside `packages/atlas-service/`, which carries its own `package.json`, and still found the configuration at the workspace root — the root every path in that configuration was written relative to.",
    },
    {
      body: fenceJson(
        configurationService.resolveForProject({
          configuration: absent,
          graphType: "nx",
          projectName: "atlas-service",
        }),
      ),
      heading: "No configuration file at all",
      note: 'A workspace that never wrote one resolves every graph to `target: "none"` and produces nothing, rather than being told to write one. The absence of an unnamed configuration file is legal.',
    },
    {
      body: fenceJson(unknownFields.defaults),
      heading: "An unknown field is stripped, not rejected",
      note: "The configuration declares a `graphqlSchemas` field no codependix has an opinion about. Zod strips unknown keys, so a configuration written for a newer codependix still loads under an older one.",
    },
  ];
}

/** Builds the two refusals that come from the configuration path itself. */
async function buildPathRefusalSections(): Promise<ExampleSection[]> {
  return [
    {
      body: fence(await describeLoadRefusal(MISSING_CONFIGURATION_FILE)),
      heading: "An explicitly named configuration file that does not exist",
      note: "A path named on the command line must exist: a typo in a task runner's arguments should fail rather than quietly resolving every graph to `none`. A path that was _not_ named is searched for, and its absence is legal — see [configuration-resolution](../configuration-resolution).",
    },
    {
      body: fence(
        await describeLoadRefusal(
          path.join(UNSUPPORTED_TYPE, "codependix.config.yaml"),
        ),
      ),
      heading: "A configuration file the loader cannot read",
      note: "`SUPPORTED_CONFIGURATION_EXTENSIONS` covers `.cjs`, `.cts`, `.js`, `.json`, `.mjs`, `.mts`, and `.ts`. Anything else raises `UnknownConfigurationFileTypeError`.",
    },
  ];
}

/** Builds the sections covering `defaults`, overrides, and globs. */
function buildResolutionSections(): ExampleSection[] {
  const configuration = buildSampleConfiguration();

  return [
    {
      body: table(
        ["Project", "Root", "Resolved target", "Destination"],
        [
          resolveRow(configuration, "atlas-service", "packages/atlas-service"),
          resolveRow(configuration, "atlas-core", "packages/atlas-core"),
          resolveRow(
            configuration,
            "atlas-application",
            "applications/atlas-application",
          ),
          resolveRow(configuration, "unrelated", "tools/unrelated"),
        ],
      ),
      heading: "`defaults`, a per-project override, and the two glob lists",
      note: "`atlas-core` names an `nx` override, and it **replaces** the default outright rather than merging into it — its `markdown` destination is gone, not inherited. `atlas-application` matches `exclude`, so it resolves to `none` no matter what either configuration would otherwise say. `unrelated` matches no `include` glob at all.",
    },
    {
      body: renderInclusion(configuration),
      heading: "`include` and `exclude` match a name or a root",
      note: "Both lists are matched against a project's name **and** its workspace-relative root. `atlas-service` matches no glob by name and matches `packages/*` by root, so a caller that knows the root gets a different answer from one that does not — which is why `projectRoot` is optional rather than absent.",
    },
    {
      body: fenceJson(configurationService.resolveForWorkspace(configuration)),
      heading: "The Workspace Graph ignores both glob lists",
      note: "It is exported once for the repository rather than once per project, so it carries no per-project override and `include`/`exclude` never apply to it. `--projects` and `--tags` are the exception: they narrow which projects are **nodes** in it, while its destination is still read from `workspace.nx`.",
    },
    {
      body: "`ConfigurationService.readDefaultExport` unwraps a configuration module's default export **by name**. A configuration field also called `default` would collide with that unwrapping, which is why the field is `defaults`.",
      heading: "Why the field is `defaults` and not `default`",
      note: "The one naming decision in the whole configuration surface that looks arbitrary and is not.",
    },
  ];
}

/** The configuration every resolution row is resolved against. */
function buildSampleConfiguration(): ResolvedCodependixConfiguration {
  return configurationService.resolveConfiguration({
    defaults: {
      nx: { markdown: { anchor: "example-nx" }, target: "markdown" },
    },
    exclude: ["applications/*"],
    include: ["packages/*", "codependix-*"],
    projects: {
      "atlas-core": { nx: { json: { path: "graph.json" }, target: "json" } },
    },
    workspace: {
      nx: { markdown: { anchor: "example-workspace" }, target: "markdown" },
    },
  });
}

/** Renders what `isProjectIncluded` answers, with and without a root. */
function renderInclusion(
  configuration: ResolvedCodependixConfiguration,
): string {
  const answer = (projectName: string, projectRoot?: string): string =>
    String(
      configurationService.isProjectIncluded({
        configuration,
        projectName,
        projectRoot,
      }),
    );

  return fence(
    [
      'include: ["packages/*", "codependix-*"]',
      "",
      `atlas-service, name only                        → ${answer("atlas-service")}`,
      `atlas-service, name and packages/atlas-service  → ${answer("atlas-service", "packages/atlas-service")}`,
      `codependix-examples, name only                  → ${answer("codependix-examples")}`,
    ].join("\n"),
  );
}

/** Resolves one project's `nx` output and describes it as a table row. */
function resolveRow(
  configuration: ResolvedCodependixConfiguration,
  projectName: string,
  projectRoot: string,
): string[] {
  const graphType: CodependixGraphType = "nx";
  const resolved = configurationService.resolveForProject({
    configuration,
    graphType,
    projectName,
    projectRoot,
  });

  return [
    `\`${projectName}\``,
    `\`${projectRoot}\``,
    `\`${resolved.target}\``,
    describeDestination(resolved),
  ];
}
