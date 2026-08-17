// 🏷️ Types

import type { PreparedValidationDocument } from "@conformetry/core";
import type { Substitutions } from "@conformetry/generation";

/** Arguments for expanding instance globs into instances. */
export interface FindInstancesArguments {
  /** Glob patterns, resolved against the working directory. */
  readonly patterns: string[];
  /**
   * Applied to every instance these patterns produce. Callers that need
   * per-project values, such as an Nx plugin supplying `type`, call once per
   * project rather than passing a lookup table.
   */
  readonly substitutions?: Substitutions;
  readonly workingDirectory: string;
}

/**
 * A place a template's tree is rendered into, plus the name it renders with.
 *
 * Instances come from the caller's glob expansion. Nothing here knows how they
 * were found — that is the host's job, because globbing a workspace and
 * reading project labels is workspace knowledge, not template knowledge.
 */
export interface Instance {
  /**
   * Absolute paths the match is restricted to, or `undefined` for the whole
   * directory tree.
   *
   * This is what lets a two-file template like `nestjs-service-file` win. A
   * directory glob leaves the scope open and the largest fitting template
   * wins; a file glob narrows the scope to the matched files, so a template
   * describing exactly those files fits better than one describing the whole
   * directory.
   */
  readonly fileScope?: string[];
  /** Drives the name substitutions — a directory basename or a filename stem. */
  readonly nameStem: string;
  /**
   * Absolute path to the directory the template's tree is laid over.
   *
   * A template that produces a folder contains that folder, so this is the
   * folder's *parent*: `nestjs-service-module` holds `{{nameKebabCase}}/…`,
   * and its path is `…/src/modules`. A template that produces loose files
   * holds them at its root, and its path is the directory those files sit in.
   */
  readonly path: string;
  /**
   * Substitutions the caller supplies on top of the derived name variants,
   * such as `type` from the project graph. Mustache renders an unknown
   * placeholder as empty, so anything a template references must arrive here.
   */
  readonly substitutions?: Substitutions;
}

/** A file a matched template requires its instance to have. */
export interface InstanceFile {
  readonly instance: MatchedInstance;
  readonly instanceFilePath: string;
  readonly templateFilePath: string;
}

/** An instance paired with the template that best explains it. */
export interface MatchedInstance {
  readonly instance: Instance;
  /** How many of the template's files the instance already has. */
  readonly matchedFileCount: number;
  readonly substitutions: Substitutions;
  readonly template: TemplateDefinition;
}

/** Documents prepared for one matched instance. */
export interface PreparedInstanceDocuments {
  readonly documents: PreparedValidationDocument[];
  readonly instance: MatchedInstance;
}

/** Arguments for preparing comparison documents for matched instances. */
export interface PrepareDocumentsArguments {
  readonly fileExtensions: string[];
  readonly instances: MatchedInstance[];
}

/** The outcome of resolving a set of instances against a set of templates. */
export interface ResolvedInstances {
  readonly matched: MatchedInstance[];
  readonly unmatched: UnmatchedInstance[];
}

/** One template: a directory of mustache files under the templates root. */
export interface TemplateDefinition {
  /** Absolute path to the template's own directory. */
  readonly directoryPath: string;
  /** Absolute paths of every file in the template, sorted. */
  readonly filePaths: string[];
  /** The template's directory name, used to identify it. */
  readonly name: string;
}

/**
 * One template weighed against an instance during matching.
 *
 * `matchRatio` measures which template *fits*, by file presence alone. It is
 * deliberately not called a score: an instance's conformance score measures
 * how well the matched template's contents are honoured, which is a different
 * number arrived at a different way.
 */
export interface TemplateMatch {
  readonly matchedFileCount: number;
  /** Share of the template's files the instance already has, 0 to 1. */
  readonly matchRatio: number;
  readonly template: TemplateDefinition;
}

/** An instance no template explains well enough to validate against. */
export interface UnmatchedInstance {
  readonly instance: Instance;
  readonly reason: UnmatchedReason;
  /** Templates that tied, when the reason is `ambiguous`. */
  readonly tiedTemplateNames: string[];
}

/**
 * Why an instance could not be matched.
 *
 * Both are reported rather than skipped: a glob is the caller asserting these
 * directories are instances, so an instance matching nothing is a real finding,
 * and a tie means two templates are indistinguishable.
 */
export type UnmatchedReason = "ambiguous" | "no-match";
