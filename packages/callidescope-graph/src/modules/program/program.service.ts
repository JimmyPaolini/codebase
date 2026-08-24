import path from "node:path";

import { Injectable } from "@nestjs/common";
import ts from "typescript";

import { LoggerService } from "@codebase/logger";

import { CompilerHostService } from "./compiler-host.service";
import { ProgramConfigurationError } from "./program.errors";

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
  ) {
    this.logger.setContext(ProgramService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Assigns each file to exactly one owning program.
   *
   * Projects overlap: a shared package appears in the file list of everything
   * that imports it. Whichever program is asked first keeps it, and because the
   * project list arrives sorted by name, that choice is the same on every run —
   * which is what stops a reported depth from moving between runs.
   */
  private assignOwnership(
    programs: readonly ProjectProgram[],
  ): Map<string, ProjectProgram> {
    const ownerByFilePath = new Map<string, ProjectProgram>();

    for (const projectProgram of programs) {
      for (const filePath of projectProgram.ownedFilePaths) {
        if (!ownerByFilePath.has(filePath)) {
          ownerByFilePath.set(filePath, projectProgram);
        }
      }
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

    return { ownerByFilePath: this.assignOwnership(programs), programs };
  }

  /** Resolves a path through symlinks, which is how pnpm workspaces link. */
  public toRealPath(filePath: string): string {
    return ts.sys.realpath === undefined ? filePath : ts.sys.realpath(filePath);
  }
}
