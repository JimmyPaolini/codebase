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
  /** The modules of the graph, grouped by the project that defines them. */
  readonly groups: NestjsModuleGraphGroup[];
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

/** The modules one project contributes to a graph. */
export interface NestjsModuleGraphGroup {
  readonly moduleNames: string[];
  /**
   * Project that defines these modules.
   *
   * Undefined for the modules NestJS and its ecosystem define, which belong to
   * no project in this workspace and are drawn ungrouped.
   */
  readonly projectName: string | undefined;
}

/** Who defines each module name in and around the workspace. */
export interface NestjsModuleOwnership {
  /**
   * Module names NestJS itself exports.
   *
   * `DiscoveryModule` is both a `@nestjs/core` module and one a package here
   * defines, and a name alone cannot tell them apart — so a framework name is
   * never credited to a workspace project.
   */
  readonly frameworkModuleNames: Set<string>;
  /** Every workspace project defining each module name. */
  readonly projectsByModule: Map<string, string[]>;
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
