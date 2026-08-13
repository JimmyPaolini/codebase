import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { MODULES_DIRECTORY } from "../../constants";
import { createWorkspaceTree } from "../../utilities";
import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import type {
  NestjsServiceModuleOptions,
  NestjsServiceModuleSubstitutions,
} from "./nestjs-service-module.types";
import type { Tree } from "@nx/devkit";

/**
 * Generates a NestJS service module scaffold from templates.
 */
@Command({
  description: "Run the nestjs-service-module command",
  name: "nestjs-service-module",
})
@Injectable()
export class NestjsServiceModuleCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly generatorService: GeneratorService,
    private readonly resolverService: ResolverService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(NestjsServiceModuleCommand.name);
  }

  // 🔐 Private Fields

  private readonly logEmoji: string = "🧱";

  private readonly nameMessage: string =
    "What is the name of the module? (kebab-case)";
  private readonly optionsLogLabel: string = "NestJS service module options";
  private readonly outputFilesLogLabel: string =
    "NestJS service module output files";
  private readonly projectMessage: string =
    "Which project should the module be generated in?";
  private readonly tree: Tree = createWorkspaceTree();

  // 🔑 Public Fields

  public readonly tag: string = "framework:nestjs";
  public readonly templateDirectoryPath: string =
    "tools/conformance/src/modules/nestjs-service-module/templates";

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Parses the optional module name argument.
   */
  @Option({
    description: "Module name (kebab-case)",
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
    options: NestjsServiceModuleOptions,
  ): Promise<void> {
    const name: string = await this.resolveName(options.name);
    const project: string = await this.resolveProject(options.project);

    this.logger.log(
      this.generatorService.buildLogMessage({
        data: {
          input: options,
          resolved: { name, project },
        },
        emoji: this.logEmoji,
        label: this.optionsLogLabel,
      }),
    );

    const directory = this.resolverService.resolveProjectDirectoryPath(
      this.tree,
      project,
      MODULES_DIRECTORY,
    );

    const substitutions: NestjsServiceModuleSubstitutions =
      this.generatorService.buildNameSubstitutions(name);
    const instanceDirectoryPath = path.join(
      directory,
      substitutions.nameKebabCase,
    );

    const outputFiles =
      await this.generatorService.generateFiles<NestjsServiceModuleSubstitutions>(
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
