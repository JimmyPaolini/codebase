// 🏷️ Types

/**
 * A throwaway project directory one delivery example writes into.
 *
 * Delivery is file I/O, so an example that demonstrates it has to write
 * somewhere. Writing into a temporary directory rather than into `output/`
 * keeps the committed example output to what a reader should read, and keeps
 * every `<!-- codependix:start -->` marker this package produces out of any
 * file the real `codebase:codependix:write` could ever claim.
 */
export interface ScratchProject {
  /** Absolute root every delivered path is resolved against. */
  readonly absoluteRoot: string;
  /** Project name, which `ProjectRunResult` is keyed by. */
  readonly name: string;
}
