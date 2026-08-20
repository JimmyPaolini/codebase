// ♟️ Constants

import { z } from "zod";

import type {
  CodometerAnalysis,
  CodometerCompression,
  CodometerSeverity,
  CodometerSymbolKind,
  CodometerSymbolModifier,
  RenderMarkdownOutput,
  WriteMarkdownOutput,
} from "./configuration.types";
import type { CodometerStatisticGroup } from "./statistics.types";

/** Raised when the configuration path points to an unsupported file type. */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/** Extensions the configuration loader can read. */
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
 * File names searched for when no configuration path is given.
 *
 * Searched in order, so a repository carrying both a TypeScript and a JSON
 * configuration file gets the TypeScript one — the richer format, and the one
 * a type-checked configuration was written in.
 */
export const CONFIGURATION_FILE_NAMES = [
  "codometer.config.ts",
  "codometer.config.mts",
  "codometer.config.cts",
  "codometer.config.js",
  "codometer.config.mjs",
  "codometer.config.cjs",
  "codometer.config.json",
  "codometer.config.jsonc",
] as const;

/**
 * Path globs excluded from measurement when a configuration names none.
 *
 * Only the directories every ecosystem generates. Everything a specific
 * repository considers noise — ingested corpora, generated documentation,
 * scratch notes — belongs in that repository's own configuration file.
 */
export const DEFAULT_EXCLUDE_GLOBS = [
  "**/.nx/**",
  "**/build/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
] as const;

/**
 * Badge colors handed to configured counters that name none, in order.
 *
 * Cycled rather than exhausted, so a repository can configure as many counters
 * as it likes and each still gets a color that is stable between runs.
 */
export const DEFAULT_CUSTOM_STATISTIC_COLORS = [
  "7c3aed",
  "0284c7",
  "16a34a",
  "ea580c",
  "db2777",
  "0ea5e9",
  "059669",
  "ca8a04",
] as const;

/** Badge group a configured counter is rendered into when it names none. */
export const DEFAULT_CUSTOM_STATISTIC_GROUP = "conventions";

/**
 * Compression applied to a target that names none.
 *
 * Gzip rather than the best available, because a compressed size is only worth
 * measuring against what a server would actually send, and gzip is what every
 * client understands. A target measuring bytes on disk asks for `none`.
 */
export const DEFAULT_TARGET_COMPRESSION = "gzip" satisfies CodometerCompression;

/**
 * Name of the target every run measures: the codebase itself.
 *
 * Not declarable, because it is not a glob match. It is every file the
 * repository's ignore files leave behind, which is the one set of files no
 * glob can name.
 */
export const DEFAULT_TARGET_NAME = "codebase";

/**
 * Severity a limit that names none carries.
 *
 * The strict one. A limit is written to gate, so one that quietly warned
 * because nobody spelled out the severity would be a gate in name only —
 * `warn` is the deliberate choice, not the accidental one.
 */
export const DEFAULT_LIMIT_SEVERITY = "fail" satisfies CodometerSeverity;

/**
 * What each unit suffix a limit may carry multiplies its number by.
 *
 * Decimal rather than binary — `"8 KB"` is 8000 bytes — matching what every
 * size limit written against the tool this replaced already means. The
 * trailing `b` is part of every key, so `"8 K"` finds nothing here and is
 * rejected instead of being read as 8000 by a parser that shrugged.
 */
export const LIMIT_UNIT_MULTIPLIERS: Readonly<Record<string, number>> = {
  b: 1,
  gb: 1_000_000_000,
  kb: 1_000,
  mb: 1_000_000,
  tb: 1_000_000_000_000,
};

/**
 * Splits a limit written as a string into its number and its unit.
 *
 * Anchored at both ends so a value with anything else in it — a comparison, a
 * second number, a trailing word — matches nothing and is rejected rather than
 * being read as whichever part happened to parse.
 */
export const LIMIT_VALUE_PATTERN = /^(\d+(?:\.\d+)?)\s*([a-z]*)$/i;

/** Spaces used to indent the JSON report when a configuration names none. */
export const DEFAULT_JSON_INDENTATION = 2;

/** Closing marker of the generated badge block. */
export const DEFAULT_MARKDOWN_END_MARKER = "<!-- CODE_STATISTICS_END -->";

/** Opening marker of the generated badge block. */
export const DEFAULT_MARKDOWN_START_MARKER = "<!-- CODE_STATISTICS_START -->";

/**
 * Interpreter used for Python analysis when a configuration names none.
 *
 * A repository whose Python lives in a managed environment overrides this with
 * the command that enters it — `uv run python`, `poetry run python`, or the
 * path to a virtual environment's interpreter.
 */
export const DEFAULT_PYTHON_COMMAND = "python3";

/**
 * Prefix that turns an include glob into one that removes files instead.
 *
 * Read wherever a target's globs are resolved, so the negations end up in the
 * exclude set rather than being matched literally against a path no file
 * starts with.
 */
export const NEGATION_PREFIX = "!";

/**
 * Marks the repository root during an upward search from the process cwd.
 *
 * A package manifest is deliberately not one of them: every package in a
 * monorepo carries one, so the search would stop at the nearest project rather
 * than the root a configuration path was written relative to.
 */
export const REPOSITORY_ROOT_MARKERS = [".git", "pnpm-workspace.yaml"] as const;

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

/** Analyses a target may ask to have run over it. */
export const CODOMETER_ANALYSES = [
  "language",
  "size",
] as const satisfies readonly CodometerAnalysis[];

