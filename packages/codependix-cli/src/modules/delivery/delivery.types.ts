// 🏷️ Types

import type { ResolvedCodependixGraphOutput } from "@codependix/configuration";

/** Which of the two run modes a command line resolved to. */
export type CodependixRunMode = "check" | "write";

/** Arguments shared by every method that delivers one file destination. */
export interface DeliverFileArguments {
  absoluteRoot: string;
  content: string;
  mode: CodependixRunMode;
  relativePath: string;
}

/**
 * Arguments for delivering one project's (or the workspace's) resolved
 * export configuration.
 *
 * `jsonContent`/`markdownContent` are rendered by the caller — every graph
 * type renders its own JSON shape and its own diagram — and are only read
 * when the resolved output actually touches that destination, so a caller
 * whose target is `"markdown"` never has to render JSON it will not deliver.
 */
export interface DeliverGraphOutputArguments {
  jsonContent: string | undefined;
  markdownContent: string | undefined;
  mode: CodependixRunMode;
  project: DeliveryProject;
  resolvedOutput: ResolvedCodependixGraphOutput;
}

/** The project (or workspace) a graph export is delivered relative to. */
export interface DeliveryProject {
  absoluteRoot: string;
  name: string;
}

/**
 * Every project's outcome from one graph-type pass — the projects that
 * finished, and the projects that failed before their exports could be
 * resolved.
 *
 * Kept apart rather than folded into one list: a caller deciding a run's exit
 * code needs both a stale export and a failed project to fail it, and a caller
 * only interested in what was actually written needs `results` alone.
 */
export interface GraphRunOutcome {
  failures: ProjectRunFailure[];
  results: ProjectRunResult[];
}

/**
 * One project's outcome after it raised before its exports could be
 * resolved — a missing anchor, or a NestJS project that failed to boot its
 * container.
 *
 * Kept apart from `ProjectRunResult` rather than added to it as an optional
 * field: a result is either something that was resolved (current or stale) or
 * something that never got that far, and the two should not be representable
 * at once.
 */
export interface ProjectRunFailure {
  error: string;
  projectName: string;
}

/** One project's outcome after its configured destinations were resolved. */
export interface ProjectRunResult {
  isCurrent: boolean;
  projectName: string;
  stalePaths: string[];
}
