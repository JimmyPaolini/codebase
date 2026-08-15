// 🏷️ Types

import type { ValidationFileResult } from "../language/language.types";

/** Arguments for rendering one instance/template location line. */
export interface FormatLocationArguments {
  readonly column: number | undefined;
  readonly jsonPath: string | undefined;
  readonly line: number | undefined;
  readonly prefix: string;
}

/** Arguments for rendering a full validation report. */
export interface FormatReportArguments {
  /** Failing files, already grouped by `PluginService` or `FilesService`. */
  readonly fileResults: ValidationFileResult[];
  /**
   * Directory that absolute paths are made relative to, so reports stay
   * readable and machine-independent. Passed in rather than discovered, since
   * this package deliberately has no workspace awareness.
   */
  readonly workingDirectory: string;
}
