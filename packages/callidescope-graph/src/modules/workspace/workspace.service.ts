import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import {
  MODULES_DIRECTORY,
  PROJECT_CONTAINER_DIRECTORIES,
  ROOT_MODULE_SEGMENT,
  TEST_DIRECTORY_SEGMENT,
  TEST_FILE_PATTERN,
} from "./workspace.constants";

import type {
  BuildExclusionsArguments,
  DiscoverProjectsArguments,
  FileFilter,
  WorkspaceProject,
} from "./workspace.types";
import type { ModuleId } from "@callidescope/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Finds the projects a run traces, and names the module every file belongs to.
 *
 * Module identity is derived from the enforced repository layout rather than
 * guessed, which is what makes the cohesion findings mean something: two files
 * share a module identifier only when the structure says they are one unit.
 */
@Injectable()
/* v8 ignore stop */
export class WorkspaceService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(WorkspaceService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Asks git which tracked files an ignore file excludes.
   *
   * Delegating to git rather than reimplementing gitignore matching is what
   * makes `.callidescopeignore` behave the way its syntax promises. The
   * argument vector form of `execFileSync` keeps a configured path out of a
   * shell.
   */
  private listIgnoredFiles(args: {
    ignorePath: string;
    workspaceRoot: string;
  }): string[] {
    try {
      const output = execFileSync(
        "git",
        [
          "ls-files",
          "--cached",
          "--ignored",
          `--exclude-from=${args.ignorePath}`,
        ],
        { cwd: args.workspaceRoot, encoding: "utf8" },
      );

      return output.trim().split("\n").filter(Boolean);
    } catch {
      this.logger.warn("🔭 Skipped an unreadable ignore file", undefined, {
        ignorePath: args.ignorePath,
      });

      return [];
    }
  }

  /** Lists the project directories inside one container directory. */
  private listProjectRoots(args: {
    container: string;
    workspaceRoot: string;
  }): string[] {
    const containerPath = path.join(args.workspaceRoot, args.container);

    if (!existsSync(containerPath)) {
      return [];
    }

    return readdirSync(containerPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${args.container}/${entry.name}`)
      .filter((root) =>
        existsSync(path.join(args.workspaceRoot, root, "project.json")),
      );
  }

  /** Reads a project's declared name, falling back to its directory name. */
  private readProjectName(args: {
    manifestPath: string;
    root: string;
  }): string {
    try {
      const manifest: unknown = JSON.parse(
        readFileSync(args.manifestPath, "utf8"),
      );

      if (typeof manifest === "object" && manifest !== null) {
        const { name } = manifest as { name?: unknown };

        if (typeof name === "string" && name.length > 0) {
          return name;
        }
      }
    } catch {
      this.logger.warn("🔭 Skipped an unreadable project manifest", undefined, {
        manifestPath: args.manifestPath,
      });
    }

    return path.basename(args.root);
  }

  // 🌎 Public Methods

  /**
   * Builds the predicate deciding which files stay out of the graph.
   *
   * Exclusion globs are matched with Node's own `path.matchesGlob` rather than
   * a dependency, and gitignore-syntax files are resolved through git itself.
   */
  public buildFileFilter(args: BuildExclusionsArguments): FileFilter {
    const ignored = new Set<string>();

    for (const ignoreFile of args.excludeFrom) {
      const ignorePath = path.resolve(args.workspaceRoot, ignoreFile);

      if (!existsSync(ignorePath)) {
        this.logger.warn("🔭 Skipped a missing ignore file", undefined, {
          ignoreFile,
        });
        continue;
      }

      for (const filePath of this.listIgnoredFiles({
        ignorePath,
        workspaceRoot: args.workspaceRoot,
      })) {
        ignored.add(filePath);
      }
    }

    const globs = [...args.exclude];

    return {
      isExcluded: (workspaceRelativePath: string): boolean =>
        ignored.has(workspaceRelativePath) ||
        globs.some((glob) => path.matchesGlob(workspaceRelativePath, glob)),
    };
  }

  /**
   * Finds every Nx project holding a `tsconfig.json`.
   *
   * A project without one cannot be turned into a program, so it is skipped
   * rather than reported: a Python project is not a gap in the call graph.
   */
  public discoverProjects(args: DiscoverProjectsArguments): WorkspaceProject[] {
    const wanted = new Set(args.projectNames);
    const projects: WorkspaceProject[] = [];

    for (const container of PROJECT_CONTAINER_DIRECTORIES) {
      const roots = this.listProjectRoots({
        container,
        workspaceRoot: args.workspaceRoot,
      });

      for (const root of roots) {
        const configurationPath = path.join(
          args.workspaceRoot,
          root,
          "tsconfig.json",
        );

        if (!existsSync(configurationPath)) {
          continue;
        }

        const name = this.readProjectName({
          manifestPath: path.join(args.workspaceRoot, root, "project.json"),
          root,
        });

        if (wanted.size === 0 || wanted.has(name)) {
          projects.push({ configurationPath, name, root });
        }
      }
    }

    // Sorted so that the file-ownership tie-break, and therefore every depth
    // the run reports, does not depend on directory iteration order.
    return projects.toSorted((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  /** True when a path names a test file, or scaffolding written for tests. */
  public isTestFile(filePath: string): boolean {
    return (
      TEST_FILE_PATTERN.test(filePath) ||
      filePath.split("/").includes(TEST_DIRECTORY_SEGMENT)
    );
  }

  /**
   * Names the module a file belongs to: `<project>:<subtree>`.
   *
   * A file under `src/modules/<name>/` is identified by that module. Anything
   * else falls back to its first `src/` subdirectory, so routes and components
   * still group into something a finding can name.
   */
  public resolveModuleId(args: {
    project: WorkspaceProject;
    workspaceRelativePath: string;
  }): ModuleId {
    const relative = path.posix.relative(
      args.project.root,
      args.workspaceRelativePath,
    );
    const segments = relative.split("/");
    const [head, ...rest] = segments;

    if (head !== "src" || rest.length <= 1) {
      return `${args.project.name}:${ROOT_MODULE_SEGMENT}`;
    }

    const [first, second] = rest;

    if (first === MODULES_DIRECTORY && second !== undefined) {
      return `${args.project.name}:${MODULES_DIRECTORY}/${second}`;
    }

    return `${args.project.name}:${first ?? ROOT_MODULE_SEGMENT}`;
  }

  /** Rewrites an absolute path as workspace-relative with POSIX separators. */
  public toWorkspaceRelative(args: {
    absolutePath: string;
    workspaceRoot: string;
  }): string {
    return path
      .relative(args.workspaceRoot, args.absolutePath)
      .split(path.sep)
      .join("/");
  }
}
