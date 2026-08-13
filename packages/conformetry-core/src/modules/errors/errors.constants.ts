// ♟️ Constants

import type {
  ConformanceErrorLanguage,
  ConformanceErrorType,
} from "./errors.types";

/**
 * Every recognized error language, used to narrow untrusted payloads such as
 * the JSON returned by the Python validator bridge.
 */
export const CONFORMANCE_ERROR_LANGUAGES: readonly ConformanceErrorLanguage[] =
  ["javascript", "json", "markdown", "python", "text", "typescript"];

/**
 * Every recognized error category. Payloads carrying an unknown category are
 * coerced to `"code"` rather than rejected, so a validator can never crash the
 * run by emitting an unexpected value.
 */
export const CONFORMANCE_ERROR_TYPES: readonly ConformanceErrorType[] = [
  "code",
  "comment",
  "directory",
  "file",
];

/** Category used when an untrusted payload carries an unrecognized one. */
export const DEFAULT_CONFORMANCE_ERROR_TYPE: ConformanceErrorType = "code";
