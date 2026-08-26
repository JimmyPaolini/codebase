// 🏷️ Types

import type { TypescriptDocumentationMeasurement } from "@codometer/languages";

/** One measured JSDoc comment, with the target it was found in. */
export interface DocumentationMeasurement extends TypescriptDocumentationMeasurement {
  target: string;
}
