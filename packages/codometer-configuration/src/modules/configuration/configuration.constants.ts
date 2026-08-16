// ♟️ Constants

import { z } from "zod";

import type {
  RenderMarkdownOutput,
  WriteMarkdownOutput,
} from "./configuration.types";

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
 * Marks the repository root during an upward search from the process cwd.
 *
 * A package manifest is deliberately not one of them: every package in a
 * monorepo carries one, so the search would stop at the nearest project rather
 * than the root a configuration path was written relative to.
 */
export const REPOSITORY_ROOT_MARKERS = [".git", "pnpm-workspace.yaml"] as const;

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
  exclude: z.array(z.string()).optional(),
  excludeFrom: z.array(z.string()).optional(),
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
});
