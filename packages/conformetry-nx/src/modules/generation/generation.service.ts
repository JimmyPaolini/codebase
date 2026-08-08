import { Injectable } from "@nestjs/common";
import {
  normalizeRuntimeOptions,
  resolveTargetDirectoryPath,
} from "@jimmypaolini/conformetry-configuration";
import { getProjects, type Tree } from "@nx/devkit";

import { CommandExecutionService } from "../command-execution/command-execution.service.js";
import { PluginOptionsService } from "../plugin-options/plugin-options.service.js";

import type { ConformetryNxPluginRegistrationOptions } from "../plugin-options/plugin-options.types.js";
import type { GeneratorCallback } from "@nx/devkit";

/**
 * Runs conformetry generators through the shared command-execution layer.
 */
@Injectable()
export class GenerationService {
  constructor(
    private readonly commandExecutionService: CommandExecutionService,
    private readonly pluginOptionsService: PluginOptionsService,
  ) {}

  /**
   * Builds passed parameters for GenerateCommand.run from normalized options.
   */
  public buildGeneratePassedParameters(args: {
    generatorInputs: Record<string, string | undefined>;
    name: string;
    targetDirectoryPath: string;
  }): string[] {
    const passedParameters = [
      "generate",
      "--name",
      args.name,
      "--directory",
      args.targetDirectoryPath,
    ];

    for (const [optionName, optionValue] of Object.entries(
      args.generatorInputs,
    )) {
      if (
        optionValue === undefined ||
        optionName === "config" ||
        optionName === "name" ||
        optionName === "targetDirectoryPath"
      ) {
        continue;
      }

      passedParameters.push(`--${this.toKebabCase(optionName)}`, optionValue);
    }

    return passedParameters;
  }

  /**
   * Runs a conformetry generator via the conformetry GenerateCommand runtime.
   */
  public async runConformetryGenerator(args: {
    generatorName: string;
    options: Record<string, unknown>;
    pluginOptions?: ConformetryNxPluginRegistrationOptions;
    tree: Tree;
  }): Promise<GeneratorCallback> {
    const normalizedPluginOptions = this.pluginOptionsService.resolveConformetryNxPluginOptions(
      args.pluginOptions,
    );
    const configurationPath = await this.pluginOptionsService.resolveConformetryConfigurationPath({
      options: args.options,
      pluginOptions: normalizedPluginOptions,
    });
    const targetDirectoryPath = await resolveTargetDirectoryPath({
      generatorName: args.generatorName,
      options: args.options,
      resolveProjectRootPath: ({ projectName }) => {
        const projectConfiguration = getProjects(args.tree).get(projectName);
        return projectConfiguration?.root ?? projectConfiguration?.sourceRoot;
      },
    });
    const generatorInputs = normalizeRuntimeOptions(args.options);

    await this.commandExecutionService.runGenerateCommand({
      configurationPath,
      generatorName: args.generatorName,
      passedParameters: this.buildGeneratePassedParameters({
        generatorInputs,
        name: args.generatorName,
        targetDirectoryPath,
      }),
      targetDirectoryPath,
    });

    return async (): Promise<void> => {};
  }

  private toKebabCase(value: string): string {
    return value.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
  }
}
