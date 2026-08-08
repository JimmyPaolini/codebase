import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { DiscoverFilesService } from "../discover-files/discover-files.service";
import { LoggerService } from "../logger/logger.service";
import { MeasureJsonService } from "../measure-json/measure-json.service";
import { MeasurePythonService } from "../measure-python/measure-python.service";
import { MeasureTypescriptService } from "../measure-typescript/measure-typescript.service";
import { WriteReadmeService } from "../write-readme/write-readme.service";

import { CodometerService } from "./codometer.service";

import type { CodometerCommandOptions } from "./codometer.command.types";

/**
 * CLI entry point for the repository measurement workflow.
 */
@Command({
  description: "Run the codometer command",
  name: "codometer",
})
@Injectable()
export class CodometerCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LoggerService) private readonly logger: LoggerService,
    @Inject(CodometerService) measureService?: CodometerService,
    @Inject(WriteReadmeService) writeReadmeService?: WriteReadmeService,
  ) {
    super();
    this.logger.setContext(CodometerCommand.name);
    this.measureService = measureService ?? this.createCodometerService();
    this.writeReadmeService = writeReadmeService ?? new WriteReadmeService();
    this.registerOptionMetadata("parseDirectory", {
      description: "Directory to analyze",
      flags: "-d, --directory [directory]",
    });
    this.registerOptionMetadata("parseReadme", {
      description: "Optional README path to update with generated badges",
      flags: "-r, --readme [readme]",
    });
    this.registerOptionMetadata("parseCheck", {
      description: "Validate README badges without writing changes",
      flags: "--check",
    });
  }

  // 🔐 Private Fields

  private static readonly optionMetadataKey = "CommandBuilder:Option:Meta";

  private readonly measureService: CodometerService;

  private readonly writeReadmeService: WriteReadmeService;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Create the codometer service graph used when no dependencies are injected.
   */
  private createCodometerService(): CodometerService {
    const discoverFilesService = new DiscoverFilesService();
    const measureTypescriptService = new MeasureTypescriptService();
    const measurePythonService = new MeasurePythonService();
    const measureJsonService = new MeasureJsonService();

    return new CodometerService(
      discoverFilesService,
      measureTypescriptService,
      measurePythonService,
      measureJsonService,
    );
  }

  /**
   * Register option metadata so nest-commander can expose the CLI flags.
   */
  private registerOptionMetadata(
    propertyKey: string,
    options: { description: string; flags: string },
  ): void {
    const descriptor = Object.getOwnPropertyDescriptor(
      CodometerCommand.prototype,
      propertyKey,
    ) as undefined | { value?: unknown };

    if (descriptor?.value !== undefined) {
      const descriptorValue = descriptor.value;

      if (typeof descriptorValue === "function") {
        Reflect.defineMetadata(
          CodometerCommand.optionMetadataKey,
          options,
          descriptorValue,
        );
      }
    }
  }

  // 🌎 Public Methods

  /**
   * Parse the optional check mode flag from command-line input.
   */
  parseCheck(value: boolean | string | undefined): boolean {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }

    return false;
  }

  /**
   * Parse the directory option from command-line input.
   */
  parseDirectory(value: string | undefined): string {
    return value ?? process.cwd();
  }

  /**
   * Parse the optional README option from command-line input.
   */
  parseReadme(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Measure the repository and optionally update the README with generated badges.
   */
  async run(
    _passedParameters: string[],
    options: CodometerCommandOptions,
  ): Promise<void> {
    const directory = this.parseDirectory(options.directory);
    const statistics = this.measureService.measure(directory);
    const checkMode = this.parseCheck(options.check);
    const readmePath = this.parseReadme(options.readme);

    await Promise.resolve();

    if (readmePath) {
      const isCurrent = this.writeReadmeService.syncReadme(
        readmePath,
        statistics,
        checkMode,
      );

      if (checkMode) {
        if (!isCurrent) {
          console.error("README badges are out of date");
          process.exitCode = 1;
        }

        return;
      }

      return;
    }

    process.stdout.write(`${JSON.stringify(statistics, null, 2)}\n`);
  }
}
