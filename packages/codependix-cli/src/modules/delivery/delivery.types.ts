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

/** One project's outcome after its configured destinations were resolved. */
export interface ProjectRunResult {
  isCurrent: boolean;
  projectName: string;
  stalePaths: string[];
}
