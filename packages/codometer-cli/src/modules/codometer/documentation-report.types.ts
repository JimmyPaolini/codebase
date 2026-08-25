// 🏷️ Types

import type { DocumentationMeasurement } from "./documentation-measurement.types";

/** Arguments accepted when rendering the breached documentation entries. */
export interface RenderDocumentationSectionArguments {
  breaches: readonly DocumentationMeasurement[];
}

/** Arguments accepted when reporting documentation-length breaches. */
export interface ReportDocumentationBreachesArguments {
  /** Whether `--check limits` was named, so a failing breach fails the run. */
  checksLimits: boolean;
  documentation: readonly DocumentationMeasurement[];
}
