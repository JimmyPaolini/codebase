import { Injectable } from "@nestjs/common";

import type { GenerationParameters } from "../meander-generation/meander-generation.types";

/**
 * Builds the kebab-case output filename for one set of generation
 * parameters, encoding the type, rows, repeat count, and (when present)
 * the modifier so no two distinct parameter sets can share a name. Shared
 * by `GenerateCommand` and `GenerateBatchCommand` so the naming convention
 * lives in exactly one place.
 */
@Injectable()
export class OutputFilenameService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Builds the filename, appending the modifier's kebab-case slug when one is present. */
  build(parameters: GenerationParameters): string {
    const { modifier, repeatCount, rows, type } = parameters;
    const baseName = `${type}-${rows}-rows-${repeatCount}-repeats`;

    if (!modifier) {
      return `${baseName}.svg`;
    }

    if (modifier.name === "alternated") {
      return `${baseName}-alternated-period-${modifier.period}.svg`;
    }

    if (modifier.name === "dot") {
      return `${baseName}-dot-${modifier.shape}.svg`;
    }

    return `${baseName}-${modifier.name}.svg`;
  }
}
