// 🏷️ Types

import type { conformetryConfigurationSchema } from "./configuration.constants";
import type { z } from "zod";

/**
 * The loaded configuration: one entry per generator.
 *
 * An array rather than a keyed record because a generator's name is already a
 * field, and a record made the name true in two places at once.
 */
export type ConformetryConfiguration = ConformetryGeneratorDefinition[];

/** One generator, with the template it renders and the instances it governs. */
export interface ConformetryGeneratorDefinition {
  aliases?: string[];
  description?: string;
  /**
   * The values this generator substitutes, as JSON Schema fragments. Named for
   * what the implementation calls them everywhere else — a generator takes
   * inputs and renders a template with them.
   */
  inputs: Record<string, ConformetryGeneratorInputDefinition>;
  /**
   * Where this generator's output already lives in the workspace. Validation
   * expands these to find what to check; generation reads them to learn where
   * a new instance belongs.
   */
  instances: ConformetryInstanceGroup[];
  name: string;
  /** The template folder, relative to the workspace root. */
  templatePath: string;
}

/** One configurable input, expressed as a JSON Schema fragment. */
export type ConformetryGeneratorInputDefinition = Record<string, unknown>;

/**
 * One set of instance globs and the substitutions their template renders with.
 *
 * Directory and file patterns behave differently on purpose — see
 * `InstanceCandidate.instancePath`.
 */
export interface ConformetryInstanceGroup {
  /**
   * Globs locating this group's instances.
   *
   * Workspace-relative on their own. A host that resolves `tags` may instead
   * read them relative to each labelled host it selects — see
   * `ConformetryNxInstanceGroup` in `@conformetry/nx` — which is why a group
   * naming only tags is legal: it selects without locating.
   */
  patterns?: string[] | undefined;
  /**
   * Values every placeholder this generator's template uses must be given.
   * Mustache renders an unknown placeholder as empty, so a missing entry shows
   * up as a silent hole rather than an error.
   */
  substitutions?: Record<string, string> | undefined;
  /**
   * Labels selecting the hosts this group applies to.
   *
   * The base configuration carries them uninterpreted, because it has no
   * notion of a host to match them against; `conformetry-nx` reads them as Nx
   * project tags, and another host is free to read them as something else. A
   * group with no tags applies everywhere.
   */
  tags?: string[] | undefined;
}

/**
 * Minimal JSON Schema fragment used to discover a generator's inputs.
 *
 * Only the parts conformetry actually reads are modelled — `properties` for
 * the input names, and `required` for which ones must be supplied.
 */
export interface JsonSchemaDefinition {
  [key: string]: unknown;
  properties?: Record<string, unknown>;
}

/** One generator entry exactly as Zod parsed it, before defaults are applied. */
export type ParsedGeneratorEntry = z.infer<
  typeof conformetryConfigurationSchema
>[number];
