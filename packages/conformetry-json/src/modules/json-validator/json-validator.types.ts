// 🏷️ Types

/** Arguments for comparing two JSON values. */
export interface CompareJsonArguments {
  readonly instanceValue: JsonValue;
  readonly language: JsonComparisonLanguage;
  readonly pathSegments?: JsonPathSegment[];
  readonly templateValue: JsonValue;
}

/**
 * Which validator is asking for the comparison.
 *
 * The walk is shared between JSON files and Jupyter notebooks, and the errors
 * it emits must be attributed to whichever one raised them.
 */
export type JsonComparisonLanguage = "json" | "python";

/** One step of a JSON path: an object key or an array index. */
export type JsonPathSegment = number | string;

/** Any JSON value, used when structurally comparing two documents. */
export type JsonValue =
  | boolean
  | JsonValue[]
  | null
  | number
  | string
  | { [key: string]: JsonValue };
