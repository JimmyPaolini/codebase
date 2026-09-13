// 🏷️ Types

import type { CallGraphResult } from "./call-graph.types";

/** The shape of a `callidescope.config.ts` default export. */
export interface CallidescopeConfiguration {
  /**
   * Project directories to trace. Every directory holding its own
   * `tsconfig.json`, found by walking the workspace, when omitted.
   *
   * Narrowing this is the difference between a one-second pre-commit check and
   * a whole-workspace analysis, because each directory needs its own program.
   */
  directories?: string[] | undefined;
  entryPoints?: CallidescopeEntryPoints | undefined;
  exclude?: string[] | undefined;
  /**
   * Globs matched against a callable's display name (`Type.member`):
   * calls landing on a match are dropped from the graph entirely, counting
   * toward neither the caller's depth nor its breadth.
   *
   * For a cross-cutting callable like a logger, every call site is a fact
   * about instrumentation, not about how deep or wide the code around it
   * is — counting it would move every other callable's numbers on a change
   * that has nothing to do with them.
   */
  excludeCallees?: string[] | undefined;
  /** Gitignore-syntax files listing paths to leave untraced. */
  excludeFrom?: string[] | undefined;
  limits?: CallidescopeLimits | undefined;
  write?: CallidescopeWriteConfiguration | undefined;
}

/** Which callables are treated as the roots of a call stack. */
export interface CallidescopeEntryPoints {
  /**
   * Callables this configuration declares as roots, written as
   * `<file>#<qualified-name>` — the same address the `depth` and `breadth`
   * commands accept and every stack frame prints, so one can be copied out of
   * a report straight into here. A trailing `:<line>` disambiguates a file
   * holding two declarations under one qualified name.
   *
   * Declared roots are additive: the rules below keep running, and orphan
   * promotion still catches whatever nobody named. An address naming a
   * callable a rule already rooted is one root, not two.
   */
  addresses?: string[] | undefined;
  /**
   * Decorators whose methods a framework invokes.
   *
   * Matched against the decorator's own name, then confirmed against the
   * package that declares it, so a locally defined `Command` is not mistaken
   * for nest-commander's.
   */
  decorators?: string[] | undefined;
  /** Treat every `src/index.ts` export as a root. Defaults to true. */
  includeExportedFunctions?: boolean | undefined;
  /**
   * Promote callables nothing in the repository calls. Defaults to true.
   *
   * This is the safety net that makes a wrong rule set visible: without it, a
   * missing rule silently removes whole subtrees from every measurement.
   */
  includeOrphans?: boolean | undefined;
  /** Trace test files too. Defaults to false. */
  includeTests?: boolean | undefined;
}

/** JSON output destination. */
export interface CallidescopeJsonOutputConfiguration {
  indentation?: number | undefined;
  path: string;
}

/**
 * Thresholds that decide what a run reports.
 *
 * Two, and both per project: how deep a stack may run, and how widely one
 * callable may reach. Every limit this tool once had beyond these described a
 * finding nobody acted on.
 */
export interface CallidescopeLimits {
  /**
   * Distinct callables a callable may call directly before it is reported.
   *
   * No default is applied: a project must configure this explicitly before
   * `--check breadth` can run against it.
   */
  maximumBreadth?: number | undefined;
  /** Frames a call stack may hold before it is reported. */
  maximumDepth?: number | undefined;
}

/** Markdown output destination. */
export interface CallidescopeMarkdownOutputConfiguration {
  description?: string | undefined;
  endMarker?: string | undefined;
  /**
   * Heading the block is written under, `# 🔭 Callidescope` by default.
   *
   * Configurable for the same reason `projectReadmes.heading` is, and it is
   * the level rather than the words that usually needs changing: a block
   * spliced into a file that already has a title needs an `##` here, or the
   * file ends up with two first-level headings and every markdown linter
   * rejects it. The subsection levels follow whatever this is set to, so the
   * block stays a well-formed subtree of the document it lands in.
   */
  heading?: string | undefined;
  path: string;
  render?: RenderMarkdownOutput | undefined;
  startMarker?: string | undefined;
  writeBlock?: undefined | WriteMarkdownOutput;
}

/** How a run renders what it found. */
export type CallidescopeOutputFormat = "json" | "markdown" | "mermaid";

/**
 * A section spliced into every traced project's own README.
 *
 * One destination rather than a list of paths: which files these are follows
 * from which projects were traced, and restating that in configuration would
 * only give it somewhere to drift from.
 */
export interface CallidescopeProjectReadmeConfiguration {
  endMarker?: string | undefined;
  /** Heading the section is written under. */
  heading?: string | undefined;
  /** Stacks shown before the rest fold into a disclosure. */
  previewCount?: number | undefined;
  startMarker?: string | undefined;
}

