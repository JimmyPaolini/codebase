// 🏷️ Types

/**
 * A project's immediate one-hop neighborhood in the Nx project graph.
 *
 * One hop in each direction is the whole point: what a project needs from the
 * workspace, and who would break if it changed, not the whole workspace graph
 * redrawn around it.
 */
export interface Neighborhood {
  /** Projects this one depends on, sorted. */
  readonly dependencies: string[];
  /** Projects that depend on this one, sorted. */
  readonly dependents: string[];
  /** Every edge to draw, sorted. */
  readonly edges: NeighborhoodEdge[];
  /** The project the neighborhood is centered on. */
  readonly projectName: string;
}

/** One project depending on another. */
export interface NeighborhoodEdge {
  /** True when Nx inferred the dependency from configuration, not from code. */
  readonly implicit: boolean;
  readonly source: string;
  readonly target: string;
}

/** A workspace project the Nx graph knows about. */
export interface NxProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  readonly name: string;
}
