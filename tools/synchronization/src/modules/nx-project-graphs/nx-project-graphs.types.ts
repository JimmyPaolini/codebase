// 🏷️ Types

/** A workspace project the Nx graph knows about. */
export interface NxProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  readonly name: string;
}

/** One project depending on another. */
export interface NxProjectGraphEdge {
  /** True when Nx inferred the dependency from configuration, not from code. */
  readonly implicit: boolean;
  readonly source: string;
  readonly target: string;
}

/** A project's immediate neighborhood in the Nx project graph. */
export interface NxProjectGraphNeighborhood {
  /** Projects this one depends on, sorted. */
  readonly dependencies: string[];
  /** Projects that depend on this one, sorted. */
  readonly dependents: string[];
  /** Every edge to draw, sorted. */
  readonly edges: NxProjectGraphEdge[];
  /** The project the graph is centered on. */
  readonly projectName: string;
}
