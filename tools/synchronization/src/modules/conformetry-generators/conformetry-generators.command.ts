import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type {
  ConformetryGeneratorMetadata,
  ConformetryGeneratorsTargetFile,
} from "./conformetry-generators.types";

/**
 * CLI command that syncs the conformetry generators table into AGENTS.md and
 * README.md. Reads configuration/conformetry.config.ts and injects a markdown
 * table between marker comments in both files.
 */
@Command({
  description: "Run the conformetry-generators command",
  name: "conformetry-generators",
})
@Injectable()
export class ConformetryGeneratorsCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly logger: LoggerService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(ConformetryGeneratorsCommand.name);
  }

  // 🔐 Private Fields

  private readonly targetFiles: ConformetryGeneratorsTargetFile[] = [
    { includeAlias: true, path: "AGENTS.md" },
    { includeAlias: false, path: "README.md" },
  ];

  // 🔑 Public Fields

  readonly synchronizationLabel = "conformetry-generators";

  // 🔏 Private Methods

  /**
   * Compares the generated generators table against the stored content in
   * every target file and reports any differences.
   */
  private checkSync(generators: ConformetryGeneratorMetadata[]): boolean {
    const outOfSyncFiles = this.targetFiles
      .filter((targetFile) => {
        const generatedTable = this.generateGeneratorsTable(
          generators,
          targetFile.includeAlias,
        ).trim();
        const { generatedContent } = this.readMarkedFile(targetFile.path);
        return generatedTable !== generatedContent.trim();
      })
      .map((targetFile) => targetFile.path);

    if (outOfSyncFiles.length > 0) {
      this.logger.info(
        "📇 Detected an out-of-sync conformetry generators table",
        undefined,
        {
          count: generators.length,
          files: outOfSyncFiles,
          hint: "Run 'nx run synchronization:conformetry-generators:write' to sync",
        },
      );
      return false;
    }

    this.logger.info(
      "📇 Verified the conformetry generators table",
      undefined,
      {
        count: generators.length,
      },
    );
    return true;
  }

  /**
   * Renders the list of generators as a markdown table for injection into a
   * target file, optionally including the Alias column.
   */
  private generateGeneratorsTable(
    generators: ConformetryGeneratorMetadata[],
    includeAlias: boolean,
  ): string {
    const header = includeAlias
      ? "| Template | Alias | Description |\n| -------- | ----- | ----------- |"
      : "| Template | Description |\n| -------- | ----------- |";
    const rows = generators.map((gen) => {
      if (!includeAlias) {
        return `| \`${gen.name}\` | ${gen.description} |`;
      }
      const alias = gen.aliases.map((a) => `\`${a}\``).join(", ");
      return `| \`${gen.name}\` | ${alias} | ${gen.description} |`;
    });
    return [header, ...rows].join("\n");
  }

  /**
   * Reads configuration/conformetry.config.ts and returns the list of generator metadata.
   */
  private async readGenerators(): Promise<ConformetryGeneratorMetadata[]> {
    const configurationPath = path.join(
      process.cwd(),
      "configuration/conformetry.config.ts",
    );

    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        configurationPath,
      );

    return configuration.map((generator) => ({
      aliases: generator.aliases ?? [],
      description: generator.description ?? "",
      name: generator.name,
    }));
  }

  /**
   * Reads a target file and splits it around the conformetry generators table markers.
   */
  private readMarkedFile(targetFile: string): {
    afterMarker: string;
    beforeMarker: string;
    generatedContent: string;
  } {
    const filePath = path.join(process.cwd(), targetFile);
    const content = readFileSync(filePath, "utf8");
    const startMarker = "<!-- conformetry-generators-table start -->";
    const endMarker = "<!-- conformetry-generators-table end -->";

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error(
        `Markers not found in ${targetFile}. Expected to find "${startMarker}" and "${endMarker}"`,
      );
    }

    const beforeMarker = content.slice(
      0,
      Math.max(0, startIndex + startMarker.length),
    );
    const afterMarker = content.slice(Math.max(0, endIndex));
    const generatedContent = content.slice(
      startIndex + startMarker.length,
      endIndex,
    );

    return { afterMarker, beforeMarker, generatedContent };
  }

  /**
   * Writes the generated generators table into every target file between the marker comments.
   */
  private writeSync(generators: ConformetryGeneratorMetadata[]): void {
    this.logger.info("🔄 Generating the conformetry generators table");

    for (const targetFile of this.targetFiles) {
      const generatedTable = this.generateGeneratorsTable(
        generators,
        targetFile.includeAlias,
      );
      const filePath = path.join(process.cwd(), targetFile.path);
      const { afterMarker, beforeMarker } = this.readMarkedFile(
        targetFile.path,
      );
      const newContent = `${beforeMarker}\n${generatedTable}\n${afterMarker}`;

      writeFileSync(filePath, newContent, "utf8");
      this.logger.info(`📇 Updated ${targetFile.path}`, undefined, {
        count: generators.length,
      });
    }
  }

  // 🌎 Public Methods

  /**
   * Runs the conformetry-generators sync command in check or write mode.
   */
  async run(
    passedParameters: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Unknown mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage: "Expected 'check' or 'write'",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes the generators table and reports success without exiting. */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    try {
      const generators = await this.readGenerators();

      if (mode === "check") {
        return this.checkSync(generators);
      }

      this.writeSync(generators);
      return true;
    } catch (error) {
      this.logger.error(
        `💥 Failed synchronizing conformetry generators`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
