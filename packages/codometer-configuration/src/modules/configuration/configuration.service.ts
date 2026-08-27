import { Injectable } from "@nestjs/common";

import { ConfigurationLoaderService } from "./configuration-loader.service";
import {
  codometerConfigurationSchema,
  DEFAULT_CUSTOM_STATISTIC_COLORS,
  DEFAULT_CUSTOM_STATISTIC_GROUP,
  DEFAULT_DOCUMENTATION_LIMIT,
  DEFAULT_DOCUMENTATION_UNIT,
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
} from "./configuration.constants";
import { InvalidLimitValueError } from "./limit-value.errors";

import type {
  CodometerConfiguration,
  CodometerCustomStatistic,
  CodometerDocumentationConfiguration,
  CodometerLimit,
  CodometerTarget,
  LoadConfigurationArguments,
  LoadedConfiguration,
  ResolvedCodometerConfiguration,
  ResolvedCodometerCustomStatistic,
  ResolvedCodometerDocumentationConfiguration,
  ResolvedCodometerLimit,
  ResolvedCodometerTarget,
} from "./configuration.types";
import type {
  CodometerOutputConfiguration,
  ResolvedCodometerJsonOutputConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "./output.types";
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

  /**
   * Fills in every field a documentation block may leave out.
   *
   * `undefined` when a configuration names no block at all, the same way
   * `limits` resolves to an empty array when nothing was written: the check
   * is opt-in, so a repository that never wrote one is measured and reported
   * like any other but gated by nothing.
   */
  private resolveDocumentation(
    configured: CodometerDocumentationConfiguration | undefined,
  ): ResolvedCodometerDocumentationConfiguration | undefined {
    if (configured === undefined) {
      return undefined;
    }

    return {
      default: configured.default ?? DEFAULT_DOCUMENTATION_LIMIT,
      kinds: configured.kinds ?? {},
      severity: configured.severity ?? DEFAULT_LIMIT_SEVERITY,
      unit: configured.unit ?? DEFAULT_DOCUMENTATION_UNIT,
    };
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
      return { configuration: this.resolveConfiguration({}), path: undefined };
    }

    return {
      configuration: this.resolveConfiguration(
        codometerConfigurationSchema.parse(loaded.configuration),
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
      defaultTarget: configuration.defaultTarget,
      documentation: this.resolveDocumentation(configuration.documentation),
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
