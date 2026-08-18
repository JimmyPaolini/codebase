// ♟️ Constants

import ts from "typescript";

/**
 * How TypeScript renders the types in a signature.
 *
 * `NoTypeReduction` is left off so unions collapse, and the optional-parameter
 * flag is suppressed because a parameter already marked `?` does not also need
 * `| undefined` spelled out after its type.
 */
export const SIGNATURE_FORMAT_FLAGS =
  ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

/** The tag that marks a callable as on its way out. */
export const DEPRECATED_TAG = "deprecated";

/**
 * Characters of documentation prose a frame keeps.
 *
 * A summary is meant to orient a reader mid-stack, not to replace opening the
 * file, and a paragraph indented under ten frames is worse than a sentence.
 */
export const SUMMARY_LIMIT = 120;

/** Appended to anything the limits cut short. */
export const TRUNCATION_SUFFIX = "…";
