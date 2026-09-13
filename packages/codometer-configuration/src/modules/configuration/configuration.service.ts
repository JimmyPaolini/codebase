import { Injectable } from "@nestjs/common";
import { z } from "zod";

import { ConfigurationLoaderService } from "./configuration-loader.service";
import { codometerConfigurationSchema } from "./configuration-schema.constants";
import {
  DEFAULT_CODEBASE_INPUT,
  DEFAULT_CUSTOM_STATISTIC_COLORS,
  DEFAULT_CUSTOM_STATISTIC_GROUP,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_INPUT_COMPRESSION,
  DEFAULT_INPUT_DIRECTORY,
  DEFAULT_INPUT_NAME,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_LIMIT_SEVERITY,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_PYTHON_COMMAND,
  InvalidConfigurationError,
  InvalidLimitValueError,
  LIMIT_UNIT_MULTIPLIERS,
  LIMIT_VALUE_PATTERN,
  NEGATION_PREFIX,
} from "./configuration.constants";

import type {
  CodometerConfiguration,
  CodometerCustomStatistic,
  CodometerInput,
  CodometerJsonOutput,
  CodometerLimit,
  CodometerMarkdownOutput,
  CodometerOutput,
  LoadConfigurationArguments,
} from "./configuration.types";
import type {
  LoadedConfiguration,
  ResolvedCodometerConfiguration,
  ResolvedCodometerCustomStatistic,
  ResolvedCodometerInput,
  ResolvedCodometerJsonOutput,
  ResolvedCodometerLimit,
  ResolvedCodometerMarkdownOutput,
  ResolvedCodometerOutput,
} from "./resolved.types";
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

  constructor(
    private readonly configurationLoaderService: ConfigurationLoaderService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Validates a configuration object, refusing it in prose rather than in JSON.
   *
   * Every load goes through here — a file's contents and the empty object a
   * directory with no configuration file stands in with alike — so the two
   * fail identically and a reader gets the same sentence either way.
   */
  private parseConfiguration(configuration: unknown): CodometerConfiguration {
    const parsed = codometerConfigurationSchema.safeParse(configuration);

    if (!parsed.success) {
      throw new InvalidConfigurationError(z.prettifyError(parsed.error));
    }

    return parsed.data;
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
   * Gives every configured counter a color and a group, and its `comment`
   * selector a severity.
   *
   * Colors are handed out by position within a group rather than within the
   * whole list, so adding a counter to one group does not recolor the badges
   * of another — which would rewrite a report that had not otherwise changed.
   * A `comment` selector's own defaulting is inlined here rather than given
   * its own method: this list already runs one call deep inside its output
   * destination's own resolution, and a further call would push the whole
   * chain past what this package's callidescope gate allows.
   */
  private resolveCustomStatistics(
    statistics: CodometerCustomStatistic[] | undefined,
  ): ResolvedCodometerCustomStatistic[] {
    const positionsByGroup = new Map<CodometerStatisticGroup, number>();

    return (statistics ?? []).map((statistic) => {
      const group = statistic.group ?? DEFAULT_CUSTOM_STATISTIC_GROUP;
      const position = positionsByGroup.get(group) ?? 0;
      positionsByGroup.set(group, position + 1);
      const { comment } = statistic;

      return {
        color:
          statistic.color ??
          DEFAULT_CUSTOM_STATISTIC_COLORS[
            position % DEFAULT_CUSTOM_STATISTIC_COLORS.length
          ] ??
          "7c3aed",
        comment:
          comment === undefined
            ? undefined
            : {
                kind: comment.kind,
                language: comment.language,
                maximumCharacters: comment.maximumCharacters,
                maximumLines: comment.maximumLines,
                maximumWords: comment.maximumWords,
                severity: comment.severity ?? DEFAULT_LIMIT_SEVERITY,
              },
        group,
        label: statistic.label,
        patterns: statistic.patterns ?? [],
        symbols: statistic.symbols,
      };
    });
  }

  /**
   * Fills in every input's compression and directory, and splits its globs
   * into what they add and what they remove.
   *
   * A `!` prefix in `include` is what the tool this replaced used to subtract
   * a file, and there it mattered where in the array it sat. Here the
   * negations join the exclude globs in a single set, so an input holds the
   * same files however its patterns are arranged.
   */
  private resolveInput(input: CodometerInput): ResolvedCodometerInput {
    return {
      analyses: [...input.analyses],
      compression: input.compression ?? DEFAULT_INPUT_COMPRESSION,
      directory: input.directory ?? DEFAULT_INPUT_DIRECTORY,
      exclude: [
        ...new Set([
          ...input.include
            .filter((pattern) => pattern.startsWith(NEGATION_PREFIX))
            .map((pattern) => pattern.slice(NEGATION_PREFIX.length)),
          ...(input.exclude ?? []),
        ]),
      ],
      include: input.include.filter(
        (pattern) => !pattern.startsWith(NEGATION_PREFIX),
      ),
      name: input.name,
    };
  }

  /**
   * Resolves every declared input, and the built-in `codebase` one.
   *
   * The built-in entry is prepended unless the configuration already declares
   * one by that name, which replaces it outright — the only way a
   * configuration reaches the built-in whole-tree scan under a compression or
   * a different set of analyses.
   */
  private resolveInputs(
    inputs: CodometerInput[] | undefined,
  ): ResolvedCodometerInput[] {
    const declared = inputs ?? [];
    const hasCodebaseInput = declared.some(
      (input) => input.name === DEFAULT_INPUT_NAME,
    );
    const effective = hasCodebaseInput
      ? declared
      : [DEFAULT_CODEBASE_INPUT, ...declared];

    return effective.map((input) => this.resolveInput(input));
  }

  /** Applies defaults to one JSON output destination. */
  private resolveJsonOutput(
    output: CodometerJsonOutput,
  ): ResolvedCodometerJsonOutput {
    return {
      custom: this.resolveCustomStatistics(output.custom),
      indentation: output.indentation ?? DEFAULT_JSON_INDENTATION,
      path: output.path,
      type: "json",
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

  /** Applies defaults to one markdown output destination. */
  private resolveMarkdownOutput(
    output: CodometerMarkdownOutput,
  ): ResolvedCodometerMarkdownOutput {
    return {
      custom: this.resolveCustomStatistics(output.custom),
      description: output.description,
      endMarker: output.endMarker ?? DEFAULT_MARKDOWN_END_MARKER,
      path: output.path,
      startMarker: output.startMarker ?? DEFAULT_MARKDOWN_START_MARKER,
      type: "markdown",
      // Left unset rather than defaulted: the built-in rendering and writing
      // live in the CLI that calls it, so "unset" is what selects it.
      write: output.write,
    };
  }

  /** Applies defaults to every declared output destination. */
  private resolveOutputs(
    outputs: CodometerOutput[] | undefined,
  ): ResolvedCodometerOutput[] {
    return (outputs ?? []).map((output) =>
      output.type === "json"
        ? this.resolveJsonOutput(output)
        : this.resolveMarkdownOutput(output),
    );
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
    const { configuration } = await this.loadConfigurationFile(args);

    return configuration;
  }

  /**
   * Loads a configuration and says which file answered.
   *
   * The same work as `loadConfiguration`, keeping the path the upward walk
   * settled on. A caller measuring one directory has no use for it — the
   * configuration is the whole answer — but one listing what a repository
   * configures has to attribute each answer to the file that gave it, and
   * nothing downstream of the walk can still tell.
   */
  public async loadConfigurationFile(
    args: LoadConfigurationArguments = {},
  ): Promise<LoadedConfiguration> {
    const loaded = await this.configurationLoaderService.load(args);

    if (loaded === undefined) {
      // Validated through the same schema as a file's contents rather than
      // resolved directly, so a repository with no configuration file at all
      // fails on a missing `format` exactly like one whose file forgot it —
      // there is no code-level fallback for either.
      return {
        configuration: this.resolveConfiguration(this.parseConfiguration({})),
        path: undefined,
      };
    }

    return {
      configuration: this.resolveConfiguration(
        this.parseConfiguration(loaded.configuration),
      ),
      path: loaded.path,
    };
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
      defaultInput: configuration.defaultInput,
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
      format: configuration.format,
      inputs: this.resolveInputs(configuration.inputs),
      limits: this.resolveLimits(configuration.limits),
      outputs: this.resolveOutputs(configuration.outputs),
      python: {
        command: configuration.python?.command ?? DEFAULT_PYTHON_COMMAND,
      },
    };
  }
}
