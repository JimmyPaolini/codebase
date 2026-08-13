import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { MODULES_DIRECTORY } from "../../constants";
import { createWorkspaceTree } from "../../utilities";
import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import type {
  NestjsServiceFileOptions,
  NestjsServiceFileSubstitutions,
} from "./nestjs-service-file.types";
import type { Tree } from "@nx/devkit";

/**
 * Generates NestJS service files from templates.
 */
@Command({
  description: "Run the nestjs-service-file command",
  name: "nestjs-service-file",
})
@Injectable()
export class NestjsServiceFileCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly generatorService: GeneratorService,
    private readonly resolverService: ResolverService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(NestjsServiceFileCommand.name);
  }

  // 🔐 Private Fields

  private readonly logEmoji: string = "🛠️";

  private readonly moduleMessage: string =
    "Which module should the service files be generated in?";
  private readonly nameMessage: string =
    "What is the name of the service? (kebab-case)";
  private readonly optionsLogLabel: string = "NestJS service file options";
  private readonly outputFilesLogLabel: string =
    "NestJS service file output files";
  private readonly projectMessage: string =
    "Which project should the service files be generated in?";
  private readonly tree: Tree = createWorkspaceTree();

  // 🔑 Public Fields

  public readonly tag: string = "framework:nestjs";
  public readonly templateDirectoryPath: string =
    "tools/conformance/src/modules/nestjs-service-file/templates";

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Resolves and validates the destination module for generated service files.
   */
  @Option({
    description: "Target module name (kebab-case)",
    flags: "-m, --module [module]",
  })
  async resolveModule(args: {
    module?: string;
    projectName: string;
  }): Promise<string> {
    return await this.resolverService.resolveModule({
      message: this.moduleMessage,
      project: args.projectName,
      tree: this.tree,
      value: args.module,
    });
  }

  /**
   * Parses the optional service name argument.
   */
  @Option({
    description: "Service name (kebab-case)",
    flags: "-n, --name [name]",
  })
  async resolveName(value: string | undefined): Promise<string> {
    return this.resolverService.resolveName({
      message: this.nameMessage,
      value,
    });
  }

  /**
   * Parses the optional parent project argument.
   */
  @Option({
    description: "Parent project name (kebab-case)",
    flags: "-p, --project [project]",
  })
  async resolveProject(value: string | undefined): Promise<string> {
    return this.resolverService.resolveProject({
      message: this.projectMessage,
      tag: this.tag,
      tree: this.tree,
      value,
    });
  }

  /**
   * Runs generator command orchestration and logs success output.
   */
  async run(
    _passedParameters: string[],
    options: NestjsServiceFileOptions,
  ): Promise<void> {
    const name: string = await this.resolveName(options.name);
    const project: string = await this.resolveProject(options.project);

    const modulesDirectoryPath =
      this.resolverService.resolveProjectDirectoryPath(
        this.tree,
        project,
        MODULES_DIRECTORY,
      );

    const moduleName = await this.resolveModule({
      ...(options.module !== undefined && { module: options.module }),
      projectName: project,
    });

    this.logger.log(
      this.generatorService.buildLogMessage({
        data: {
          input: options,
          resolved: {
            module: moduleName,
            name,
            project,
          },
        },
        emoji: this.logEmoji,
        label: this.optionsLogLabel,
      }),
    );

    const instanceDirectoryPath = path.join(modulesDirectoryPath, moduleName);
    const substitutions: NestjsServiceFileSubstitutions =
      this.generatorService.buildNameSubstitutions(name);

    const outputFiles =
      await this.generatorService.generateFiles<NestjsServiceFileSubstitutions>(
        {
          instanceDirectoryPath,
          substitutions,
          templateDirectoryPath: this.templateDirectoryPath,
          tree: this.tree,
        },
      );

    this.logger.log(
      this.generatorService.buildLogMessage({
        data: outputFiles,
        emoji: this.logEmoji,
        label: this.outputFilesLogLabel,
      }),
    );
  }
}
