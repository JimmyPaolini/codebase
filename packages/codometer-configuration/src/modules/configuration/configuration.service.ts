import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";
import { parse as parseJsonc } from "jsonc-parser";

import {
  codometerConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  DEFAULT_CUSTOM_STATISTIC_COLORS,
  DEFAULT_CUSTOM_STATISTIC_GROUP,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_LIMIT_SEVERITY,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_PYTHON_COMMAND,
  DEFAULT_TARGET_COMPRESSION,
  DEFAULT_TARGET_DIRECTORY,
  LIMIT_UNIT_MULTIPLIERS,
  LIMIT_VALUE_PATTERN,
  NEGATION_PREFIX,
  REPOSITORY_ROOT_MARKERS,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";
import { InvalidLimitValueError } from "./limit-value.errors";

import type {
  CodometerConfiguration,
  CodometerConfigurationContext,
  CodometerConfigurationFactory,
  CodometerCustomStatistic,
  CodometerLimit,
  CodometerOutputConfiguration,
  CodometerTarget,
  LoadConfigurationArguments,
  ResolvedCodometerConfiguration,
  ResolvedCodometerCustomStatistic,
  ResolvedCodometerJsonOutputConfiguration,
  ResolvedCodometerLimit,
  ResolvedCodometerMarkdownOutputConfiguration,
  ResolvedCodometerTarget,
} from "./configuration.types";
import type { CodometerStatisticGroup } from "./statistics.types";

/**
 * Loads, validates, and normalizes codometer configuration files.
 *
 * This service owns loading only. What the configuration means — which files
 * an exclusion glob removes, where a badge block is spliced in — belongs to
 * the analyzers that read it, so that reading a configuration file stays free
 * of any knowledge of the repository being measured.
 */
@Injectable()
export class ConfigurationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Calls a configuration file that was authored as a function.
   *
   * Anything else is already the configuration and is passed through. The
   * context is built here rather than by the caller so that every reader of a
   * configuration file — a command, a host embedding codometer — hands a
   * factory the same two directories.
   */
  private async applyRunContext(
    configurationExport: unknown,
    context: CodometerConfigurationContext,
  ): Promise<unknown> {
    if (!this.isConfigurationFactory(configurationExport)) {
      return configurationExport;
    }

    return configurationExport(context);
  }

  /**
   * Walks upward from a directory looking for a configuration file.
   *
   * Returns `undefined` when the search reaches the filesystem root without
   * finding one: a repository that never wrote a configuration file is
   * measured with the defaults rather than told to write one.
   */
  private findConfigurationFile(searchDirectory: string): string | undefined {
    let candidateDirectory = path.resolve(searchDirectory);

    for (;;) {
      for (const fileName of CONFIGURATION_FILE_NAMES) {
        const candidatePath = path.join(candidateDirectory, fileName);

        if (existsSync(candidatePath)) {
          return candidatePath;
        }
      }

      const parentDirectory = path.dirname(candidateDirectory);

      if (parentDirectory === candidateDirectory) {
        return undefined;
      }

      candidateDirectory = parentDirectory;
    }
  }

  /**
   * Walks upward from the process cwd looking for the repository root.
   *
   * Used to resolve a configuration path given relative to that root even when
   * the command was invoked from a nested directory, which is what a task
   * runner does whenever it sets the cwd to the project rather than the
   * workspace.
   */
  private findRepositoryRoot(): string | undefined {
    let candidateDirectory = path.resolve(process.cwd());

    for (;;) {
      const directory = candidateDirectory;
      const isRoot = REPOSITORY_ROOT_MARKERS.some((marker) =>
        existsSync(path.join(directory, marker)),
      );

      if (isRoot) {
        return candidateDirectory;
      }

      const parentDirectory = path.dirname(candidateDirectory);

      if (parentDirectory === candidateDirectory) {
        return undefined;
      }

      candidateDirectory = parentDirectory;
    }
  }

  /**
   * Whether a configuration file exported a function rather than an object.
   *
   * The only thing separating the two: what a function does with the context
   * is the author's business, and no schema could inspect it anyway.
   */
  private isConfigurationFactory(
    configurationExport: unknown,
  ): configurationExport is CodometerConfigurationFactory {
    return typeof configurationExport === "function";
  }

  /** Loads a configuration module, choosing the reader by extension. */
  private async loadConfigurationModule(args: {
    configurationPath: string;
    extension: string;
  }): Promise<unknown> {
    if (args.extension === ".json" || args.extension === ".jsonc") {
      return this.loadJsonConfiguration(args);
    }

    const jiti = createJiti(fileURLToPath(import.meta.url));

    return this.readDefaultExport(
      await jiti.import(args.configurationPath, { default: true }),
    );
  }

  /** Reads a JSON or JSONC configuration file. */
  private async loadJsonConfiguration(args: {
    configurationPath: string;
    extension: string;
  }): Promise<unknown> {
    const configurationContent = await readFile(args.configurationPath, "utf8");

    return args.extension === ".jsonc"
      ? parseJsonc(configurationContent)
      : JSON.parse(configurationContent);
  }

  /**
   * Reads a limit's value, in decimal units when it was written as a string.
   *
   * Everything unreadable is refused: a negative number, a unit missing its
   * `b`, a word, an empty string. The tool this replaces coerced an unreadable
   * limit to nothing and then failed every target holding a single byte.
   */
  private parseLimitValue(limit: CodometerLimit): number {
    if (typeof limit.value !== "number") {
      return this.parseLimitValueText(limit.metric, limit.value);
    }

    if (!Number.isFinite(limit.value) || limit.value < 0) {
      throw new InvalidLimitValueError(limit.metric, String(limit.value));
    }

    return limit.value;
  }

  /**
   * Reads a limit written as a string, unit and all.
   *
   * A unit multiplies and then rounds: `"1.5 KB"` is 1500, and the rounding is
   * what keeps `"0.1 KB"` from arriving as the 100.00000000000001 floating
   * point makes of it. A string carrying no unit at all is the plain number,
   * which is what a limit on a count of interfaces or files is written as.
   */
  private parseLimitValueText(metric: string, text: string): number {
    const [, amount, unit] = LIMIT_VALUE_PATTERN.exec(text.trim()) ?? [];

    if (amount === undefined || unit === undefined) {
      throw new InvalidLimitValueError(metric, text);
    }

    if (unit === "") {
      return Number(amount);
    }

    const multiplier = LIMIT_UNIT_MULTIPLIERS.get(unit.toLowerCase());

    if (multiplier === undefined) {
      throw new InvalidLimitValueError(metric, text);
    }

    return Math.round(Number(amount) * multiplier);
  }

  /**
   * Reads what a configuration module exported, through either interop shape.
   *
   * A function survives as itself: a configuration file may be authored as one
   * and calling it is what turns it into a configuration, which happens once
   * the run context is known rather than here.
   */
  private readDefaultExport(importedModule: unknown): unknown {
    if (typeof importedModule === "function") {
      return importedModule;
    }

    if (typeof importedModule !== "object" || importedModule === null) {
      return {};
    }

    const defaultExport = (importedModule as { default?: unknown }).default;

    if (typeof defaultExport === "function") {
      return defaultExport;
    }

    return typeof defaultExport === "object" && defaultExport !== null
      ? defaultExport
      : importedModule;
  }

  /**
   * Resolves a configuration path against the cwd, then the repository root.
   */
  private resolveConfigurationPath(configurationPath: string): string {
    const absolutePath = path.resolve(configurationPath);

    if (existsSync(absolutePath)) {
      return absolutePath;
    }

    const repositoryRoot = this.findRepositoryRoot();

    if (repositoryRoot === undefined) {
      throw new ConfigurationFileNotFoundError(absolutePath);
    }

    const repositoryRelativePath = path.resolve(
      repositoryRoot,
      configurationPath,
    );

    if (!existsSync(repositoryRelativePath)) {
      throw new ConfigurationFileNotFoundError(absolutePath);
    }

    return repositoryRelativePath;
  }

  /**
   * Gives every configured counter a color and a group.
   *
   * Colors are handed out by position within a group rather than within the
   * whole list, so adding a counter to one group does not recolor the badges
   * of another — which would rewrite a report that had not otherwise changed.
   */
  private resolveCustomStatistics(
    statistics: CodometerCustomStatistic[] | undefined,
  ): ResolvedCodometerCustomStatistic[] {
    const positionsByGroup = new Map<CodometerStatisticGroup, number>();

    return (statistics ?? []).map((statistic) => {
      const group = statistic.group ?? DEFAULT_CUSTOM_STATISTIC_GROUP;
      const position = positionsByGroup.get(group) ?? 0;
      positionsByGroup.set(group, position + 1);

      return {
        color:
          statistic.color ??
          DEFAULT_CUSTOM_STATISTIC_COLORS[
            position % DEFAULT_CUSTOM_STATISTIC_COLORS.length
          ] ??
          "7c3aed",
        group,
        label: statistic.label,
        patterns: statistic.patterns ?? [],
        symbols: statistic.symbols,
      };
    });
  }

  /** Applies defaults to the JSON output destination, if one was named. */
  private resolveJsonOutput(
    output: CodometerOutputConfiguration | undefined,
  ): ResolvedCodometerJsonOutputConfiguration | undefined {
    if (output?.json === undefined) {
      return undefined;
    }

    return {
      indentation: output.json.indentation ?? DEFAULT_JSON_INDENTATION,
      path: output.json.path,
    };
  }

  /**
   * Gives every limit its severity and a value read as a number.
   *
   * Which metric a limit lands on is decided where the measurement is, since
   * nothing here knows what was measured — the only thing settled at this
   * point is what the limit says.
   */
  private resolveLimits(
    limits: CodometerLimit[] | undefined,
  ): ResolvedCodometerLimit[] {
    return (limits ?? []).map((limit) => ({
      label: limit.label,
      metric: limit.metric,
      severity: limit.severity ?? DEFAULT_LIMIT_SEVERITY,
      value: this.parseLimitValue(limit),
    }));
  }

  /** Applies defaults to the markdown output destination, if one was named. */
  private resolveMarkdownOutput(
    output: CodometerOutputConfiguration | undefined,
  ): ResolvedCodometerMarkdownOutputConfiguration | undefined {
    if (output?.markdown === undefined) {
      return undefined;
    }

    const { markdown } = output;

    return {
      description: markdown.description,
      endMarker: markdown.endMarker ?? DEFAULT_MARKDOWN_END_MARKER,
      path: markdown.path,
      // Left unset rather than defaulted: the built-in rendering and writing
      // live in the CLI that calls them, so "unset" is what selects them.
      render: markdown.render,
      startMarker: markdown.startMarker ?? DEFAULT_MARKDOWN_START_MARKER,
      write: markdown.write,
    };
  }

  /**
   * Splits every target's globs into what they add and what they remove.
   *
   * A `!` prefix in an include glob is what the tool this replaced used to
   * subtract a file, and there it mattered where in the array it sat. Here the
   * negations join the exclude globs in a single set, so a target holds the
   * same files however its patterns are arranged.
   */
  private resolveTargets(
    targets: CodometerTarget[] | undefined,
  ): ResolvedCodometerTarget[] {
    return (targets ?? []).map((target) => ({
      analyses: [...target.analyses],
      compression: target.compression ?? DEFAULT_TARGET_COMPRESSION,
      directory: target.directory ?? DEFAULT_TARGET_DIRECTORY,
      exclude: [
        ...new Set([
          ...target.include
            .filter((pattern) => pattern.startsWith(NEGATION_PREFIX))
            .map((pattern) => pattern.slice(NEGATION_PREFIX.length)),
          ...(target.exclude ?? []),
        ]),
      ],
      include: target.include.filter(
        (pattern) => !pattern.startsWith(NEGATION_PREFIX),
      ),
      name: target.name,
    }));
  }

  // 🌎 Public Methods

  /**
   * Loads and validates a codometer configuration file.
   *
   * A path that was named explicitly must exist — a typo in a task runner's
   * arguments should fail rather than quietly measure the repository with
   * defaults it never asked for. A path that was not named is searched for
   * from the measured directory upward, and its absence is legal.
   *
   * The nearest configuration file wins outright: nothing from a further
   * ancestor is folded into it. Merging the two would leave a limit that never
   * applied looking exactly like one that did, and the only way to tell them
   * apart would be to know which of several files each field came from.
   */
  public async loadConfiguration(
    args: LoadConfigurationArguments = {},
  ): Promise<ResolvedCodometerConfiguration> {
    const searchDirectory = path.resolve(args.searchDirectory ?? process.cwd());
    const resolvedPath =
      args.configurationPath === undefined
        ? this.findConfigurationFile(searchDirectory)
        : this.resolveConfigurationPath(args.configurationPath);

    if (resolvedPath === undefined) {
      return this.resolveConfiguration({});
    }

    const extension = path.extname(resolvedPath).toLowerCase();

    if (!SUPPORTED_CONFIGURATION_EXTENSIONS.has(extension)) {
      throw new UnknownConfigurationFileTypeError(resolvedPath);
    }

    const configurationModule = await this.applyRunContext(
      await this.loadConfigurationModule({
        configurationPath: resolvedPath,
        extension,
      }),
      {
        configurationDirectory: path.dirname(resolvedPath),
        directory: searchDirectory,
      },
    );

    return this.resolveConfiguration(
      codometerConfigurationSchema.parse(configurationModule),
    );
  }

  /**
   * Fills in every field a configuration file may leave out.
   *
   * Exposed so a host embedding codometer can hand over a configuration object
   * it assembled itself and get the same shape a configuration file produces.
   */
  public resolveConfiguration(
    configuration: CodometerConfiguration,
  ): ResolvedCodometerConfiguration {
    return {
      defaultTarget: configuration.defaultTarget,
      // Additive rather than a replacement: the defaults are directories no
      // repository wants counted, so a configuration naming its own noise
      // should not have to restate them to keep them out.
      exclude: [
        ...new Set([
          ...DEFAULT_EXCLUDE_GLOBS,
          ...(configuration.exclude ?? []),
        ]),
      ],
      excludeFrom: configuration.excludeFrom ?? [],
      limits: this.resolveLimits(configuration.limits),
      output: {
        json: this.resolveJsonOutput(configuration.output),
        markdown: this.resolveMarkdownOutput(configuration.output),
      },
      python: {
        command: configuration.python?.command ?? DEFAULT_PYTHON_COMMAND,
      },
      statistics: this.resolveCustomStatistics(configuration.statistics),
      targets: this.resolveTargets(configuration.targets),
    };
  }
}