/** Where a run writes its findings. */
export interface CallidescopeWriteConfiguration {
  json?: CallidescopeJsonOutputConfiguration | undefined;
  markdown?: CallidescopeMarkdownOutputConfiguration | undefined;
  /**
   * A markdown block whose call stacks are drawn rather than printed.
   *
   * Its own destination rather than a mode on `markdown`, so a repository can
   * publish both: the tree carries what each frame takes, returns, and
   * documents, and the diagram carries the shape they make together. Neither
   * one is the other with a flag flipped.
   */
  mermaid?: CallidescopeMarkdownOutputConfiguration | undefined;
  projectReadmes?: CallidescopeProjectReadmeConfiguration | undefined;
}

/**
 * One resolved limit, its value, and where that value was written.
 *
 * The provenance is carried rather than dropped once the number is known,
 * because a run judging every project against a different limit has to be able
 * to say which file each number came from — and a bare number cannot tell a
 * limit a project chose apart from one it merely inherited.
 */
export interface LimitProvenance {
  /**
   * `declared` when the project's own configuration set this limit,
   * `inherited` when it took the workspace's.
   */
  origin: "declared" | "inherited";
  /** The file the value was read from, absent when no file was found. */
  path: string | undefined;
  value: number;
}

/** Arguments accepted by the configuration loader. */
export interface LoadConfigurationArguments {
  configurationPath?: string | undefined;
  searchDirectory?: string | undefined;
}

/**
 * A resolved configuration, what the file itself declared, and which file it
 * was.
 *
 * Both objects are kept because they answer different questions. A refusal has
 * to name the fields the file set, which resolution would otherwise
 * manufacture; anything judging a project reads values only resolution
 * supplies. The path is what nothing downstream of the search can still tell,
 * and what keeps one file from being given two roles in a run.
 */
export interface LoadedCallidescopeConfiguration {
  /** The file's own object, before a single default was applied. */
  authored: CallidescopeConfiguration;
  configuration: ResolvedCallidescopeConfiguration;
  /** `undefined` when no configuration file was found at all. */
  path: string | undefined;
}

/**
 * What a load reports when the caller named the file, so a path is certain.
 *
 * The search may find nothing and legally say so; a named path either resolves
 * or refuses, and never comes back as `undefined`.
 */
export interface LoadedCallidescopeConfigurationFile extends LoadedCallidescopeConfiguration {
  path: string;
}

/** One project's own configuration file, and the project it configures. */
export interface LoadedProjectConfiguration {
  /** The file's own object, before a single default was applied. */
  authored: CallidescopeConfiguration;
  configuration: ResolvedCallidescopeConfiguration;
  path: string;
  /** Workspace-relative root of the project the file sits at. */
  project: string;
}

/** Arguments accepted by the project configuration loader. */
export interface LoadProjectConfigurationsArguments {
  /** Workspace-relative project roots to look beside. */
  projects: readonly string[];
  /**
   * The file already loaded as the run's own workspace configuration, either
   * absolute or relative to `workspaceRoot` — resolved against that root, the
   * same way every project path here is, so the two are comparable by
   * construction rather than by convention.
   *
   * One file, one role per run: a configuration that a run was pointed at is
   * not additionally read as the configuration of whichever project happens to
   * hold it. A package whose Nx target names its own file is exactly that case,
   * and treating the file as both would refuse it for the workspace-only fields
   * it legitimately sets.
   */
  workspaceConfigurationPath?: string | undefined;
  workspaceRoot: string;
}

/** Splicing helpers handed to a configured `writeBlock` function. */
export interface MarkdownAnchorHelpers {
  endMarker: string;
  startMarker: string;
  /**
   * Splices the anchored block into a file, appending it when the markers are
   * absent, and creating the file when it does not exist.
   *
   * In check mode nothing is written and the return value reports whether the
   * file already holds the current block. Defaults to the rendered content and
   * the configured path; pass either to override.
   */
  syncAnchoredBlock: (overrides?: {
    content?: string | undefined;
    path?: string | undefined;
  }) => boolean;
  /** The content wrapped in the configured markers, ready to place anywhere. */
  wrapInAnchors: (content?: string) => string;
}

/**
 * The two limits one project is gated by, each with the file it came from.
 *
 * Only depth and breadth: every other limit shapes how the call graph itself is
 * built, which has to stay one answer for the whole workspace.
 */
export interface ProjectLimits {
  /** Absent when neither the project nor the workspace declared one. */
  maximumBreadth: LimitProvenance | undefined;
  maximumDepth: LimitProvenance;
}

/**
 * The limits every traced project is judged against.
 *
 * `byProject` holds an entry for every project a run reached, whether or not it
 * declared anything, so a caller listing the workspace's limits reads this and
 * nothing else. `workspace` is what an unlisted project falls back to, which is
 * also the object a project inheriting both limits is given.
 */
