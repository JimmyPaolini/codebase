import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { workspaceRoot } from "@nx/devkit";

import { DEFAULT_PROJECT_DIRECTORIES } from "./validator.constants";

import type { WorkspaceProject } from "./validator.types";

/**
 * Workspace project discovery and resolution helpers.
 */
@Injectable()
export class ValidatorWorkspaceService {
  // 🏗 Dependency Injection

  constructor() {}

  /**
   * Parses workspace project metadata from a project root path.
   */
  private readWorkspaceProject(projectRootPath: string): WorkspaceProject {
    const projectConfigurationPath = path.join(projectRootPath, "project.json");
    try {
      const projectConfiguration = JSON.parse(
        fs.readFileSync(projectConfigurationPath, "utf8"),
      ) as { tags?: string[] };

      return {
        rootPath: projectRootPath,
        tags: projectConfiguration.tags ?? [],
      };
    } catch (error) {
      throw new Error(
        `Unable to parse project configuration at "${projectConfigurationPath}"`,
        { cause: error },
      );
    }
  }

  /**
   * Reads all projects from standard top-level workspace directories.
   */
  readWorkspaceProjects(): WorkspaceProject[] {
    return DEFAULT_PROJECT_DIRECTORIES.flatMap((directoryPath) => {
      const absoluteDirectoryPath = path.join(workspaceRoot, directoryPath);
      if (!fs.existsSync(absoluteDirectoryPath)) {
        return [];
      }

      return fs
        .readdirSync(absoluteDirectoryPath, { withFileTypes: true })
        .filter((directoryEntry) => directoryEntry.isDirectory())
        .map((directoryEntry) =>
          path.join(absoluteDirectoryPath, directoryEntry.name),
        )
        .filter((projectRootPath) =>
          fs.existsSync(path.join(projectRootPath, "project.json")),
        )
        .map((projectRootPath) => this.readWorkspaceProject(projectRootPath));
    });
  }

  /**
   * Resolves a project by its name from the workspace project list.
   */
  resolveProjectByName(args: {
    allWorkspaceProjects: WorkspaceProject[];
    projectName: string;
  }): WorkspaceProject {
    const { allWorkspaceProjects, projectName } = args;
    const workspaceProject = allWorkspaceProjects.find((candidateProject) => {
      return this.resolveProjectName(candidateProject.rootPath) === projectName;
    });

    if (workspaceProject === undefined) {
      throw new Error(`Unknown project "${projectName}"`);
    }

    return workspaceProject;
  }

  /**
   * Resolves a project name from project.json name or directory basename.
   */
  resolveProjectName(projectRootPath: string): string {
    const projectConfigurationPath = path.join(projectRootPath, "project.json");
    const projectConfiguration = JSON.parse(
      fs.readFileSync(projectConfigurationPath, "utf8"),
    ) as { name?: string };
    return projectConfiguration.name ?? path.basename(projectRootPath);
  }

  /**
   * Resolves requested project names or all discovered workspace projects.
   */
  resolveSelectedProjectNames(args: {
    allWorkspaceProjects: WorkspaceProject[];
    requestedProjectNames: string[] | undefined;
  }): string[] {
    const { allWorkspaceProjects, requestedProjectNames } = args;
    if (requestedProjectNames !== undefined) {
      return requestedProjectNames;
    }

    const defaultProjectNames = allWorkspaceProjects
      .map((workspaceProject) =>
        this.resolveProjectName(workspaceProject.rootPath),
      )
      .toSorted();

    if (defaultProjectNames.length === 0) {
      throw new Error("No default projects found in workspace");
    }

    return defaultProjectNames;
  }
}
