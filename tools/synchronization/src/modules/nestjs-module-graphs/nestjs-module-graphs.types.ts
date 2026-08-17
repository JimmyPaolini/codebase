// 🏷️ Types

/** A NestJS module graph reduced to what the mermaid diagram needs. */
export interface NestjsModuleGraph {
  /**
   * Modules every other module imports, and whose edges are therefore left
   * out. Reported so a caller can say why the diagram looks sparser than the
   * container does.
   */
  readonly ambientModuleNames: string[];
  /** Every drawn import relationship, sorted so the diagram is stable. */
  readonly edges: NestjsModuleGraphEdge[];
  /** Modules left with no drawn edge in either direction. */
  readonly isolatedModuleNames: string[];
  /** Every module class name in the graph, sorted. */
  readonly moduleNames: string[];
}

/** One module importing another. */
export interface NestjsModuleGraphEdge {
  readonly from: string;
  readonly to: string;
}

/** A workspace project tagged as a NestJS project. */
export interface NestjsProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  /** Project directory name, which is also the Nx project name. */
  readonly name: string;
  /**
   * Absolute path of the project's root module file, when it has one.
   *
   * Undefined for a library package, whose graph is rooted in a synthetic
   * module built from every module the package defines.
   */
  readonly rootModuleFile: string | undefined;
}
