import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { createWorkspaceTree } from "../../utilities";
import { COMPONENTS_DIRECTORY_PATH } from "../generator/generator.constants";
import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import type {
  ReactComponentOptions,
  ReactComponentSubstitutions,
} from "./react-component.types";
import type { Tree } from "@nx/devkit";

/**
 * Generates a React component scaffold from templates.
 */
@Command({
  description: "Run the react-component command",
  name: "react-component",
})
@Injectable()
export class ReactComponentCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly generatorService: GeneratorService,
    private readonly resolverService: ResolverService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ReactComponentCommand.name);
  }

  // 🔐 Private Fields

  private readonly componentsDirectoryPath: string = COMPONENTS_DIRECTORY_PATH;

  private readonly logEmoji: string = "⚛️";
  private readonly nameMessage: string =
    "What is the name of the component? (kebab-case)";
  private readonly optionsLogLabel: string = "React component options";
  private readonly outputFilesLogLabel: string = "React component output files";
  private readonly projectMessage: string =
    "Which project should the component be generated in?";
  private readonly tree: Tree = createWorkspaceTree();

  // 🔑 Public Fields

  public readonly tag: string = "framework:react";
  public readonly templateDirectoryPath: string =
    "tools/conformance/src/modules/react-component/templates";

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Parses the optional component name argument.
   */
  @Option({
    description: "Component name (kebab-case)",
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
    options: ReactComponentOptions,
  ): Promise<void> {
    const name: string = await this.resolveName(options.name);
    const project: string = await this.resolveProject(options.project);
    const resolvedOptions = { name, project };

    this.logger.log(
      this.generatorService.buildLogMessage({
        data: {
          input: options,
          resolved: resolvedOptions,
        },
        emoji: this.logEmoji,
        label: this.optionsLogLabel,
      }),
    );

    const instanceDirectoryPath =
      this.resolverService.resolveProjectDirectoryPath(
        this.tree,
        project,
        this.componentsDirectoryPath,
      );

    const substitutions: ReactComponentSubstitutions =
      this.generatorService.buildNameSubstitutions(name);

    const outputFiles =
      await this.generatorService.generateFiles<ReactComponentSubstitutions>({
        instanceDirectoryPath,
        substitutions,
        templateDirectoryPath: this.templateDirectoryPath,
        tree: this.tree,
      });

    this.logger.log(
      this.generatorService.buildLogMessage({
        data: outputFiles,
        emoji: this.logEmoji,
        label: this.outputFilesLogLabel,
      }),
    );
  }
}
