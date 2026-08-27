import path from "node:path";

import {
  ConfigurationService as CodometerConfigurationService,
  CONFIGURATION_FILE_NAMES,
} from "@codometer/configuration";
import { DiscoveryService } from "@codometer/discovery";
import { formatBytes, formatCount } from "@codometer/output";
import { Injectable } from "@nestjs/common";

import { ABSENT_LABEL, SIZE_METRIC_SUFFIX } from "./configuration.constants";

import type {
  ConfiguredDirectory,
  ConfiguredLimitRow,
} from "./configuration.types";

/**
 * Finds every codometer configuration in a tree and says what each one holds.
 *
 * Answers the question a repository gains once its limits stop living in one
 * table: where is everything configured, and what does it add up to. It reads
 * configuration and never measures anything, so it needs no build, runs in
 * milliseconds, and cannot fail for a reason unrelated to configuration.
 */
@Injectable()
export class ConfigurationService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: CodometerConfigurationService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  // 🔐 Private Fields

  /** Every name a configuration file may be written under, as a set. */
  private readonly configurationFileNames = new Set<string>(
    CONFIGURATION_FILE_NAMES,
  );

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Resolves one configuration file, reporting rather than throwing on failure.
   *
   * A file named like a configuration is not always one that loads: a
   * generator template carries placeholders in its own path, and a
   * work-in-progress file may not parse. One such file must not take the
   * listing down with it, because the listing is most wanted precisely when
   * something is wrong. The failure is carried on the entry so the reader sees
   * which file could not be read instead of a shorter list than the tree holds.
   */
  private async describeConfiguration(args: {
    directory: string;
    file: string;
    workingDirectory: string;
  }): Promise<ConfiguredDirectory> {
    try {
      const { configuration } =
        await this.configurationService.loadConfigurationFile({
          configurationPath: path.resolve(args.workingDirectory, args.file),
          searchDirectory: path.resolve(args.workingDirectory, args.directory),
        });

      return {
        configuration,
        directory: args.directory,
        error: undefined,
        path: args.file,
      };
    } catch (error) {
      return {
        configuration: undefined,
        directory: args.directory,
        error: error instanceof Error ? error.message : String(error),
        path: args.file,
      };
    }
  }

  /**
   * Renders a limit's value with the unit its metric implies.
   *
   * A resolved limit carries a bare number, so `256000` alone cannot say
   * whether it gates bytes or files. Only a size analysis produces a `.size`
   * metric, which is what makes the suffix a sound test.
   */
  private formatLimitValue(metric: string, value: number): string {
    return metric.endsWith(SIZE_METRIC_SUFFIX)
      ? formatBytes(value)
      : formatCount(value);
  }

  // 🌎 Public Methods

  /**
   * Resolves the configuration each file in a tree answers with.
   *
   * Every file is resolved for **its own directory** rather than for the walk
   * root, which is what makes the result match what a per-project run of
   * codometer actually sees: a configuration authored as a factory derives its
   * targets from the directory it is called with, so resolving it anywhere
   * else would report something no run would ever use.
   */
  public async describeConfigurations(
    workingDirectory: string,
  ): Promise<ConfiguredDirectory[]> {
    const files = await this.findConfigurationFiles(workingDirectory);
    const described: ConfiguredDirectory[] = [];

    for (const file of files) {
      const directory = path.dirname(file);

      described.push(
        await this.describeConfiguration({ directory, file, workingDirectory }),
      );
    }

    return described;
  }

  /**
   * Finds every configuration file beneath a directory.
   *
   * Walks with the same gitignore-aware discovery a measurement uses, so a
   * configuration inside `node_modules` or a build directory is never picked
   * up, and one inside a folder the repository ignores is never reported as
   * something the repository configures.
   */
  public async findConfigurationFiles(
    workingDirectory: string,
  ): Promise<string[]> {
    // The configuration answering for the walk root is what says which files
    // this repository considers its own. Walking without it would list every
    // configuration in a vendored dependency or a generator template as
    // something the repository configures.
    const { configuration } =
      await this.configurationService.loadConfigurationFile({
        searchDirectory: workingDirectory,
      });

    const { files } = this.discoveryService.discoverFiles({
      exclude: configuration.exclude,
      excludeFrom: configuration.excludeFrom,
      workingDirectory,
    });

    return files
      .filter((file) => this.configurationFileNames.has(path.basename(file)))
      .toSorted((first, second) => first.localeCompare(second));
  }

  /** Flattens every configured limit into one row per limit, in walk order. */
  public toLimitRows(
    described: readonly ConfiguredDirectory[],
  ): ConfiguredLimitRow[] {
    return described.flatMap((entry) =>
      (entry.configuration?.limits ?? []).map((limit) => ({
        directory: entry.directory,
        label: limit.label ?? ABSENT_LABEL,
        metric: limit.metric,
        path: entry.path,
        severity: limit.severity,
        value: this.formatLimitValue(limit.metric, limit.value),
      })),
    );
  }
}
