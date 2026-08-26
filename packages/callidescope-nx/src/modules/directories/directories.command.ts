import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { ProjectsService } from "../projects/projects.service";

import { PROJECT_SEPARATOR } from "./directories.constants";

import type { DirectoriesCommandOptions } from "./directories.types";

/**
 * Prints the directories a set of Nx project names stands for.
 *
 * A separate command rather than a `--projects` flag on `callidescope`
 * itself: a flag there would put Nx in the core CLI's help text and, sooner
 * or later, in its dependencies, which is the coupling this package exists to
 * keep out. Composing the two instead —
 * `callidescope --directories "$(callidescope-nx directories …)"` — leaves
 * `callidescope-cli` knowing nothing about Nx at all.
 *
 * Only the resolved directories reach standard output, so the whole line can
 * be substituted straight into `--directories`; every log line the run
 * produces goes to standard error (see `main.ts`).
 */
@Command({
  description:
    "Resolve Nx project names to the directories callidescope traces",
  name: "directories",
})
@Injectable()
export class DirectoriesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(DirectoriesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Parses `--projects`, a comma-separated list of Nx project names.
   *
   * Only ever runs for a flag that carried a value: a valueless `--projects`
   * bypasses the parser entirely and reaches `run` as `true`, which is
   * refused there.
   */
  @Option({
    description: "Comma-separated Nx project names to resolve",
    flags: "-p, --projects [projects]",
  })
  public parseProjects(value: string | undefined): string[] {
    return (value ?? "")
      .split(PROJECT_SEPARATOR)
      .map((projectName) => projectName.trim())
      .filter((projectName) => projectName !== "");
  }

  /**
   * Resolves the named projects and prints their directories.
   *
   * A name the workspace does not have fails the whole run rather than being
   * dropped from the line: a dropped name is a trace that quietly covers less
   * than it was asked to, and a report of what it did cover cannot show you
   * what it did not.
   *
   * The flag left off, passed without a value, and passed a value that held
   * no names are one rejection rather than three. They are the same mistake
   * — nothing was named — and the fix for all three is the same sentence.
   */
  public async run(
    _passedParameters: string[],
    options: DirectoriesCommandOptions,
  ): Promise<void> {
    const projectNames = options.projects;

    if (
      projectNames === undefined ||
      projectNames === true ||
      projectNames.length === 0
    ) {
      this.logger.error("🔭 Rejected the command line", undefined, {
        reason: `--projects needs at least one Nx project name, as in "--projects callidescope-cli${PROJECT_SEPARATOR}callidescope-graph".`,
      });
      process.exitCode = 1;

      return;
    }

    const graph = await this.projectsService.readProjectGraph();
    const resolution = this.projectsService.resolveDirectories({
      graph,
      projectNames,
    });

    if (resolution.unknownNames.length > 0) {
      this.logger.error("🔭 Rejected unknown Nx project names", undefined, {
        knownNames: resolution.knownNames,
        unknownNames: resolution.unknownNames,
      });
      process.exitCode = 1;

      return;
    }

    this.logger.debug("🔭 Resolved Nx project names", undefined, {
      directoryCount: resolution.directories.length,
      projectNames,
    });

    process.stdout.write(`${resolution.directories.join(PROJECT_SEPARATOR)}\n`);
  }
}
