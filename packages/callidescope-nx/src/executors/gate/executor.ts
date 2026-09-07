// 🛠️ Utilities

import { resolvePluginService } from "../../modules/plugin/plugin-context.utilities";
import { resolveExecutorScope } from "../../modules/plugin/plugin.utilities";

import type { GateExecutorOptions } from "./executor.types";
import type { ExecutorContext } from "@nx/devkit";

/**
 * Fails one project's task when its call stacks broke the limits it is held to.
 *
 * The gate rather than the trace: `trace` prints every stack in a project for
 * somebody reading it, and this prints only the stacks and callables that
 * decided the exit code, which is what a failed pipeline is asked to explain.
 *
 * Inferred onto every project holding a `tsconfig.json` that the workspace
 * configuration does not exclude, so `nx affected -t gate` gates a branch by
 * the projects it changed — and a project whose stacks got deeper is named by
 * the task that failed, which one workspace-wide task never could.
 *
 * With neither `projects` nor `tags` given, the selection is the project this
 * target belongs to, widened along the Nx dependency graph: a stack truncated
 * at a package boundary measures the wrong thing.
 */
export default async function gateExecutor(
  options: GateExecutorOptions,
  context: ExecutorContext,
): Promise<{ success: boolean }> {
  const scope = await resolveExecutorScope({
    context,
    label: "gate",
    options,
  });

  if (scope.directories.length === 0) {
    return { success: true };
  }

  const pluginService = await resolvePluginService();
  const result = await pluginService.runGate({
    ...(options.configurationPath === undefined
      ? {}
      : { configurationPath: options.configurationPath }),
    directories: scope.directories,
    workspaceRoot: context.root,
  });

  // The findings are the executor's product rather than a log line, so they go
  // to stdout verbatim — and they go there whether or not the gate passed,
  // because a report saying nothing was found is how a reader tells a green
  // gate from one that never ran.
  process.stdout.write(`${result.report}\n`);

  return { success: result.ok };
}
