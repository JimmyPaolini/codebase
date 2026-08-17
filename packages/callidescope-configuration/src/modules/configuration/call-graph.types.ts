// 🏷️ Types

/**
 * Stable identifier for one callable: workspace-relative path plus the byte
 * offset its declaration starts at.
 *
 * The offset rather than a line number, because two callables can share a line
 * — an arrow property and its enclosing statement do — while exactly one
 * declaration can start at one offset.
 */
export type CallableId = string;

/** The declaration shape a callable was found as. */
export type CallableKind =
  | "accessor"
  | "arrow-property"
  | "callback"
  | "constructor"
  | "function"
  | "method"
  | "module"
  | "object-literal-method";

/** One function-like declaration in the workspace. */
export interface CallableNode {
  readonly displayName: string;
  readonly enclosingTypeName: string | undefined;
  readonly id: CallableId;
  readonly isExported: boolean;
  readonly kind: CallableKind;
  readonly location: SourceLocation;
  readonly memberName: string;
  readonly moduleId: ModuleId;
  readonly projectName: string;
  readonly statementCount: number;
}

/** One caller-to-callee edge, produced by one call site. */
export interface CallEdge {
  readonly calleeId: CallableId;
  readonly callerId: CallableId;
  readonly callSite: SourceLocation;
  /** Above one means a virtual dispatch: the call site had several targets. */
  readonly candidateCount: number;
  readonly resolution: EdgeResolution;
}

/** Everything one callidescope run produced. */
export interface CallGraphResult {
  readonly deepStacks: readonly DeepStackFinding[];
  readonly misplacedCallables: readonly MisplacedCallableFinding[];
  readonly moduleSpreads: readonly ModuleSpreadFinding[];
  readonly summary: CallGraphSummary;
  readonly typeDepths: readonly TypeDepthSummary[];
}

/** Counts describing the graph a run built. */
export interface CallGraphSummary {
  readonly callableCount: number;
  readonly cyclicComponentCount: number;
  readonly edgeCount: number;
  readonly entryPointCount: number;
  readonly fileCount: number;
  readonly maximumDepth: number;
  readonly projectCount: number;
  readonly unresolvedCallCount: number;
}

/** A call stack deeper than the configured limit. */
export interface DeepStackFinding {
  readonly depth: number;
  readonly entryPointKind: EntryPointKind;
  readonly frames: readonly StackFrame[];
  /**
   * True when a frame on this path holds an unresolved call, making `depth` a
   * floor rather than a measurement.
   */
  readonly isLowerBound: boolean;
  readonly limit: number;
}

/** How a call site was resolved to its target. */
export type EdgeResolution =
  | "alias"
  | "callback"
  | "direct"
  | "implementation"
  | "super";

/** A callable a framework, a runtime, or nothing at all calls. */
export interface EntryPoint {
  readonly callableId: CallableId;
  readonly kind: EntryPointKind;
}

/** What promoted a callable to the root of a call stack. */
export type EntryPointKind =
  | "decorated-method"
  | "exported-function"
  | "lifecycle"
  | "module-bootstrap"
  | "orphan-root";

/** A callable whose callers nearly all live in one other module. */
export interface MisplacedCallableFinding {
  readonly callerCount: number;
  readonly displayName: string;
  readonly foreignCallerCount: number;
  readonly homeModuleId: ModuleId;
  readonly id: CallableId;
  readonly location: SourceLocation;
  readonly suggestedModuleId: ModuleId;
}

/**
 * The unit cohesion is measured in: `<project>:<subtree>`, for example
 * `codometer-cli:modules/typescript`.
 */
export type ModuleId = string;

/** A callable whose callees span many unrelated modules. */
export interface ModuleSpreadFinding {
  readonly depth: number;
  readonly directModuleIds: readonly ModuleId[];
  readonly displayName: string;
  readonly id: CallableId;
  readonly location: SourceLocation;
  readonly statementCount: number;
  readonly transitiveSpread: number;
}

/** Where a declaration or a call site sits. */
export interface SourceLocation {
  readonly column: number;
  /** Workspace-relative, POSIX separators, so reports are machine-independent. */
  readonly filePath: string;
  readonly line: number;
}

/** One frame of a reported call stack. */
export interface StackFrame {
  readonly displayName: string;
  readonly id: CallableId;
  /** True when this frame belongs to a recursive cycle. */
  readonly isCycle: boolean;
  readonly location: SourceLocation;
}

/** Depth range across the members of one class, reported as context. */
export interface TypeDepthSummary {
  readonly maximumDepth: number;
  readonly memberCount: number;
  readonly minimumDepth: number;
  readonly moduleId: ModuleId;
  readonly typeName: string;
}

/**
 * A call site that produced no edge.
 *
 * Every depth measured through a callable holding one of these is a lower
 * bound, which is why the reason is kept rather than discarded.
 */
export interface UnresolvedCall {
  readonly calleeText: string;
  readonly callerId: CallableId;
  readonly callSite: SourceLocation;
  readonly reason: UnresolvedReason;
}

/** Why a call site produced no edge. */
export type UnresolvedReason =
  | "computed-member"
  | "dynamic-value"
  | "fan-out-exceeded"
  | "generic-parameter"
  | "no-implementation"
  | "no-symbol";
