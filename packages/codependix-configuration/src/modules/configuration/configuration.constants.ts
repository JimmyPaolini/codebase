// ♟️ Constants

import { z } from "zod";

import type {
  CodependixExportTarget,
  CodependixGraphType,
} from "./configuration.types";

/** Raised when the configuration path points to an unsupported file type. */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/** Graph levels codependix can build. */
export const CODEPENDIX_GRAPH_TYPES = [
  "imports",
  "nestjs",
  "nx",
  "pythonImports",
] as const satisfies readonly CodependixGraphType[];

/** Export targets a graph type may be configured with, per project. */
export const CODEPENDIX_EXPORT_TARGETS = [
  "both",
  "json",
  "markdown",
  "none",
] as const satisfies readonly CodependixExportTarget[];

/** Extensions the configuration loader can read. */
export const SUPPORTED_CONFIGURATION_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".mjs",
  ".mts",
  ".ts",
]);

/**
 * File names searched for when no configuration path is given.
 *
 * Searched in order, so a workspace carrying both a TypeScript and a JSON
 * configuration file gets the TypeScript one.
 */
export const CONFIGURATION_FILE_NAMES = [
  "codependix.config.ts",
  "codependix.config.mts",
  "codependix.config.cts",
  "codependix.config.js",
  "codependix.config.mjs",
  "codependix.config.cjs",
  "codependix.config.json",
] as const;

/** Export target applied to a graph type naming none. */
export const DEFAULT_EXPORT_TARGET: CodependixExportTarget = "none";

/** Markdown file an anchor-mode destination writes into when it names none. */
export const DEFAULT_MARKDOWN_PATH = "README.md";

/**
 * Projects that participate in graph export when a configuration names none.
 *
 * Deliberately empty: participation is always declared. A configuration that
 * names `defaults` but no `include` exports nothing rather than quietly
 * covering the whole workspace, which is what lets a later widening argument
 * mean something — a union with `["**"]` as its base can never add a project.
 */
export const DEFAULT_INCLUDE_GLOBS = [] as const;

/**
 * Marks the workspace root during an upward search from the process cwd.
 *
 * A package manifest is deliberately not one of them: every project in the
 * workspace carries one, so the search would stop at the nearest project
 * rather than the root a configuration path was written relative to.
 */
export const REPOSITORY_ROOT_MARKERS = [".git", "pnpm-workspace.yaml"] as const;

/** Separates the entries of a `--projects` or `--tags` argument. */
export const SELECTION_SEPARATOR = ",";

/**
 * Validates one end of an access rule, or an acyclic rule's scope.
 *
 * At least one field is required: a selector stating nothing reads exactly
 * like a typo, and treating it as "every node" would silently widen a rule to
 * the whole graph.
 */
const boundarySelectorSchema = z
  .object({
    id: z.array(z.string().min(1)).min(1).optional(),
    path: z.array(z.string().min(1)).min(1).optional(),
    project: z.array(z.string().min(1)).min(1).optional(),
    tags: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine(
    (selector) => Object.values(selector).some((value) => value !== undefined),
    {
      message:
        "A selector needs at least one of id, path, project, or tags — otherwise nothing says which nodes it means.",
    },
  );

/** Validates the edge attributes a rule may narrow itself to. */
const boundaryEdgeSelectorSchema = z.object({
  implicit: z.boolean().optional(),
});

/** Validates one declared boundary rule, of either kind. */
const boundaryRuleSchema = z.union([
  z.object({
    edges: boundaryEdgeSelectorSchema.optional(),
    from: boundarySelectorSchema,
    kind: z.enum(["allow", "forbid"]),
    message: z.string().min(1).optional(),
    name: z.string().min(1),
    to: boundarySelectorSchema,
  }),
  z.object({
    kind: z.literal("acyclic"),
    message: z.string().min(1).optional(),
    name: z.string().min(1),
    nodes: boundarySelectorSchema.optional(),
  }),
]);

/** Validates every declared boundary rule, keyed by graph level. */
const boundariesConfigurationSchema = z.object({
  imports: z.array(boundaryRuleSchema).optional(),
  nestjs: z.array(boundaryRuleSchema).optional(),
  nx: z.array(boundaryRuleSchema).optional(),
  pythonImports: z.array(boundaryRuleSchema).optional(),
});

/** Validates one graph type's export configuration. */
const graphOutputSchema = z
  .object({
    json: z.object({ path: z.string().min(1) }).optional(),
    markdown: z
      .object({
        anchor: z.string().min(1).optional(),
        path: z.string().min(1).optional(),
      })
      .optional(),
    target: z.enum(CODEPENDIX_EXPORT_TARGETS).optional(),
  })
  .superRefine((output, context) => {
    const target = output.target ?? DEFAULT_EXPORT_TARGET;
    const needsJson = target === "both" || target === "json";
    const needsMarkdown = target === "both" || target === "markdown";

    if (needsJson && output.json === undefined) {
      context.addIssue({
        code: "custom",
        message: `A "${target}" export target needs a json destination.`,
      });
    }

    if (needsMarkdown && output.markdown === undefined) {
      context.addIssue({
        code: "custom",
        message: `A "${target}" export target needs a markdown destination.`,
      });
    }

    if (
      output.markdown !== undefined &&
      output.markdown.anchor === undefined &&
      output.markdown.path === undefined
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A markdown destination needs an anchor, a path, or both — otherwise nothing names where the export goes.",
      });
    }
  });

/** Validates a project's export configuration, keyed by graph type. */
const projectConfigurationSchema = z.object({
  imports: graphOutputSchema.optional(),
  nestjs: graphOutputSchema.optional(),
  nx: graphOutputSchema.optional(),
  pythonImports: graphOutputSchema.optional(),
});

/**
 * Validates the Workspace Graph's export configuration.
 *
 * Only `nx` is accepted: the Workspace Graph is a whole-repository Nx project
 * graph, so it has no `nestjs` or `imports` counterpart to configure.
 */
const workspaceConfigurationSchema = z.object({
  nx: graphOutputSchema.optional(),
});

/**
 * Validates a codependix configuration file's contents.
 *
 * Zod strips unknown keys rather than rejecting them, so a configuration
 * written for a newer codependix still loads under an older one instead of
 * failing on a field it has no opinion about.
 */
export const codependixConfigurationSchema = z.object({
  boundaries: boundariesConfigurationSchema.optional(),
  defaults: projectConfigurationSchema.optional(),
  exclude: z.array(z.string()).optional(),
  include: z.array(z.string()).optional(),
  projects: z.record(z.string(), projectConfigurationSchema).optional(),
  workspace: workspaceConfigurationSchema.optional(),
});

// 🚨 Errors

/** Raised when an explicitly named configuration file does not exist. */
export class ConfigurationFileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Configuration file not found: ${filePath}`);
    this.name = "ConfigurationFileNotFoundError";
  }
}
