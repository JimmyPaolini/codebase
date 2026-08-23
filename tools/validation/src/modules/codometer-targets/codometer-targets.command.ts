import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { CodometerTargetsService } from "./codometer-targets.service";

import type {
  CodometerProject,
  CodometerTargetsVerdict,
} from "./codometer-targets.types";

/**
 * CLI command that asserts every workspace project carries a codometer
 * target, and reports every project measured without a size limit.
 *
 * A missing target is a failure, because Nx silently drops a `dependsOn`
 * naming it and the project is never measured at all. A missing size limit is
 * only reported: a freshly generated project correctly ships ungated until
 * its real measured size is known, so nobody should learn that by accident.
 *
 * Exits 0 when every project declares the target and 1 when any does not.
 */
@Command({
  description:
    "Check that every workspace project declares a codometer target, and report which are ungated",
  name: "codometer-targets",
})
@Injectable()
export class CodometerTargetsCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly codometerTargetsService: CodometerTargetsService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CodometerTargetsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Sorts every project into missing-target and ungated buckets. */
  private judgeProjects(projects: CodometerProject[]): CodometerTargetsVerdict {
    const missingTargets: string[] = [];
    const ungatedProjects: string[] = [];

    for (const project of projects) {
      const relativeDirectory = path.relative(process.cwd(), project.directory);
      const projectManifest = this.codometerTargetsService.readProjectManifest(
        project.projectManifestPath,
      );

      if (
        !this.codometerTargetsService.declaresCodometerTarget(projectManifest)
      ) {
        missingTargets.push(relativeDirectory);
        continue;
      }

      const packageManifest = this.codometerTargetsService.readPackageManifest(
        project.packageManifestPath,
      );

      if (
        !this.codometerTargetsService.declaresSizeLimit(
          project.directory,
          packageManifest,
        )
      ) {
        ungatedProjects.push(relativeDirectory);
      }
    }

    return { missingTargets, ungatedProjects };
  }

  /** Reports every ungated project. Informational only; never fails the run. */
  private reportUngatedProjects(ungatedProjects: string[]): void {
    if (ungatedProjects.length === 0) {
      return;
    }

    console.info("Measured but ungated, no sizeLimit declared:");

    for (const ungatedProject of ungatedProjects) {
      console.info(`- ${ungatedProject}`);
    }
  }

  // 🌎 Public Methods

  /** Checks every workspace project and exits 0 or 1 on the verdict. */
  public async run(): Promise<void> {
    // Nothing here is asynchronous; the base class signature is.
    await Promise.resolve();

    const projects = this.codometerTargetsService.resolveWorkspaceProjects(
      process.cwd(),
    );
    const { missingTargets, ungatedProjects } = this.judgeProjects(projects);

    this.reportUngatedProjects(ungatedProjects);

    if (missingTargets.length === 0) {
      console.info(
        `Every one of ${String(projects.length)} workspace projects declares a codometer target.`,
      );

      return;
    }

    console.error("Projects missing a codometer target:");

    for (const missingTarget of missingTargets) {
      console.error(`- ${missingTarget}`);
    }

    process.exit(1);
  }
}
