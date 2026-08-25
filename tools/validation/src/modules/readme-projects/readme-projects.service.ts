import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  ROOT_README_PATH,
  WORKSPACE_SCOPES,
} from "./readme-projects.constants";

/**
 * Finds every workspace project and says which ones the root README does not
 * link to.
 *
 * A project is any directory with its own `package.json` under
 * `applications/`, `packages/`, or `tools/` — the same definition the catalog
 * policy scans by. Documented means the README links to that project's
 * directory somewhere as `[name](scope/name)`; nothing enforces the
 * surrounding prose, grouping, or description.
 */
@Injectable()
export class ReadmeProjectsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Every project path the README does not link to. */
  public findUndocumentedProjectPaths(
    projectPaths: string[],
    readmeContents: string,
  ): string[] {
    return projectPaths.filter(
      (projectPath) => !readmeContents.includes(`](${projectPath})`),
    );
  }

  /** Reads the root README's contents. */
  public readRootReadme(workspaceRoot: string): string {
    return readFileSync(path.join(workspaceRoot, ROOT_README_PATH), "utf8");
  }

  /** Every workspace project's scope-relative path, e.g. `packages/logger`. */
  public resolveWorkspaceProjectPaths(workspaceRoot: string): string[] {
    const projectPaths: string[] = [];

    for (const scope of WORKSPACE_SCOPES) {
      const scopePath = path.join(workspaceRoot, scope);

      if (!existsSync(scopePath)) {
        continue;
      }

      for (const scopeChild of readdirSync(scopePath, {
        withFileTypes: true,
      })) {
        if (!scopeChild.isDirectory()) {
          continue;
        }

        const manifestPath = path.join(
          scopePath,
          scopeChild.name,
          "package.json",
        );

        if (existsSync(manifestPath)) {
          projectPaths.push(`${scope}/${scopeChild.name}`);
        }
      }
    }

    return projectPaths;
  }
}
