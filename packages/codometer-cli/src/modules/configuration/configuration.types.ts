// 🏷️ Types

import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

/** Options accepted by the configuration command. */
export interface ConfigurationCommandOptions {
  directory?: string | undefined;
  format?: string | undefined;
  limits?: boolean | undefined;
}

/** One configuration file, and everything it resolved to for its own folder. */
export interface ConfiguredDirectory {
  /** The configuration with every default applied, absent when it failed to load. */
  configuration: ResolvedCodometerConfiguration | undefined;
  /** Directory the configuration was resolved for, relative to the walk root. */
  directory: string;
  /** Why the file could not be read, and `undefined` when it was read. */
  error: string | undefined;
  /** Configuration file that answered, relative to the walk root. */
  path: string;
}

/** One row of the limits listing. */
export interface ConfiguredLimitRow {
  /** Directory the limit gates, relative to the walk root. */
  directory: string;
  /** Written label, or a dash when none was written. */
  label: string;
  /** Metric path the limit is written against. */
  metric: string;
  /** Configuration file the limit is declared in, relative to the walk root. */
  path: string;
  severity: string;
  /** Rendered with its unit, so a size reads as a size and a count as a count. */
  value: string;
}

/** Arguments accepted when rendering the configuration listing. */
export interface RenderConfigurationArguments {
  described: readonly ConfiguredDirectory[];
  format: string;
  limitRows: readonly ConfiguredLimitRow[];
  limitsOnly: boolean;
}
