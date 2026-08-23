import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  CODOMETER_CONFIG_FILE_NAMES,
  CODOMETER_TARGET_NAME,
  PACKAGE_MANIFEST_FILE_NAME,
  PROJECT_MANIFEST_FILE_NAME,
  WORKSPACE_SCOPES,
} from "./codometer-targets.constants";

import type {
  CodometerProject,
  PackageManifest,
  ProjectManifest,
} from "./codometer-targets.types";

/**
 * Reads every workspace project and says which ones are unmeasured or
 * measured but ungated.
 *
 * A project declaring no `codometer` target is silent: Nx drops a
 * `dependsOn` naming an undeclared target, so nothing downstream ever notices
 * the project was skipped. A project declaring the target but no `sizeLimit`
 * — in its manifest or in a `codometer.config` file of its own — is measured
 * and reported but gated against nothing, which is correct for a freshly
 * generated project and only worth reporting, never failing.
 */
@Injectable()
export class CodometerTargetsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Whether a project declares the codometer target at all. */
  public declaresCodometerTarget(projectManifest: ProjectManifest): boolean {
    return CODOMETER_TARGET_NAME in (projectManifest.targets ?? {});
  }

  /** Whether a project's codometer measurement is gated against a limit. */
  public declaresSizeLimit(
    directory: string,
    packageManifest: PackageManifest | undefined,
  ): boolean {
    if (packageManifest?.sizeLimit !== undefined) {
      return true;
    }

    return CODOMETER_CONFIG_FILE_NAMES.some((configFileName) =>
      existsSync(path.join(directory, configFileName)),
    );
  }

  /** Reads and parses one package manifest, or `undefined` if it is absent. */
  public readPackageManifest(
    packageManifestPath: string,
  ): PackageManifest | undefined {
    if (!existsSync(packageManifestPath)) {
      return undefined;
    }

    return JSON.parse(
      readFileSync(packageManifestPath, "utf8"),
    ) as PackageManifest;
  }

  /** Reads and parses one project manifest. */
  public readProjectManifest(projectManifestPath: string): ProjectManifest {
    return JSON.parse(
      readFileSync(projectManifestPath, "utf8"),
    ) as ProjectManifest;
  }

  /** Finds every workspace project the codometer target policy covers. */
  public resolveWorkspaceProjects(workspaceRoot: string): CodometerProject[] {
    const projects: CodometerProject[] = [];

    for (const workspaceScope of WORKSPACE_SCOPES) {
      const scopePath = path.join(workspaceRoot, workspaceScope);

      if (!existsSync(scopePath)) {
        continue;
      }

      for (const scopeChild of readdirSync(scopePath, {
        withFileTypes: true,
      })) {
        if (!scopeChild.isDirectory()) {
          continue;
        }

        const directory = path.join(scopePath, scopeChild.name);
        const projectManifestPath = path.join(
          directory,
          PROJECT_MANIFEST_FILE_NAME,
        );

        if (!existsSync(projectManifestPath)) {
          continue;
        }

        projects.push({
          directory,
          packageManifestPath: path.join(directory, PACKAGE_MANIFEST_FILE_NAME),
          projectManifestPath,
        });
      }
    }

    return projects;
  }
}
