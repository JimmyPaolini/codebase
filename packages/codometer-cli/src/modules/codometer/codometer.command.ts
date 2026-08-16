import path from "node:path";

import {
  ConfigurationService,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
} from "@codometer/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "../logger/logger.service";
import { OutputJsonService } from "../output-json/output-json.service";
import { OutputMarkdownService } from "../output-markdown/output-markdown.service";

import { CodometerService } from "./codometer.service";

import type {
  CodometerCommandOptions,
  ResolveDestinationArguments,
  SyncDestinationsArguments,
} from "./codometer.types";
import type {
  ResolvedCodometerJsonOutputConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";

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
    private readonly configurationService: ConfigurationService,
    private readonly codometerService: CodometerService,
    private readonly outputJsonService: OutputJsonService,
    private readonly outputMarkdownService: OutputMarkdownService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CodometerCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Resolve where the JSON report goes, if anywhere.
   *
   * Returns `undefined` when neither the configuration nor the command line
   * names a destination, which is how a repository says it does not want the
   * report written at all.
   */
  private resolveJsonDestination(
    args: ResolveDestinationArguments,
  ): ResolvedCodometerJsonOutputConfiguration | undefined {
    const configured = args.configuration.output.json;
    const destinationPath = args.options.json ?? configured?.path;

    if (destinationPath === undefined) {
      return undefined;
    }

    return {
      indentation: configured?.indentation ?? DEFAULT_JSON_INDENTATION,
      path: path.resolve(args.workingDirectory, destinationPath),
    };
  }

  /**
   * Resolve where the markdown report goes, if anywhere.
   *
   * A configured `write` function is a destination in its own right: it picks
   * the file itself, so a configuration that supplies one without a path still
   * has markdown output.
   */
  private resolveMarkdownDestination(
    args: ResolveDestinationArguments,
  ): ResolvedCodometerMarkdownOutputConfiguration | undefined {
    const configured = args.configuration.output.markdown;
    const destinationPath = args.options.markdown ?? configured?.path;

    if (destinationPath === undefined && configured?.write === undefined) {
      return undefined;
    }

    return {
      description: configured?.description,
      endMarker: configured?.endMarker ?? DEFAULT_MARKDOWN_END_MARKER,
      path:
        destinationPath === undefined
          ? undefined
          : path.resolve(args.workingDirectory, destinationPath),
      render: configured?.render,
      startMarker: configured?.startMarker ?? DEFAULT_MARKDOWN_START_MARKER,
      write: configured?.write,
    };
  }

  /**
   * Sync every configured destination, returning the ones that were stale.
   *
   * In write mode nothing is ever stale, so the list is empty and the caller's
   * exit code is untouched.
   */
  private syncDestinations(args: SyncDestinationsArguments): string[] {
    const stalePaths: string[] = [];

    if (args.markdown !== undefined) {
      const isCurrent = this.outputMarkdownService.sync({
        check: args.check,
        destination: args.markdown,
        statistics: args.statistics,
      });

      if (!isCurrent) {
        // A configured writer may have picked the file itself, so name the
        // destination rather than claiming a path nobody configured.
        stalePaths.push(args.markdown.path ?? "markdown output");
      }
    }

    if (args.json !== undefined) {
      const isCurrent = this.outputJsonService.sync({
        check: args.check,
        destination: args.json,
        statistics: args.statistics,
      });

      if (!isCurrent) {
        stalePaths.push(args.json.path);
      }
    }

    return stalePaths;
  }

  // 🌎 Public Methods

  /**
   * Parse the optional check mode flag from command-line input.
   *
   * The parser runs only when `--check` is present, and a flag carrying no
   * value arrives as `undefined` rather than `true`. Presence is therefore the
   * whole signal: reading `undefined` as "unset" is what silently turned check
   * mode back into write mode and let a stale README pass CI.
   */
  @Option({
    description: "Validate the generated output without writing changes",
    flags: "--check",
  })
  public parseCheck(value: boolean | string | undefined): boolean {
    if (typeof value === "string") {
      return value.toLowerCase() !== "false";
    }

    return value ?? true;
  }

  /**
   * Parse the optional configuration path from command-line input.
   */
  @Option({
    description: "Path to the codometer configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Parse the directory option from command-line input.
   */
  @Option({
    description: "Directory to analyze",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    return value ?? process.cwd();
  }

  /**
   * Parse the optional JSON report path from command-line input.
   */
  @Option({
    description: "Path to write the JSON statistics report to",
    flags: "--json [json]",
  })
  public parseJson(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Parse the optional markdown path from command-line input.
   */
  @Option({
    description: "Path to the markdown file to update with generated badges",
    flags: "-m, --markdown [markdown]",
  })
  public parseMarkdown(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Measure the repository and write every configured output.
   *
   * With no destination configured or passed, the statistics go to stdout —
   * the form a script pipes into something else.
   */
  async run(
    _passedParameters: string[],
    options: CodometerCommandOptions,
  ): Promise<void> {
    const workingDirectory = path.resolve(
      this.parseDirectory(options.directory),
    );
    const configuration = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      searchDirectory: workingDirectory,
    });
    const statistics = this.codometerService.measure({
      configuration,
      workingDirectory,
    });
    const destinationArguments = { configuration, options, workingDirectory };
    const markdown = this.resolveMarkdownDestination(destinationArguments);
    const json = this.resolveJsonDestination(destinationArguments);

    if (markdown === undefined && json === undefined) {
      process.stdout.write(`${JSON.stringify(statistics, null, 2)}\n`);
      return;
    }

    const stalePaths = this.syncDestinations({
      // Already parsed by the Option decorator. Running `parseCheck` again here
      // would read the absent flag's `undefined` as presence and force check
      // mode on every run.
      check: options.check ?? false,
      json,
      markdown,
      statistics,
    });

    if (stalePaths.length > 0) {
      this.logger.error(`Statistics are out of date: ${stalePaths.join(", ")}`);
      process.exitCode = 1;
    }
  }
}
