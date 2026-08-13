// 🏷️ Types

import type { NameSubstitutions } from "@conformance/src/modules/generator/generator.types";

/**
 * Auto-generated documentation placeholder.
 */
export interface NestjsCommandModuleOptions {
  name?: string;
  project?: string;
}

/**
 * Template substitutions used by this module's templates.
 */
export type NestjsCommandModuleSubstitutions = Exclude<
  NameSubstitutions,
  "nameSnakeCase"
>;