export interface ProjectLimitsLookup {
  /** Keyed by workspace-relative project root. */
  byProject: ReadonlyMap<string, ProjectLimits>;
  workspace: ProjectLimits;
}

/** What a `render` function is handed. */
export interface RenderMarkdownArguments {
  /** The configured description, for a renderer that wants to place it itself. */
  description: string | undefined;
  /**
   * The built-in table rendering of these same findings.
   *
   * Call it to add to the default report rather than replace it.
   */
  renderTables: () => string;
  result: CallGraphResult;
}

/** Turns the traced findings into the markdown that will be written. */
export type RenderMarkdownOutput = (args: RenderMarkdownArguments) => string;

/**
 * Configuration with every default applied.
 *
 * Consumers read this shape rather than the authored one, so no analyzer has to
 * know which fields a configuration file may omit.
 */
export interface ResolvedCallidescopeConfiguration {
  directories: string[];
  entryPoints: ResolvedCallidescopeEntryPoints;
  exclude: string[];
  excludeCallees: string[];
  excludeFrom: string[];
  limits: ResolvedCallidescopeLimits;
  write: ResolvedCallidescopeWriteConfiguration;
}

/** Entry-point rules with defaults applied. */
export interface ResolvedCallidescopeEntryPoints {
  addresses: string[];
  decorators: string[];
  includeExportedFunctions: boolean;
  includeOrphans: boolean;
  includeTests: boolean;
}

/** JSON output destination with defaults applied. */
export interface ResolvedCallidescopeJsonOutputConfiguration {
  indentation: number;
  path: string;
}

/** Thresholds with defaults applied. */
export interface ResolvedCallidescopeLimits {
  /**
   * Distinct callables a callable may call directly before it is reported.
   *
   * Stays optional even after resolution: unlike every other limit, this one
   * has no default, so its absence is a fact a `--check breadth` run must act
   * on rather than something resolution can paper over.
   */
  maximumBreadth?: number | undefined;
  maximumDepth: number;
}

/**
 * Markdown output destination with defaults applied.
 *
 * `render` and `writeBlock` stay `undefined` when the configuration supplies
 * neither: the built-in implementations live in the CLI that calls them, so
 * "unset" is what selects them rather than a default named here.
 */
export interface ResolvedCallidescopeMarkdownOutputConfiguration {
  description: string | undefined;
  endMarker: string;
  heading: string;
  path: string;
  render: RenderMarkdownOutput | undefined;
  startMarker: string;
  writeBlock: undefined | WriteMarkdownOutput;
}

/** Project README destination with defaults applied. */
export interface ResolvedCallidescopeProjectReadmeConfiguration {
  endMarker: string;
  heading: string;
  previewCount: number;
  startMarker: string;
}

/**
 * Output destinations with defaults applied.
 *
 * Both stay `undefined` when unconfigured, which is the normal case: a run that
 * names no destination reports to the console and exits on violations, so
 * nothing it writes can go stale.
 */
export interface ResolvedCallidescopeWriteConfiguration {
  json: ResolvedCallidescopeJsonOutputConfiguration | undefined;
  markdown: ResolvedCallidescopeMarkdownOutputConfiguration | undefined;
  mermaid: ResolvedCallidescopeMarkdownOutputConfiguration | undefined;
  projectReadmes: ResolvedCallidescopeProjectReadmeConfiguration | undefined;
}

/** Arguments accepted by the per-project limit resolver. */
export interface ResolveProjectLimitsArguments {
  /** The configuration files projects declared for themselves. */
  projectConfigurations: readonly LoadedProjectConfiguration[];
  /** Workspace-relative root of every project the run reached. */
  projects: readonly string[];
  /**
   * The limits the workspace file itself wrote down, exactly as authored.
   *
   * Presence is what decides whether an inherited limit names a file: the
   * resolved configuration below manufactures `maximumDepth` for every run, so
   * a path stamped from it alone would name a file for a number that file
   * never wrote. The same split `readDeclaredLimit` makes for a project, made for
   * the row every project's inherits from.
   */
  workspaceAuthoredLimits: CallidescopeLimits | undefined;
  /** The run's own configuration, which a project inherits both limits from. */
  workspaceConfiguration: ResolvedCallidescopeConfiguration;
  /** The file that configuration was read from, when one was found. */
  workspaceConfigurationPath: string | undefined;
}

/** What a `writeBlock` function is handed. */
export interface WriteMarkdownArguments {
  /** True when nothing may be written and staleness is the only question. */
  check: boolean;
  /** The rendered markdown, before any anchoring. */
  content: string;
  helpers: MarkdownAnchorHelpers;
  path: string | undefined;
  result: CallGraphResult;
}

/**
 * Decides which file the rendered markdown lands in, and how.
 *
 * Return `false` to report the destination as stale — in check mode that is
 * what fails the command. Anything else counts as up to date.
 */
export type WriteMarkdownOutput = (args: WriteMarkdownArguments) => boolean;
