// 🏷️ Types

/**
 * A project's internal file-level import Graph: which of its own files
 * import which other of its own files.
 *
 * Only edges resolving to a file inside the project are kept — an import of
 * an external package or of another workspace project resolves outside
 * `fileNames` and is left out, the same way `Neighborhood` only draws edges
 * between projects it already knows about.
 */
export interface ImportGraph {
  /** Every drawn import relationship, sorted so the diagram never churns. */
  readonly edges: ImportGraphEdge[];
  /** Every source file in the graph, project-relative and sorted. */
  readonly fileNames: string[];
  /** Files left with no drawn edge in either direction. */
  readonly isolatedFileNames: string[];
  /** The project the graph was built from. */
  readonly projectName: string;
}

/** One file importing another, both paths project-relative. */
export interface ImportGraphEdge {
  readonly source: string;
  readonly target: string;
}
