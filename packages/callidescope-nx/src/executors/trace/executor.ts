// 🛠️ Utilities

import {
  resolveOptionsService,
  resolvePluginService,
} from "../../plugin-context.utilities";

import type { TraceExecutorOptions } from "./executor.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Traces one selection of Nx projects with callidescope.
 *
 * Inferred onto every project holding a `tsconfig.json`, so
 * `nx run-many -t callidescope` covers the workspace,
 * `nx run-many -t callidescope --projects=tag:type:package` covers a category,
 * and `nx affected -t callidescope` covers only what changed — none of which
 * the workspace-wide command can do, and none of which needs a flag of its
 * own: selecting projects is what the task runner is for.
 *
 * With neither `projects` nor `tags` given, the selection is the project this
 * target belongs to.
 */
export default async function traceExecutor(
  options: TraceExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  const optionsService = await resolveOptionsService();
  const projectNames = optionsService.readStringList(options.projects);
  const tags = optionsService.readStringList(options.tags);

  if (projectNames.length === 0 && tags.length === 0) {
    if (context.projectName === undefined) {
      throw new Error(
        "The callidescope trace executor must be run against a project, or given `projects` or `tags`.",
      );
    }

    projectNames.push(context.projectName);
  }

  const pluginService = await resolvePluginService();
  const scope = await pluginService.resolveTraceScope({
    projectNames,
    tags,
    withDependencies: options.withDependencies !== false,
  });

  // A name or tag that resolved to nothing fails the task rather than
  // narrowing it: a report of what a run did cover cannot show what it did
  // not, so a silently smaller trace would pass while measuring less.
  if (scope.unknownNames.length > 0 || scope.unmatchedTags.length > 0) {
    throw new Error(
      [
        scope.unknownNames.length > 0
          ? `Unknown Nx projects: ${scope.unknownNames.join(", ")}. Known: ${scope.knownNames.join(", ")}.`
          : undefined,
        scope.unmatchedTags.length > 0
          ? `Unmatched Nx tags: ${scope.unmatchedTags.join(", ")}. Known: ${scope.knownTags.join(", ")}.`
          : undefined,
      ]
        .filter((reason) => reason !== undefined)
        .join(" "),
    );
  }

  if (scope.directories.length === 0) {
    return { success: true };
  }

  const result = await pluginService.runTrace({
    ...(options.configurationPath === undefined
      ? {}
      : { configurationPath: options.configurationPath }),
    directories: scope.directories,
    format: optionsService.readFormat(options.format),
    workspaceRoot: context.root,
  });

  // The report is the executor's product rather than a log line, so it goes
  // to stdout verbatim.
  process.stdout.write(`${result.report}\n`);

  return { success: result.ok };
}
