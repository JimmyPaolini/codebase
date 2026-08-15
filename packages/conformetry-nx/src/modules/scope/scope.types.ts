// 🏷️ Types

import type { ConformetryGeneratorDefinition } from "@conformetry/configuration";

/**
 * The conformetry configuration as this plugin reads it.
 *
 * Authors type their config as this rather than as `ConformetryConfiguration`
 * to get the project scope checked; the base loader carries the extra field
 * through without interpreting it.
 */
export type ConformetryNxConfiguration = ConformetryNxGeneratorDefinition[];

/** One generator, plus the projects and folders this plugin confines it to. */
export interface ConformetryNxGeneratorDefinition extends ConformetryGeneratorDefinition {
  /**
   * Where in the workspace this generator may operate.
   *
   * Omitted means anywhere, so a configuration that never mentions scope
   * behaves exactly as it did before scopes existed.
   */
  scope?: ConformetryNxProjectScope | undefined;
}

/** The projects a generator applies to, and where inside them it writes. */
export interface ConformetryNxProjectScope {
  /**
   * Directories inside a matching project, relative to the project root.
   *
   * Both the folder a new instance is written into and the folder existing
   * instances are validated in, so a generator cannot be told to generate
   * somewhere it would then fail to validate.
   */
  directories?: string[] | undefined;
  /**
   * Nx project tags a project must carry for this generator to apply to it.
   *
   * Any one tag is enough rather than all of them: a scope names the kinds of
   * project a template suits, and a project is usually only one of them.
   */
  tags?: string[] | undefined;
}
