import path from "node:path";

import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { LoggerService } from "@codebase/logger";

import { WorkspaceService } from "../workspace/workspace.service";

import { CompilerHostService } from "./compiler-host.service";
import { ProgramConfigurationError } from "./program.constants";

import type { WorkspaceProject } from "../workspace/workspace.types";
import type {
  BuildProgramsArguments,
  ProgramSet,
  ProjectProgram,
} from "./program.types";

/**
 * Turns each project's `tsconfig.json` into a program and a type checker.
 *
 * One program per project rather than one merged program, and that is a
 * correctness decision rather than a performance one. The projects here
 * disagree about `jsx`, `lib`, `types`, and `paths`; merging their options
 * changes which globals exist and how modules resolve, so the checker starts
 * answering with different symbols and the call graph silently gains wrong
 * edges. Paying for twenty-odd programs buys the right answer.
 */
@Injectable()
export class ProgramService {
  // 🏗 Dependency Injection

  constructor(
    private readonly compilerHostService: CompilerHostService,
    private readonly logger: LoggerService,
    private readonly workspaceService: WorkspaceService,
  ) {
    this.logger.setContext(ProgramService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Assigns each file to the program whose project root contains it.
   *
   * Projects overlap: a project that nests a second `tsconfig.json` beneath
   * it can list the same file as its parent, when the parent's own `include`
   * is broad enough to reach it too. Containment settles that overlap by the
   * file's location on disk rather than by which program asked first, which
   * is what keeps a reported depth the same however a run is scoped — a
   * closure that starts programs in a different order reaches the same
   * answer. A file none of `programs`' projects contains is left out of the
   * map rather than guessed at; `readOwnedPath` in `CallablesService` then
   * walks it through no program at all.
   */
  private assignOwnership(args: {
    programs: readonly ProjectProgram[];
    workspaceRoot: string;
  }): Map<string, ProjectProgram> {
    // Resolved through `toRealPath` too, so it lines up with `filePath`
    // below, which every owned path already went through to reach — a
    // workspace reached through a symlink would otherwise turn every
    // relative path into a string of `../` that contains nothing.
    const workspaceRoot = this.toRealPath(args.workspaceRoot);
    const projects = args.programs.map(
      (projectProgram) => projectProgram.project,
    );
    const filePaths = new Set<string>();

    for (const projectProgram of args.programs) {
      for (const filePath of projectProgram.ownedFilePaths) {
        filePaths.add(filePath);
      }
    }

    const ownerByFilePath = new Map<string, ProjectProgram>();

    for (const filePath of filePaths) {
      const workspaceRelativePath = this.workspaceService.toWorkspaceRelative({
        absolutePath: filePath,
        workspaceRoot,
      });
      const owningProject = this.workspaceService.resolveOwningProject({
        projects,
        workspaceRelativePath,
      });
      const projectProgram = args.programs.find(
        (candidate) => candidate.project === owningProject,
      );

      if (projectProgram === undefined) {
        this.logger.warn(
          "🔭 Skipped a file no traced project contains",
          undefined,
          { workspaceRelativePath },
        );
        continue;
      }

      ownerByFilePath.set(filePath, projectProgram);
    }

    return ownerByFilePath;
  }

  /** Builds one project's program, checker, and owned-file set. */
  private buildProgram(args: {
    project: WorkspaceProject;
    workspaceRoot: string;
  }): ProjectProgram {
    const parsed = this.parseConfiguration(args.project);
    const host = this.compilerHostService.createHost({
      options: parsed.options,
      workspaceRoot: args.workspaceRoot,
    });
    const program = ts.createProgram({
      host,
      options: parsed.options,
      rootNames: parsed.fileNames,
    });

    return {
      checker: program.getTypeChecker(),
      ownedFilePaths: new Set(
        parsed.fileNames.map((fileName) => this.toRealPath(fileName)),
      ),
      program,
      project: args.project,
    };
  }

  /**
   * Reads and fully resolves one project's compiler options.
   *
   * The configuration file name is passed as the fifth argument because that is
   * what makes TypeScript follow the `extends` chain to the shared base config
   * and report diagnostics against the right file.
   */
  private parseConfiguration(project: WorkspaceProject): ts.ParsedCommandLine {
    // Wrapped rather than passed as a bare reference: handing over
    // `ts.sys.readFile` detaches it from `ts.sys`, and any implementation that
    // reads `this` would break in a way that only shows up at run time.
    // The source-file form rather than `readConfigFile`, whose `config` is
    // typed `any` — letting that in would quietly strip the types off everything the parsed
    // configuration touches downstream.
    const sourceFile = ts.readJsonConfigFile(
      project.configurationPath,
      (fileName) => ts.sys.readFile(fileName),
    );
    const parsed = ts.parseJsonSourceFileConfigFileContent(
      sourceFile,
      ts.sys,
      path.dirname(project.configurationPath),
      undefined,
      project.configurationPath,
    );

    if (parsed.errors.length > 0) {
      throw new ProgramConfigurationError({
        configurationPath: project.configurationPath,
        messages: parsed.errors.map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
        ),
      });
    }

    return parsed;
  }

  // 🌎 Public Methods

  /**
   * Builds every project's program and decides which one owns each file.
   *
   * A project whose configuration cannot be parsed ends the run rather than
   * being stepped over — see `ProgramConfigurationError` for why a partial
   * graph is the worse outcome. A project that should not be read at all is
   * kept out by an exclusion, which `WorkspaceService.discoverProjects`
   * applies before this ever sees it.
   */
  public buildPrograms(args: BuildProgramsArguments): ProgramSet {
    const programs: ProjectProgram[] = [];

    for (const project of args.projects) {
      this.logger.debug("🔭 Reading a project", undefined, {
        projectName: project.name,
      });
      programs.push(
        this.buildProgram({ project, workspaceRoot: args.workspaceRoot }),
      );
    }

    return {
      ownerByFilePath: this.assignOwnership({
        programs,
        workspaceRoot: args.workspaceRoot,
      }),
      programs,
    };
  }

  /** Resolves a path through symlinks, which is how pnpm workspaces link. */
  public toRealPath(filePath: string): string {
    return ts.sys.realpath === undefined ? filePath : ts.sys.realpath(filePath);
  }
}
