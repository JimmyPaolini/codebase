// 🏷️ Types

import type { CssResult } from "../css/css.types";
import type { HclResult } from "../hcl/hcl.types";
import type { ShellResult } from "../shell/shell.types";
import type { SqlResult } from "../sql/sql.types";
import type { TomlResult } from "../toml/toml.types";
import type {
  CodeStatisticsResult,
  ResolvedCodometerConfiguration,
  ResolvedCodometerJsonOutputConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";

/**
 * Options accepted by the codometer command.
 *
 * Every path option overrides the matching destination in the configuration
 * file, which is what lets a task runner point one invocation somewhere else
 * without a second configuration file.
 */
export interface CodometerCommandOptions {
  check?: boolean;
  config?: string;
  directory?: string;
  json?: string;
  markdown?: string;
}

/**
 * What the file-only analyzers report, collected in one step.
 */
export interface ConfigurationLanguageResults {
  css: CssResult;
  hcl: HclResult;
  shell: ShellResult;
  sql: SqlResult;
  toml: TomlResult;
}

/**
 * Arguments accepted by the measurement pipeline.
 */
export interface MeasureArguments {
  configuration: ResolvedCodometerConfiguration;
  workingDirectory: string;
}

/**
 * Arguments accepted when resolving where an output file is written.
 */
export interface ResolveDestinationArguments {
  configuration: ResolvedCodometerConfiguration;
  options: CodometerCommandOptions;
  workingDirectory: string;
}

/**
 * Arguments accepted when syncing every resolved output destination.
 */
export interface SyncDestinationsArguments {
  check: boolean;
  json: ResolvedCodometerJsonOutputConfiguration | undefined;
  markdown: ResolvedCodometerMarkdownOutputConfiguration | undefined;
  statistics: CodeStatisticsResult;
}
