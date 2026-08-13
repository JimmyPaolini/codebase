import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { APPLICATIONS_DIRECTORY } from "../../constants";
import { createWorkspaceTree } from "../../utilities";
import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import type {
  NestjsGraphqlApplicationOptions,
  NestjsGraphqlApplicationSubstitutions,
} from "./nestjs-graphql-application.types";
import type { Tree } from "@nx/devkit";

/**
 * Generates a NestJS GraphQL application scaffold from templates.
 */
@Command({
  description: "Run the nestjs-graphql-application command",
  name: "nestjs-graphql-application",
})
@Injectable()
export class NestjsGraphqlApplicationCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly generatorService: GeneratorService,
    private readonly resolverService: ResolverService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(NestjsGraphqlApplicationCommand.name);
  }

  // 🔐 Private Fields

  private readonly logEmoji: string = "🕸️";

  private readonly nameMessage: string =
    "What is the name of the application? (kebab-case)";
  private readonly optionsLogLabel: string =
    "NestJS GraphQL application options";
  private readonly outputFilesLogLabel: string =
    "NestJS GraphQL application output files";
  private readonly projectExistsError: string = `Directory already exists. Choose a different application name.`;
  private readonly tree: Tree = createWorkspaceTree();

  // 🔑 Public Fields

  public readonly templateDirectoryPath: string =
    "tools/conformance/src/modules/nestjs-graphql-application/templates";

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
   * Runs generator command orchestration and logs success output.
   */
  async run(
    _passedParameters: string[],
    options: NestjsGraphqlApplicationOptions,
  ): Promise<void> {
    const name: string = await this.resolveName(options.name);
    const instanceDirectoryPath = path.join(APPLICATIONS_DIRECTORY, name);

    this.logger.log(
      this.generatorService.buildLogMessage({
        data: {
          input: options,
          resolved: { name },
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

    const substitutions: NestjsGraphqlApplicationSubstitutions =
      this.generatorService.buildNameSubstitutions(name);

    const outputFiles =
      await this.generatorService.generateFiles<NestjsGraphqlApplicationSubstitutions>(
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
