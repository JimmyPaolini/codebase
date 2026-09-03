import { Injectable } from "@nestjs/common";

import type { GenerationParameters } from "../meander-generation/meander-generation.types";

/**
 * Builds the kebab-case output filename for one set of generation
 * parameters, encoding the type, rows, repeat count, and (when present)
 * the sub-family or the modifier so no two distinct parameter sets can
 * share a name. Shared by `GenerateCommand` and `GenerateBatchCommand` so
 * the naming convention lives in exactly one place.
 */
@Injectable()
export class OutputFilenameService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Builds the filename, appending the sub-family's name, or the modifier's
   * kebab-case slug, when one is present. Never both: the generation
   * service rejects that pairing, since either one alone decides which
   * repeat unit is drawn.
   *
   * `diamond` and `split` draw the same shape under two names, and both
   * reach here — one as a sub-family, one as a modifier — so they still
   * land in two files rather than overwriting each other.
   */
  build(parameters: GenerationParameters): string {
    const { modifier, repeatCount, rows, subFamily, type } = parameters;
    const baseName = `${type}-${rows}-rows-${repeatCount}-repeats`;

    if (subFamily) {
      return `${baseName}-${subFamily}.svg`;
    }

    if (!modifier) {
      return `${baseName}.svg`;
    }

    if (modifier.name === "alternated") {
      return `${baseName}-alternated-period-${modifier.period}.svg`;
    }

    if (modifier.name === "dot") {
      return `${baseName}-dot-${modifier.shape}.svg`;
    }

    if (modifier.name === "plied") {
      return `${baseName}-plied-strands-${modifier.strands}.svg`;
    }

    return `${baseName}-${modifier.name}.svg`;
  }
}
