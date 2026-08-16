import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import type { ConformetryGeneratorMetadata } from "./conformetry-generators.types";

/**
 * CLI command that syncs the conformetry generators table into AGENTS.md.
 * Reads configuration/conformetry.config.ts and injects a markdown table
 * between marker comments.
 */
@Command({
  description: "Run the conformetry-generators command",
  name: "conformetry-generators",
})
@Injectable()
export class ConformetryGeneratorsCommand extends CommandRunner {
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

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Compares the generated generators table against the stored content in AGENTS.md and reports any differences.
   */
  private checkSync(generators: ConformetryGeneratorMetadata[]): boolean {
    const generatedTable = this.generateGeneratorsTable(generators);
    const existingContent = this.readAgentsFile();

    const generated = generatedTable.trim();
    const existing = existingContent.generatedContent.trim();

    if (generated !== existing) {
      this.logger.log(
        "📇 Detected an out-of-sync conformetry generators table in AGENTS.md",
        undefined,
        {
          hint: "Run 'pnpm exec nx run synchronization:start:conformetry-generators-write' to sync",
        },
      );
      return false;
    }

    this.logger.log(
      "📇 Verified the conformetry generators table",
      undefined,
      { count: generators.length },
    );
    return true;
  }

  /**
   * Renders the list of generators as a markdown table for injection into AGENTS.md.
   */
  private generateGeneratorsTable(
    generators: ConformetryGeneratorMetadata[],
  ): string {
    const header =
      "| Generator | Alias | Description |\n| --------- | ----- | ----------- |";
    const rows = generators.map((gen) => {
      const alias = gen.aliases.map((a) => `\`${a}\``).join(", ");
      return `| \`${gen.name}\` | ${alias} | ${gen.description} |`;
    });
    return [header, ...rows].join("\n");
  }

  /**
   * Reads AGENTS.md and splits it around the conformetry generators table markers.
   */
  private readAgentsFile(): {
    afterMarker: string;
    beforeMarker: string;
    generatedContent: string;
  } {
    const agentsFile = path.join(process.cwd(), "AGENTS.md");
    const content = readFileSync(agentsFile, "utf8");
    const startMarker = "<!-- conformetry-generators-table start -->";
    const endMarker = "<!-- conformetry-generators-table end -->";

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error(
        `Markers not found in AGENTS.md. Expected to find "${startMarker}" and "${endMarker}"`,
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
   * Writes the generated generators table into AGENTS.md between the marker comments.
   */
  private writeSync(generators: ConformetryGeneratorMetadata[]): void {
    const agentsFile = path.join(process.cwd(), "AGENTS.md");
    this.logger.log("🔄 Generating conformetry generators table...");
    const generatedTable = this.generateGeneratorsTable(generators);
    const { afterMarker, beforeMarker } = this.readAgentsFile();

    const newContent = `${beforeMarker}\n${generatedTable}\n${afterMarker}`;

    writeFileSync(agentsFile, newContent, "utf8");
    this.logger.log("📇 Updated AGENTS.md", undefined, {
      count: generators.length,
    });
  }

  // 🌎 Public Methods

  /**
   * Runs the conformetry-generators sync command in check or write mode.
   */
  async run(
    passedParameters: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    await Promise.resolve();
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Unknown mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage: "Expected 'check' or 'write'",
      });

    try {
      const generators = await this.readGenerators();

      if (mode === "check") {
        const success = this.checkSync(generators);
        if (!success) process.exit(1);
      } else {
        this.writeSync(generators);
      }
    } catch (error) {
      this.logger.error(
        `💥 Failed synchronizing conformetry generators`,
        error instanceof Error ? error.stack : String(error),
      );
      process.exit(1);
    }
  }
}
