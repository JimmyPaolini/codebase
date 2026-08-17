// 🏷️ Types

/** A NestJS module graph reduced to what the mermaid diagram needs. */
export interface NestjsModuleGraph {
  /** Every import relationship, sorted so the rendered diagram is stable. */
  readonly edges: NestjsModuleGraphEdge[];
  /** Modules that neither import nor are imported by anything else. */
  readonly isolatedModuleNames: string[];
  /** Every module class name reachable from the root module, sorted. */
  readonly moduleNames: string[];
}

/** One module importing another. */
export interface NestjsModuleGraphEdge {
  readonly from: string;
  readonly to: string;
}

/** A workspace project whose root module can be explored. */
export interface NestjsProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  /** Project directory name, which is also the Nx project name. */
  readonly name: string;
  /** Absolute path of the project's root module file. */
  readonly rootModuleFile: string;
}