/** Compressions a target may ask its size to be measured under. */
export const CODOMETER_COMPRESSIONS = [
  "brotli",
  "gzip",
  "none",
] as const satisfies readonly CodometerCompression[];

/** Severities a limit may declare for the breach it would report. */
export const CODOMETER_SEVERITIES = [
  "fail",
  "warn",
] as const satisfies readonly CodometerSeverity[];

/** Declaration kinds a symbol counter may ask for. */
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

/**
 * Accepts a configured callback.
 *
 * Checked for being a function and nothing else: what it does with its
 * arguments is the author's business, and a schema cannot inspect it anyway.
 */
const callbackSchema = <CallbackType>(): z.ZodType<CallbackType> =>
  z.custom<CallbackType>((value) => typeof value === "function", {
    message: "Expected a function",
  });

/**
 * Validates a configuration file's contents.
 *
 * Zod strips unknown keys rather than rejecting them, so a configuration
 * written for a newer codometer still loads under an older one instead of
 * failing on a field it has no opinion about.
 */
export const codometerConfigurationSchema = z.object({
  defaultTarget: z.string().min(1).optional(),
  exclude: z.array(z.string()).optional(),
  excludeFrom: z.array(z.string()).optional(),
  // Two limits may name one metric on purpose — a `warn` short of a `fail` is
  // how a repository sees a number coming before it stops a change — so
  // nothing here asks the paths to be distinct.
  limits: z
    .array(
      z.object({
        label: z.string().min(1).optional(),
        metric: z.string().min(1),
        severity: z.enum(CODOMETER_SEVERITIES).optional(),
        // Read rather than validated here: what a unit means is the
        // configuration service's to say, and saying it twice is how the two
        // answers drift apart.
        value: z.union([z.number(), z.string()]),
      }),
    )
    .optional(),
  output: z
    .object({
      json: z
        .object({
          indentation: z.number().int().min(0).optional(),
          path: z.string(),
        })
        .optional(),
      markdown: z
        .object({
          description: z.string().optional(),
          endMarker: z.string().optional(),
          // Optional because a `write` function may name the file itself; a
          // markdown destination with neither is rejected below.
          path: z.string().optional(),
          render: callbackSchema<RenderMarkdownOutput>().optional(),
          startMarker: z.string().optional(),
          write: callbackSchema<WriteMarkdownOutput>().optional(),
        })
        .refine(
          (markdown) =>
            markdown.path !== undefined || markdown.write !== undefined,
          {
            message:
              "Markdown output needs a path, a write function, or both — otherwise nothing names the file to write.",
          },
        )
        .optional(),
    })
    .optional(),
  python: z.object({ command: z.string().optional() }).optional(),
  statistics: z
    .array(
      z
        .object({
          color: z.string().optional(),
          group: z.enum(CODOMETER_STATISTIC_GROUPS).optional(),
          label: z.string(),
          patterns: z.array(z.string()).min(1).optional(),
          symbols: z
            .object({
              kinds: z.array(z.enum(CODOMETER_SYMBOL_KINDS)).min(1),
              modifiers: z.array(z.enum(CODOMETER_SYMBOL_MODIFIERS)).optional(),
            })
            .optional(),
        })
        // Without one of the two a counter has nothing to match on, and would
        // report a permanent zero rather than announcing it was misconfigured.
        .refine(
          (statistic) =>
            statistic.patterns !== undefined || statistic.symbols !== undefined,
          {
            message:
              "A statistic needs patterns to match files, symbols to match declarations, or both — otherwise it counts nothing.",
          },
        ),
    )
    .optional(),
  targets: z
    .array(
      z
        .object({
          analyses: z.array(z.enum(CODOMETER_ANALYSES)).min(1),
          compression: z.enum(CODOMETER_COMPRESSIONS).optional(),
          // A `!` here would read as a negation and match nothing instead,
          // since every pattern in this list already removes files.
          exclude: z
            .array(
              z
                .string()
                .refine((pattern) => !pattern.startsWith(NEGATION_PREFIX), {
                  message:
                    "An exclude glob already removes files, so a leading `!` has nothing to negate — write the glob without it.",
                }),
            )
            .optional(),
          include: z.array(z.string()).min(1),
          name: z.string().min(1),
        })
        // A list of nothing but negations reads as a target and resolves to no
        // include glob at all, so it would match nothing for good — and a
        // limit written against it could never breach.
        .superRefine((target, context) => {
          const addsFiles = target.include.some(
            (pattern) => !pattern.startsWith(NEGATION_PREFIX),
          );

          if (!addsFiles) {
            context.addIssue({
              code: "custom",
              message: `Target "${target.name}" has no include glob that adds files — every pattern in its include list starts with "${NEGATION_PREFIX}", so it would hold nothing to measure.`,
            });
          }

          // The codebase is measured under this name by every run, and a
          // metric is addressed by its target's name, so a second target
          // answering to it would take limits written against the repository
          // itself.
          if (target.name === DEFAULT_TARGET_NAME) {
            context.addIssue({
              code: "custom",
              message: `Target "${DEFAULT_TARGET_NAME}" is the repository itself, which every run measures — a declared target needs a name of its own.`,
            });
          }
        }),
    )
    // A metric is addressed by its target's name, so two targets sharing one
    // would make every limit on either of them ambiguous.
    .refine(
      (targets) =>
        new Set(targets.map((target) => target.name)).size === targets.length,
      { message: "Every target needs its own name." },
    )
    .optional(),
});
