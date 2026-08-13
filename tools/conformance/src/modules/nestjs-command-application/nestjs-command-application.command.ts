import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { createWorkspaceTree } from "../../utilities";
import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import type {
  NestjsCommandApplicationOptions,
  NestjsCommandApplicationSubstitutions,
} from "./nestjs-command-application.types";
import type { Tree } from "@nx/devkit";

/**
 * Generates a NestJS command application scaffold from templates.
 */
@Command({
  description: "Run the nestjs-command-application command",
  name: "nestjs-command-application",
})
@Injectable()
export class NestjsCommandApplicationCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly generatorService: GeneratorService,
    private readonly resolverService: ResolverService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(NestjsCommandApplicationCommand.name);
  }

  // 🔐 Private Fields

  private readonly logEmoji: string = "🖥️";

  private readonly nameMessage: string =
    "What is the name of the application? (kebab-case)";
  private readonly optionsLogLabel: string =
    "NestJS command application options";
  private readonly outputFilesLogLabel: string =
    "NestJS command application output files";
  private readonly projectExistsError: string = `Directory already exists. Choose a different application name.`;
  private readonly tree: Tree = createWorkspaceTree();
  private readonly typeMessage: string =
    "What type of NestJS command application should be generated?";

  // 🔑 Public Fields

  public readonly templateDirectoryPath: string =
    "tools/conformance/src/modules/nestjs-command-application/templates";

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Parses the optional application name argument.
   */
  @Option({
    description: "Application name (kebab-case)",
    flags: "-n, --name [name]",
  })
  async resolveName(value: string | undefined): Promise<string> {
    return this.resolverService.resolveName({
      message: this.nameMessage,
      value,
    });
  }

  /**
   * Resolves the type for generated command applications.
   */
  @Option({
    description: "Type (for example applications or tools)",
    flags: "-t, --type [type]",
  })
  async resolveType(value: string | undefined): Promise<string> {
    return await this.resolverService.resolveType({
      message: this.typeMessage,
      value,
    });
  }

  /**
   * Runs generator command orchestration and logs success output.
   */
  async run(
    _passedParameters: string[],
    options: NestjsCommandApplicationOptions,
  ): Promise<void> {
    const name: string = await this.resolveName(options.name);
    const type: string = await this.resolveType(options.type);
    const instanceDirectoryPath = path.join(type, name);

    this.logger.log(
      this.generatorService.buildLogMessage({
        data: {
          input: options,
          resolved: { name, type },
        },
        emoji: this.logEmoji,
        label: this.optionsLogLabel,
      }),
    );

    if (this.tree.exists(instanceDirectoryPath)) {
      throw new Error(
        `Directory "${instanceDirectoryPath}" already exists. ${this.projectExistsError}`,
      );
    }

    const substitutions: NestjsCommandApplicationSubstitutions = {
      ...this.generatorService.buildNameSubstitutions(name),
      type,
    };

    const outputFiles =
      await this.generatorService.generateFiles<NestjsCommandApplicationSubstitutions>(
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
