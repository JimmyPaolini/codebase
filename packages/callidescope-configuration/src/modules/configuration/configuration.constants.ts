// ♟️ Constants

import { z } from "zod";

import type {
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

/**
 * Distinct modules a callable's transitive callees may touch before it is
 * reported as doing too many unrelated things.
 */
export const DEFAULT_SPREAD_THRESHOLD = 4;

/**
 * Modules a callable must call *directly* before spread is reported.
 *
 * Transitive spread alone flags every entry point, because an entry point
 * legitimately reaches the whole program. Requiring direct breadth as well is
 * what isolates the callable personally orchestrating unrelated concerns.
 */
export const DEFAULT_DIRECT_SPREAD_THRESHOLD = 3;

/**
 * Concrete implementations one interface member may resolve to before the call
 * is recorded as unresolved instead.
 *
 * This is the tool's primary noise control. A structurally matched member named
 * `run` or `sync` otherwise matches dozens of unrelated classes and manufactures
 * a call-stack depth that no execution ever takes.
 */
export const DEFAULT_MAXIMUM_IMPLEMENTATION_FAN_OUT = 8;

/**
 * Callers a callable needs before its placement is judged.
 *
 * One caller is not evidence of where something belongs; it is evidence that
 * only one thing needs it yet.
 */
export const DEFAULT_MINIMUM_CALLERS = 2;

/**
 * Share of a callable's callers that must sit in one foreign module before the
 * callable is reported as misplaced.
 */
export const DEFAULT_CALLER_MAJORITY_RATIO = 0.8;

/** Globs whose callables are exempt from the module-spread finding. */
export const DEFAULT_ALLOW_SPREAD_FOR = [
  "**/*.command.ts",
  "**/*.module.ts",
  "**/main.ts",
] as const;

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

/** What a run prints to standard output when nothing says otherwise. */
export const DEFAULT_OUTPUT_FORMAT = "markdown";

/** Heading the section embedded in a project README is written under. */
export const DEFAULT_PROJECT_README_HEADING = "## 🔭 Callidescope";

/** Stacks a README section shows before the rest fold into a disclosure. */
export const DEFAULT_PREVIEW_COUNT = 3;

/** Opening anchor of the generated markdown block. */
export const DEFAULT_MARKDOWN_START_MARKER = "<!-- CALL_STACKS_START -->";

/** Closing anchor of the generated markdown block. */
export const DEFAULT_MARKDOWN_END_MARKER = "<!-- CALL_STACKS_END -->";

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

const limitsSchema = z
  .object({
    callerMajorityRatio: z.number().gt(0).max(1).optional(),
    directSpreadThreshold: z.number().int().positive().optional(),
    maximumBreadth: z.number().int().positive().optional(),
    maximumDepth: z.number().int().positive().optional(),
    maximumImplementationFanOut: z.number().int().positive().optional(),
    minimumCallers: z.number().int().positive().optional(),
    spreadThreshold: z.number().int().positive().optional(),
  })
  .optional();

const entryPointsSchema = z
  .object({
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
    path: z.string(),
    render: callbackSchema<RenderMarkdownOutput>().optional(),
    startMarker: z.string().optional(),
    write: callbackSchema<WriteMarkdownOutput>().optional(),
  })
  .optional();

const outputSchema = z
  .object({
    format: z.enum(["json", "markdown", "mermaid"]).optional(),
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

/** Validates the shape of a callidescope configuration file. */
export const callidescopeConfigurationSchema = z.object({
  allowSpreadFor: z.array(z.string()).optional(),
  entryPoints: entryPointsSchema,
  exclude: z.array(z.string()).optional(),
  excludeFrom: z.array(z.string()).optional(),
  ignoreCallees: z.array(z.string()).optional(),
  limits: limitsSchema,
  output: outputSchema,
  projects: z.array(z.string()).optional(),
});
