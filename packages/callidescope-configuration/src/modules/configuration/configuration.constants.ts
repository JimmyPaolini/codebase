// ♟️ Constants

import { z } from "zod";

import type {
  CallidescopeConfiguration,
  RenderMarkdownOutput,
  WriteMarkdownOutput,
} from "./configuration.types";

/**
 * Configuration file names, in the order they are searched for.
 *
 * TypeScript comes first because that is the form a repository gets type
 * checking from, and the form every other configuration file in this workspace
 * is written in.
 */
export const CONFIGURATION_FILE_NAMES = [
  "callidescope.config.ts",
  "callidescope.config.mts",
  "callidescope.config.cts",
  "callidescope.config.js",
  "callidescope.config.mjs",
  "callidescope.config.cjs",
  "callidescope.config.json",
  "callidescope.config.jsonc",
] as const;

/** Extensions the configuration loader knows how to read. */
export const SUPPORTED_CONFIGURATION_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".jsonc",
  ".mjs",
  ".mts",
  ".ts",
]);

/**
 * Files that mark a repository root.
 *
 * `package.json` is deliberately absent: every package in a workspace has one,
 * so it would stop the upward walk at the first project rather than the root.
 */
export const REPOSITORY_ROOT_MARKERS = [".git", "pnpm-workspace.yaml"] as const;

/** Directories no repository wants traced, kept out even when unmentioned. */
export const DEFAULT_EXCLUDE_GLOBS = [
  "**/.conformetry/**",
  "**/.nx/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
  "**/output/**",
] as const;

/**
 * Frames allowed on a call stack before it is reported.
 *
 * Six is the issue's own example limit. It counts frames inclusive of the entry
 * point, so a resolver calling a service calling a repository is three.
 */
export const DEFAULT_MAXIMUM_DEPTH = 6;

/** Decorators whose methods a framework invokes, making them stack roots. */
export const DEFAULT_ENTRY_POINT_DECORATORS = [
  "Command",
  "Cron",
  "Delete",
  "Get",
  "Mutation",
  "OnEvent",
  "Option",
  "Patch",
  "Post",
  "Put",
  "Query",
  "ResolveField",
  "SubscribeMessage",
] as const;

/** Spaces used to indent the JSON report. */
export const DEFAULT_JSON_INDENTATION = 2;

/** Every format a run may print, in the order a prompt offers them. */
export const CALLIDESCOPE_OUTPUT_FORMATS = [
  "markdown",
  "mermaid",
  "json",
] as const;

/** What a run prints to standard output when nothing says otherwise. */
export const DEFAULT_OUTPUT_FORMAT = "markdown";

/** Heading the section embedded in a project README is written under. */
export const DEFAULT_PROJECT_README_HEADING = "## 🔭 Callidescope";

/**
 * Heading a whole-run markdown block is written under.
 *
 * First level, because the historical destination for this block is a file of
 * its own that the block is the whole of. A block spliced into a file that
 * already has a title sets `heading` to a deeper level instead.
 */
export const DEFAULT_RUN_HEADING = "# 🔭 Callidescope";

/** Stacks a README section shows before the rest fold into a disclosure. */
export const DEFAULT_PREVIEW_COUNT = 3;

/** Opening anchor of the generated markdown block. */
export const DEFAULT_MARKDOWN_START_MARKER = "<!-- CALL_STACKS_START -->";

/** Closing anchor of the generated markdown block. */
export const DEFAULT_MARKDOWN_END_MARKER = "<!-- CALL_STACKS_END -->";

// 🔒 Project Configuration

/**
 * Writes a list of names as an English sentence fragment.
 *
 * `Intl.ListFormat` rather than a hand-rolled join, because the empty and
 * single-name cases a hand-rolled one has to guard are unreachable here — the
 * list comes from a record with three permitted fields in it — so the guards
 * would be branches no test could ever take.
 */
const FIELD_LIST_FORMAT = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});

/**
 * Every run-level field, and whether a project's own configuration may set it.
 *
 * A record keyed by the interface rather than a list of the forbidden ones,
 * because a list only ever proves that what it names is a field — never that
 * every field is named, which is the direction that fails open. A tenth field
 * added to `CallidescopeConfiguration` fails to compile here until somebody
 * classifies it, instead of silently becoming settable by any project with
 * nothing in the output to say so.
 *
 * Every field marked `forbidden` names where a run reads from, where it writes
 * to, or how it partitions the workspace — decisions one project cannot make
 * differently from the run tracing it. `limits` is permitted whole: both of its
 * two members are a project's own to gate itself against, and a member that is
 * neither of those two is refused by the schema before this check is reached.
 */
export const PROJECT_CONFIGURATION_FIELD_PERMISSIONS = {
  directories: "forbidden",
  entryPoints: "permitted",
  exclude: "permitted",
  excludeCallees: "forbidden",
  excludeFrom: "forbidden",
  limits: "permitted",
  write: "forbidden",
} as const satisfies Record<
  keyof CallidescopeConfiguration,
  "forbidden" | "permitted"
>;

/**
 * The names a project may set, looked up by a field name read off a file.
 *
 * A set of strings rather than the record itself, because the name comes from
 * an authored object rather than from the interface — so a field nothing here
 * classifies is refused rather than waved through, which is the one direction
 * a permission check may be wrong in.
 */
export const PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES = new Set(
  Object.entries(PROJECT_CONFIGURATION_FIELD_PERMISSIONS)
    .filter(([, permission]) => permission === "permitted")
    .map(([field]) => field),
);

