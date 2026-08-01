// 🏷️ Types

import type { NameSubstitutions } from "../generator/generator.types";

/**
 * Options accepted by the nestjs-service-application generator command.
 */
export interface NestjsServiceApplicationOptions {
  name?: string;
  type?: string;
}

/**
 * Template substitutions used by this module's templates.
 */
export interface NestjsServiceApplicationSubstitutions extends NameSubstitutions {
  type: string;
}
