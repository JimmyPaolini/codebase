// 🏷️ Types

import type {
  ConformetryGeneratorDefinition,
  ConformetryInstanceGroup,
} from "@conformetry/configuration";

/**
 * The conformetry configuration as this plugin reads it.
 *
 * Authors type their config as this rather than as `ConformetryConfiguration`
 * to get the project scope checked; the base loader carries the extra field
 * through without interpreting it.
 */
export type ConformetryNxConfiguration = ConformetryNxGeneratorDefinition[];

/**
 * One generator, plus the projects and folders this plugin confines it to.
 *
 * `instances` is relaxed to optional because this is the shape a configuration
 * is *authored* in, where a scope stands in for it. The loaded
 * `ConformetryGeneratorDefinition` always carries one, because the loader
 * fills it in.
 */
export interface ConformetryNxGeneratorDefinition extends Omit<
  ConformetryGeneratorDefinition,
  "instances"
> {
  instances?: ConformetryInstanceGroup[] | undefined;
  /**
   * Which projects this generator applies to, and where inside them.
   *
   * Mutually exclusive with `instances`: a scope *derives* instance globs from
   * the workspace's projects, so declaring both would mean two answers to the
   * same question and one of them silently narrowing the other. A host with no
   * project graph keeps using `instances` and never sets this.
   */
  scope?: ConformetryNxProjectScope | undefined;
}

/** The projects a generator applies to, and the globs inside each of them. */
export interface ConformetryNxProjectScope {
  /**
   * Globs relative to each matching project's root, or `.` for the project
   * itself.
   *
   * Omitted means no instances are derived at all: the scope then only
   * constrains which projects the generator may be run against, which is what
   * a template with nothing to validate yet wants.
   */
  patterns?: string[] | undefined;
  /**
   * Nx project tags a project must carry for this generator to apply to it.
   *
   * Any one tag is enough rather than all of them: a scope names the kinds of
   * project a template suits, and a project is usually only one of them.
   */
  tags?: string[] | undefined;
}
