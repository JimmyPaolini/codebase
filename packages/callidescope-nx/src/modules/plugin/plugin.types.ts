// 🏷️ Types

import type { PLUGIN_CONTEXT_GLOBAL_KEY } from "./plugin.constants";
import type { CallidescopeOutputFormat } from "@callidescope/configuration";
import type { INestApplicationContext } from "@nestjs/common";

/** A target this plugin infers onto a project. */
export interface InferredTarget {
  readonly cache: boolean;
  readonly executor: string;
  /** Files whose change must invalidate the cached result. */
  readonly inputs?: string[];
  readonly options: Record<string, unknown>;
}

/** One project's inferred targets, keyed by target name. */
export type InferredTargets = Record<string, InferredTarget>;

/** Arguments for inferring targets across every project in a workspace. */
export interface InferTargetsArguments {
  readonly options: unknown;
  /** Every `project.json` Nx matched, workspace-root relative. */
  readonly projectConfigurationFiles: readonly string[];
  readonly workspaceRoot: string;
}

/** `globalThis`, widened with the slot the plugin caches its context in. */
export type PluginContextGlobal = typeof globalThis & {
  [PLUGIN_CONTEXT_GLOBAL_KEY]?: Promise<INestApplicationContext>;
};

/** What a selection of Nx projects resolved to before a trace runs. */
export interface ResolvedTraceScope {
  /** Workspace-relative directories to hand `callidescope --directories`. */
  readonly directories: string[];
  /** Every project name the workspace has, for naming an unknown one back. */
  readonly knownNames: string[];
  /** Every tag the workspace carries, for naming an unmatched one back. */
  readonly knownTags: string[];
  /** Every project the selection reached, including pulled-in dependencies. */
  readonly projectNames: string[];
  /** Names the workspace does not have. */
  readonly unknownNames: string[];
  /** Tags no project in the workspace carries. */
  readonly unmatchedTags: string[];
}

/** Arguments for resolving what one executor invocation should trace. */
export interface ResolveTraceScopeArguments {
  /** Names from the executor's `projects` option. Empty selects nothing. */
  readonly projectNames: readonly string[];
  /** Tags from the executor's `tags` option. Empty selects nothing. */
  readonly tags: readonly string[];
  /** Whether the selection widens along the Nx dependency graph. */
  readonly withDependencies: boolean;
}

/** Arguments for tracing one resolved selection. */
export interface RunTraceArguments {
  /** Resolved from this plugin's `nx.json` registration when omitted. */
  readonly configurationPath?: string | undefined;
  readonly directories: readonly string[];
  /** Overrides the configured format. The configured one when omitted. */
  readonly format?: CallidescopeOutputFormat | undefined;
  readonly workspaceRoot: string;
}

/** The outcome of tracing one selection. */
export interface RunTraceResult {
  readonly ok: boolean;
  readonly report: string;
}
