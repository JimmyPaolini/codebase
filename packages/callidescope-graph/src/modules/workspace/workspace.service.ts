import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import {
  MISSING_PROJECT_CONFIGURATION_MESSAGE,
  ProgramConfigurationError,
} from "../program/program.constants";

import {
  DEFAULT_MODULES_DIRECTORY,
  DEFAULT_ROOT_MODULE_SEGMENT,
  EXCLUDED_SCAN_DIRECTORY_NAMES,
  PROJECT_CONFIGURATION_NAME,
  TEST_DIRECTORY_SEGMENT,
  TEST_FILE_PATTERN,
} from "./workspace.constants";

import type {
  BuildExclusionsArguments,
  DiscoverProjectsArguments,
  FileFilter,
  ResolveDependencyClosureArguments,
  WorkspaceProject,
  WorkspaceStructure,
} from "./workspace.types";
import type { ModuleId } from "@callidescope/configuration";

/**
 * Finds the projects a run traces, and names the module every file belongs to.
 *
 * Module identity is derived from a configured directory layout rather than
 * guessed, which is what makes the cohesion findings mean something: two files
 * share a module identifier only when the structure says they are one unit.
 * The layout defaults to this repository's own, and `configure` points it at
 * another workspace's instead.
 */
@Injectable()
export class WorkspaceService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(WorkspaceService.name);
  }

  // 🔐 Private Fields

  private modulesDirectory: string = DEFAULT_MODULES_DIRECTORY;

  private rootModuleSegment: string = DEFAULT_ROOT_MODULE_SEGMENT;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Walks the whole workspace for every directory holding a `tsconfig.json`. */
  private findAllProjectDirectories(workspaceRoot: string): string[] {
    const found: string[] = [];

    this.findProjectDirectories({
      directory: workspaceRoot,
      found,
      workspaceRoot,
    });

    return found;
  }

  /**
   * Walks a directory recursively, collecting every subdirectory that holds
   * its own `tsconfig.json`.
   *
   * Descends into a `tsconfig.json`-holding directory too rather than
   * stopping there: a project nesting a second program under it — a
   * `testing/tsconfig.json`, a generated subpackage — is not a reason to miss
   * everything below it, and the directories this skips already keep the walk
   * from wandering into a dependency or a build artifact.
   */
  private findProjectDirectories(args: {
    directory: string;
    found: string[];
    workspaceRoot: string;
  }): void {
    if (existsSync(path.join(args.directory, PROJECT_CONFIGURATION_NAME))) {
      args.found.push(
        this.toWorkspaceRelative({
          absolutePath: args.directory,
          workspaceRoot: args.workspaceRoot,
        }),
      );
    }

    for (const entry of readdirSync(args.directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || this.isExcludedFromScan(entry.name)) {
        continue;
      }

      this.findProjectDirectories({
        directory: path.join(args.directory, entry.name),
        found: args.found,
        workspaceRoot: args.workspaceRoot,
      });
    }
  }

  /**
   * True when a project's root is a path-segment prefix of a file's path.
   *
   * A plain `startsWith` on the raw strings would let `packages/callidescope`
   * falsely contain `packages/callidescope-graph/...` — the empty root is the
   * one exception, since the workspace root itself contains every file.
   */
  private isContainedByRoot(args: {
    root: string;
    workspaceRelativePath: string;
  }): boolean {
    return (
      args.root === "" ||
      args.workspaceRelativePath === args.root ||
      args.workspaceRelativePath.startsWith(`${args.root}/`)
    );
  }

  /**
   * True for a directory a whole-workspace scan should never descend into.
   *
   * A name holding `{{`/`}}` is a scaffolding template's own placeholder
   * directory, never a real one — its `tsconfig.json`, if it has one, is
   * written for a generator to fill in later and cannot build a program on
   * its own.
   */
  private isExcludedFromScan(directoryName: string): boolean {
    return (
      directoryName.startsWith(".") ||
      directoryName.includes("{{") ||
      (EXCLUDED_SCAN_DIRECTORY_NAMES as readonly string[]).includes(
        directoryName,
      )
    );
  }

  /** True when an exclusion already names the project's own `tsconfig.json`. */
  private isExcludedProject(args: {
    configurationPath: string;
    fileFilter: FileFilter | undefined;
    workspaceRoot: string;
  }): boolean {
    return (
      args.fileFilter?.isExcluded(
        this.toWorkspaceRelative({
          absolutePath: args.configurationPath,
          workspaceRoot: args.workspaceRoot,
        }),
      ) === true
    );
  }

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
   * Points module identity at a workspace's own layout.
   *
   * Defaults to this repository's own layout so a caller that never invokes
   * this keeps today's behavior; a host embedding callidescope calls this
   * once, before tracing, to describe its own repository instead.
   */
  public configure(structure: WorkspaceStructure): void {
    this.modulesDirectory = structure.modulesDirectory;
    this.rootModuleSegment = structure.rootModuleSegment;
  }

  /**
   * Resolves the project directories a run will trace.
   *
   * Each of `args.directories` is trusted as a project root outright rather
   * than searched for a `tsconfig.json` beneath it: naming a directory is
   * the caller saying exactly what it means to trace. Passing none is what
   * asks for the whole workspace instead, found by walking it for every
   * `tsconfig.json` there is — the only case that needs a search at all.
   *
   * A project an exclusion names is dropped here, before its `tsconfig.json`
   * is ever opened. Excluding later — once the files a program yielded are
   * being filtered — is too late to help: reading the configuration is itself
   * what fails on a `tsconfig.json` written to be unreadable, so an exclusion
   * that only reaches the files cannot keep the run away from it.
   *
   * A named directory holding no `tsconfig.json` ends the run through
   * `ProgramConfigurationError`, the same way one holding an unreadable
   * `tsconfig.json` does. Naming a directory is the caller saying it should be
   * traced, so a run that quietly traced one fewer project than it was asked
   * to would report depths for a workspace nobody described — and a typo in a
   * `--directories` list would pass every gate for having looked at less. The
   * whole-workspace walk cannot reach this: it only ever yields directories a
   * `tsconfig.json` was found in.
   */
  public discoverProjects(args: DiscoverProjectsArguments): WorkspaceProject[] {
    const roots =
      args.directories.length > 0
        ? args.directories.map((directory) =>
            this.toWorkspaceRelative({
              absolutePath: path.resolve(args.workspaceRoot, directory),
              workspaceRoot: args.workspaceRoot,
            }),
          )
        : this.findAllProjectDirectories(args.workspaceRoot);

    const projects: WorkspaceProject[] = [];

    for (const root of roots) {
      const configurationPath = path.join(
        args.workspaceRoot,
        root,
        PROJECT_CONFIGURATION_NAME,
      );

      if (
        this.isExcludedProject({
          configurationPath,
          fileFilter: args.fileFilter,
          workspaceRoot: args.workspaceRoot,
        })
      ) {
        this.logger.debug("🔭 Skipped an excluded project", undefined, {
          root,
        });
        continue;
      }

      if (!existsSync(configurationPath)) {
        throw new ProgramConfigurationError({
          configurationPath,
          messages: [MISSING_PROJECT_CONFIGURATION_MESSAGE],
        });
      }

      projects.push({ configurationPath, name: root, root });
    }

    // Sorted so that a report's per-project rows — and anything else keyed
    // off this order — read the same on every run, rather than however the
    // filesystem happened to enumerate directories this time.
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
   * Resolves the projects a set of starting roots' imports transitively
   * reach — a starting project's dependency closure.
   *
   * `args.resolveProjectFiles` reports the workspace-relative paths one
   * project's program pulled in; this method owns only the fixed-point walk
   * over those reports, never how a program comes to exist. Each reported
   * path is walked back to its owning project through `resolveOwningProject`
   * against `args.workspaceProjects`, so a path `node_modules` holds, or one
   * no traced project's root contains, resolves to `undefined` and never
   * manufactures a project that is not there. A project already reached is
   * never asked again, which is what makes a cycle between two projects
   * terminate instead of looping forever.
   *
   * Every starting project is in the result, even one whose program pulls in
   * nothing outside itself, and a project's dependents never are — nothing
   * here walks from a file to whoever imports it, only from a project to what
   * its own program reaches. The result is sorted by name, so the same
   * starting roots resolve to the same set whichever order they were given
   * in.
   */
  public resolveDependencyClosure(
    args: ResolveDependencyClosureArguments,
  ): WorkspaceProject[] {
    const reached = new Map<string, WorkspaceProject>();
    let pending = args.startingProjects;

    while (pending.length > 0) {
      const next: WorkspaceProject[] = [];

      for (const project of pending) {
        if (reached.has(project.name)) {
          continue;
        }

        reached.set(project.name, project);

        for (const workspaceRelativePath of args.resolveProjectFiles(project)) {
          const owner = this.resolveOwningProject({
            projects: args.workspaceProjects,
            workspaceRelativePath,
          });

          if (owner !== undefined && !reached.has(owner.name)) {
            next.push(owner);
          }
        }
      }

      pending = next;
    }

    return [...reached.values()].toSorted((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  /**
   * Names the module a file belongs to: `<project>:<subtree>`.
   *
   * A file under `<root>/<modules>/<name>/` is identified by that module.
   * Anything else falls back to its first subdirectory under the source
   * root, so routes and components still group into something a finding can
   * name.
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

    if (head !== this.rootModuleSegment || rest.length <= 1) {
      return `${args.project.name}:${this.rootModuleSegment}`;
    }

    const [first, second] = rest;

    if (first === this.modulesDirectory && second !== undefined) {
      return `${args.project.name}:${this.modulesDirectory}/${second}`;
    }

    return `${args.project.name}:${first ?? this.rootModuleSegment}`;
  }

  /**
   * Names the traced project whose root most narrowly contains a file.
   *
   * "Contains" means the deepest of `args.projects` whose root is a
   * path-segment prefix of `args.workspaceRelativePath` — never a shallower
   * ancestor, and never a sibling that merely shares a string prefix. This is
   * what settles a project that nests a second `tsconfig.json` beneath it (a
   * `testing/tsconfig.json`, a generated subpackage): the nested root is more
   * specific than the parent's, so a file under it belongs to the nested
   * project even when the parent's own configuration also lists that file.
   *
   * Returns `undefined` when none of `args.projects` contains the file at
   * all — impossible for a whole-workspace run, since the workspace root
   * itself is always a traced project, but reachable when a run is scoped to
   * a handful of directories that do not include it.
   */
  public resolveOwningProject(args: {
    projects: readonly WorkspaceProject[];
    workspaceRelativePath: string;
  }): undefined | WorkspaceProject {
    let owner: undefined | WorkspaceProject;

    for (const project of args.projects) {
      if (
        !this.isContainedByRoot({
          root: project.root,
          workspaceRelativePath: args.workspaceRelativePath,
        })
      ) {
        continue;
      }

      if (owner === undefined || project.root.length > owner.root.length) {
        owner = project;
      }
    }

    return owner;
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
