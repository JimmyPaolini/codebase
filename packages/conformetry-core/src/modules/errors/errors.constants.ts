// ♟️ Constants

import type {
  ConformetryErrorLanguage,
  ConformetryErrorType,
} from "./errors.types";

/**
 * Every recognized error language, used to narrow untrusted payloads such as
 * the JSON returned by the Python validator bridge.
 */
export const CONFORMETRY_ERROR_LANGUAGES: readonly ConformetryErrorLanguage[] =
  ["javascript", "json", "markdown", "python", "text", "typescript"];

/**
 * Every recognized error category. Payloads carrying an unknown category are
 * coerced to `"code"` rather than rejected, so a validator can never crash the
 * run by emitting an unexpected value.
 */
export const CONFORMETRY_ERROR_TYPES: readonly ConformetryErrorType[] = [
  "code",
  "comment",
  "directory",
  "file",
  "instance",
];

/** Category used when an untrusted payload carries an unrecognized one. */
export const DEFAULT_CONFORMETRY_ERROR_TYPE: ConformetryErrorType = "code";
