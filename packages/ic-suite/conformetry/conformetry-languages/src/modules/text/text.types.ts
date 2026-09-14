// 🏷️ Types

/** A template line that could not be found in the instance. */
export interface MissingLine {
  readonly line: string;
  /** 1-based line number in the rendered template. */
  readonly templateLine: number;
}
