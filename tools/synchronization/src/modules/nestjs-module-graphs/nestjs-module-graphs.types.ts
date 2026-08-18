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
  /**
   * Projects imported at runtime whose modules are not in this container.
   *
   * `conformetry-validation` reaches its language packages through
   * `LazyModuleLoader`, so they are real dependencies and legitimately absent.
   */
  readonly runtimeDependencyNames: string[];
  /**
   * Projects this one uses only for their types.
   *
   * A type-only dependency declares no module by nature. Naming it is what
   * keeps this diagram from looking like it disagrees with the project graph.
   */
  readonly typeOnlyDependencyNames: string[];
}

/** One module importing another. */
export interface NestjsModuleGraphEdge {
  readonly from: string;
  /** True when the module is named for a runtime load rather than imported. */
  readonly runtime: boolean;
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
  /**
   * What each project imports from the rest of the workspace.
   *
   * This is what settles a name two packages define: `ConfigurationModule`
   * belongs to whichever package the project being graphed imported it from,
   * which its own source says outright.
   */
  readonly importsByProject: Map<string, NestjsProjectImports>;
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

/** What one project imports from the rest of the workspace. */
export interface NestjsProjectImports {
  /** Every workspace project this one imports from. */
  readonly projects: Set<string>;
  /** The project each imported module name came from. */
  readonly projectsByModule: Map<string, string>;
  /**
   * Modules this project names as a string rather than importing.
   *
   * The edge is from the module whose folder holds the naming file, which is
   * the module that does the loading.
   */
  readonly runtimeModuleEdges: NestjsModuleGraphEdge[];
  /** Projects every import of which is a `type` import. */
  readonly typeOnlyProjects: Set<string>;
}
