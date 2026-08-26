import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { ProjectsService } from "../projects/projects.service";

import {
  PROJECT_SEPARATOR,
  PROJECTS_EXAMPLE,
  PROJECTS_FLAG,
  TAGS_EXAMPLE,
  TAGS_FLAG,
} from "./directories.constants";

import type { ResolvedProjectDirectories } from "../projects/projects.types";
import type { DirectoriesCommandOptions } from "./directories.types";

/**
 * Prints the directories a set of Nx project names and tags stands for.
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
    "Resolve Nx project names and tags to the directories callidescope traces",
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

  /**
   * Names what failed to resolve, alongside the vocabulary it was drawn from.
   *
   * A selection that refused no tag says nothing about tags, and vice versa.
   * The workspace's full vocabulary is worth printing beside a typo and
   * nowhere else — it runs to dozens of entries, so including the half that
   * nothing went wrong in would bury the half that did.
   */
  private describeRejection(
    resolution: ResolvedProjectDirectories,
  ): Record<string, string[]> {
    const description: Record<string, string[]> = {};

    if (resolution.unknownNames.length > 0) {
      description["knownNames"] = resolution.knownNames;
      description["unknownNames"] = resolution.unknownNames;
    }

    if (resolution.unmatchedTags.length > 0) {
      description["knownTags"] = resolution.knownTags;
      description["unmatchedTags"] = resolution.unmatchedTags;
    }

    return description;
  }

  /**
   * Names everything wrong with the two selection flags, before any of it is
   * reported.
   *
   * Collected rather than thrown one at a time, the way `RunPlanService` does
   * in `callidescope-cli`: a command line with two mistakes in it is two
   * mistakes to fix rather than two runs.
   *
   * A flag passed without a value is refused even when the other flag named
   * something usable. Proceeding would silently drop half of what was asked
   * for, which is the one failure a printed line of directories cannot show.
   */
  private findSelectionErrors(options: DirectoriesCommandOptions): string[] {
    const errors = (
      [
        [PROJECTS_FLAG, options.projects, PROJECTS_EXAMPLE],
        [TAGS_FLAG, options.tags, TAGS_EXAMPLE],
      ] as const
    )
      .filter(([, value]) => value === true)
      .map(([flag, , example]) => `${flag} needs a value, as in "${example}".`);

    // Only a command line with no broken flag is told it named nothing:
    // otherwise the same mistake would be reported twice.
    if (errors.length > 0) {
      return errors;
    }

    if (
      this.readSelection(options.projects).length === 0 &&
      this.readSelection(options.tags).length === 0
    ) {
      return [
        `Name at least one of ${PROJECTS_FLAG} or ${TAGS_FLAG}, as in "${PROJECTS_EXAMPLE}" or "${TAGS_EXAMPLE}".`,
      ];
    }

    return errors;
  }

  /** Reads one selection flag into the entries it named, if any. */
  private readSelection(value: string[] | true | undefined): string[] {
    return value === undefined || value === true ? [] : value;
  }

  /** Splits one comma-separated flag value, trimming and dropping the blanks. */
  private splitEntries(value: string | undefined): string[] {
    return (value ?? "")
      .split(PROJECT_SEPARATOR)
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");
  }

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
    return this.splitEntries(value);
  }

  /**
   * Parses `--tags`, a comma-separated list of Nx project tags.
   *
   * A project carrying any one of them is selected — see
   * `ProjectsService.resolveTaggedRoots` for why any rather than all.
   */
  @Option({
    description:
      "Comma-separated Nx project tags to resolve, selecting a project carrying any of them",
    flags: "-t, --tags [tags]",
  })
  public parseTags(value: string | undefined): string[] {
    return this.splitEntries(value);
  }

  /**
   * Resolves the named and tagged projects, and prints their directories.
   *
   * A name the workspace does not have, or a tag no project carries, fails
   * the whole run rather than being dropped from the line: a dropped entry is
   * a trace that quietly covers less than it was asked to, and a report of
   * what it did cover cannot show you what it did not.
   */
  public async run(
    _passedParameters: string[],
    options: DirectoriesCommandOptions,
  ): Promise<void> {
    const errors = this.findSelectionErrors(options);

    if (errors.length > 0) {
      this.logger.error("🔭 Rejected the command line", undefined, {
        reasons: errors,
      });
      process.exitCode = 1;

      return;
    }

    const projectNames = this.readSelection(options.projects);
    const tags = this.readSelection(options.tags);
    const graph = await this.projectsService.readProjectGraph();
    const resolution = this.projectsService.resolveDirectories({
      graph,
      projectNames,
      tags,
    });

    if (
      resolution.unknownNames.length > 0 ||
      resolution.unmatchedTags.length > 0
    ) {
      this.logger.error(
        "🔭 Rejected a selection the workspace does not have",
        undefined,
        this.describeRejection(resolution),
      );
      process.exitCode = 1;

      return;
    }

    this.logger.debug("🔭 Resolved an Nx project selection", undefined, {
      directoryCount: resolution.directories.length,
      projectNames,
      tags,
    });

    process.stdout.write(`${resolution.directories.join(PROJECT_SEPARATOR)}\n`);
  }
}
