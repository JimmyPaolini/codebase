// 🏷️ Types

/**
 * A Python project's internal file-level import Graph: which of its own
 * files import which other of its own files.
 *
 * Shaped identically to `codependix-imports`'s `ImportGraph`, kept as its own
 * type rather than shared: the two packages build the same kind of graph
 * from entirely different sources — a `ts.Program` versus a hand-rolled
 * statement parser — the same independence `codependix-nx` and
 * `codependix-nestjs` already keep from each other and from
 * `codependix-imports`.
 */
export interface PythonImportGraph {
  /** Every drawn import relationship, sorted so the diagram never churns. */
  readonly edges: PythonImportGraphEdge[];
  /** Every source file in the graph, project-relative and sorted. */
  readonly fileNames: string[];
  /** Files left with no drawn edge in either direction. */
  readonly isolatedFileNames: string[];
  /** The project the graph was built from. */
  readonly projectName: string;
}

/** One file importing another, both paths project-relative. */
export interface PythonImportGraphEdge {
  readonly source: string;
  readonly target: string;
}