/**
 * The fields named in a refusal, so an agent can fix a project configuration
 * without opening the docs.
 *
 * Derived from the permissions above rather than written out, so the sentence
 * a refusal prints cannot come to disagree with the rule that produced it.
 */
export const PROJECT_CONFIGURATION_PERMITTED_FIELDS = FIELD_LIST_FORMAT.format(
  PROJECT_CONFIGURATION_PERMITTED_FIELD_NAMES,
);

/** Raised when a configuration file has an extension nothing can read. */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unknown configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/**
 * Accepts a function-valued option without inspecting its signature.
 *
 * Zod cannot describe a callback's parameters, and parsing one would replace the
 * caller's function with a wrapper. Checking that it is callable is the whole of
 * what validation can honestly assert here.
 */
const callbackSchema = <TCallback>(): z.ZodType<TCallback> =>
  z.custom<TCallback>((value) => typeof value === "function", {
    message: "Expected a function",
  });

/**
 * The two limits a configuration may declare.
 *
 * Strict rather than stripping: a limit this tool no longer has is a fact
 * about the file that wrote it, and silently discarding the key would leave a
 * configuration author believing a number is in force that nothing reads.
 */
const limitsSchema = z
  .strictObject({
    maximumBreadth: z.number().int().positive().optional(),
    maximumDepth: z.number().int().positive().optional(),
  })
  .optional();

const entryPointsSchema = z
  .object({
    addresses: z.array(z.string()).optional(),
    decorators: z.array(z.string()).optional(),
    includeExportedFunctions: z.boolean().optional(),
    includeOrphans: z.boolean().optional(),
    includeTests: z.boolean().optional(),
  })
  .optional();

const projectReadmesSchema = z
  .object({
    endMarker: z.string().optional(),
    heading: z.string().optional(),
    previewCount: z.number().int().nonnegative().optional(),
    startMarker: z.string().optional(),
  })
  .optional();

/**
 * A marker-delimited block in a markdown file.
 *
 * Shared by the `markdown` and `mermaid` destinations: they differ in what
 * goes between the markers, not in how a block is placed or overridden.
 */
const markdownDestinationSchema = z
  .object({
    description: z.string().optional(),
    endMarker: z.string().optional(),
    heading: z.string().optional(),
    path: z.string(),
    render: callbackSchema<RenderMarkdownOutput>().optional(),
    startMarker: z.string().optional(),
    writeBlock: callbackSchema<WriteMarkdownOutput>().optional(),
  })
  .optional();

const writeSchema = z
  .object({
    json: z
      .object({
        indentation: z.number().int().nonnegative().optional(),
        path: z.string(),
      })
      .optional(),
    markdown: markdownDestinationSchema,
    mermaid: markdownDestinationSchema,
    projectReadmes: projectReadmesSchema,
  })
  .optional();

/**
 * Validates the shape of a callidescope configuration file.
 *
 * `ignoreCallees` and `output` are named here as `z.never()` rather than left
 * out: a field this schema has never heard of is silently stripped, which is
 * the right behavior for a future option this version of the tool does not
 * know about yet — but these two are not that. They are renamed fields with a
 * real replacement, and silently stripping one would leave whoever wrote it
 * believing an exclusion or a destination is in force that nothing reads. A
 * configuration setting either is refused instead.
 */
export const callidescopeConfigurationSchema = z.object({
  directories: z.array(z.string()).optional(),
  entryPoints: entryPointsSchema,
  exclude: z.array(z.string()).optional(),
  excludeCallees: z.array(z.string()).optional(),
  excludeFrom: z.array(z.string()).optional(),
  /** Renamed to `excludeCallees`. */
  ignoreCallees: z.never().optional(),
  limits: limitsSchema,
  /** Renamed to `write`. */
  output: z.never().optional(),
  write: writeSchema,
});

// 🚨 Errors

/** Raised when an explicitly named configuration file does not exist. */
export class ConfigurationFileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Configuration file not found: ${filePath}`);
    this.name = "ConfigurationFileNotFoundError";
  }
}

/**
 * Raised when a project's own configuration file cannot be read or parsed.
 *
 * Names the project rather than only the path, because a run resolves a file
 * per project and the failure has to say which one to go and fix. The original
 * failure is kept as `cause` so nothing a reader would need is thrown away.
 */
export class ProjectConfigurationError extends Error {
  constructor(args: {
    cause: unknown;
    configurationPath: string;
    project: string;
  }) {
    const reason =
      args.cause instanceof Error ? args.cause.message : "It could not be read";

    super(
      `Failed to read the callidescope configuration for ${args.project} at ${args.configurationPath}: ${reason}`,
      { cause: args.cause },
    );
    this.name = "ProjectConfigurationError";
  }
}

/**
 * Raised when a project's own configuration sets a field only the workspace
 * configuration may set.
 *
 * Names the project, the offending field, and the four fields a project
 * configuration may set, so the message is actionable without opening a
 * README.
 */
export class ProjectConfigurationFieldNotPermittedError extends Error {
  constructor(args: { field: string; project: string }) {
    super(
      `${args.project} sets ${args.field}, which only the workspace configuration may set. A project configuration may set ${PROJECT_CONFIGURATION_PERMITTED_FIELDS}.`,
    );
    this.name = "ProjectConfigurationFieldNotPermittedError";
  }
}
