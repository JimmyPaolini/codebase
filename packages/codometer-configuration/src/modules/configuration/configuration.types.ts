// 🏷️ Types

/**
 * Aggregated code statistics produced by the measurement pipeline,
 * grouped by the language each counter was measured from.
 *
 * This is the shape every configured callback is handed, which is why it lives
 * beside the configuration types rather than in the CLI that produces it: a
 * `codometer.config.ts` has to be able to name it.
 */
export interface CodeStatisticsResult {
  folders: number;
  javascript: JavascriptStatistics;
  json: JsonStatistics;
  jupyter: JupyterStatistics;
  linesOfCode: number;
  markdown: MarkdownStatistics;
  python: PythonStatistics;
  repoSizeMiB: number;
  sourceFiles: number;
  typescript: TypescriptStatistics;
}

/**
 * Configuration authored in a `codometer.config.ts` file.
 *
 * Every field is optional. A repository with no configuration file at all is
 * still measurable, which is what keeps the tool usable before anyone has
 * decided what their exclusions or output destinations should be.
 */
export interface CodometerConfiguration {
  exclude?: string[] | undefined;
  output?: CodometerOutputConfiguration | undefined;
  python?: CodometerPythonConfiguration | undefined;
}

/** Where and how the JSON statistics report is written. */
export interface CodometerJsonOutputConfiguration {
  indentation?: number | undefined;
  path: string;
}

/**
 * Where and how the markdown report is written.
 *
 * `render` and `write` are the two halves of the built-in behavior, each
 * replaceable on its own: `render` turns the statistics into markdown, and
 * `write` decides which file that markdown lands in and how. Supplying only
 * one keeps the built-in other half.
 *
 * `path` is optional because a `write` function may choose the file itself —
 * but one of the two must be present, or there is no markdown output at all.
 */
export interface CodometerMarkdownOutputConfiguration {
  description?: string | undefined;
  endMarker?: string | undefined;
  path?: string | undefined;
  render?: RenderMarkdownOutput | undefined;
  startMarker?: string | undefined;
  write?: undefined | WriteMarkdownOutput;
}

/** Destinations the measured statistics are written to. */
export interface CodometerOutputConfiguration {
  json?: CodometerJsonOutputConfiguration | undefined;
  markdown?: CodometerMarkdownOutputConfiguration | undefined;
}

/** How Python sources are analyzed. */
export interface CodometerPythonConfiguration {
  command?: string | undefined;
}

/** Code statistics specific to JavaScript source files. */
export interface JavascriptStatistics {
  asyncFunctions: number;
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  exported: number;
  externalPackages: number;
  files: number;
  functions: number;
  imports: number;
  methods: number;
  syncFunctions: number;
  testFiles: number;
  todos: number;
}

/** Code statistics specific to JSON, JSONC, and JSONL files. */
export interface JsonStatistics {
  arrays: number;
  booleans: number;
  files: number;
  items: number;
  lines: number;
  maxDepth: number;
  nulls: number;
  numbers: number;
  objects: number;
  properties: number;
  strings: number;
  totalNodes: number;
}

/**
 * Statistics specific to Jupyter notebooks.
 *
 * A notebook is three languages in one file, so the counters come from three
 * analyzers: the notebook document itself is JSON, its code cells are Python,
 * and its markdown cells are prose. Cell and output counts are the notebook's
 * own, belonging to no single language.
 */
export interface JupyterStatistics {
  cells: number;
  classes: number;
  codeBlocks: number;
  codeCells: number;
  codeLines: number;
  decorators: number;
  executedCells: number;
  files: number;
  functions: number;
  headings: number;
  images: number;
  imports: number;
  links: number;
  markdownCells: number;
  markdownLines: number;
  maxDepth: number;
  outputs: number;
  properties: number;
  rawCells: number;
  totalNodes: number;
}

/** Arguments accepted when loading a configuration file. */
export interface LoadConfigurationArguments {
  configurationPath?: string | undefined;
  searchDirectory?: string | undefined;
}

/**
 * The anchor mechanics a `write` function would otherwise have to reimplement.
 *
 * Splicing a generated block between two HTML comments is the common case, so
 * it is one call away even for a writer that picks its own file.
 */
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

/** Structural statistics specific to markdown documents. */
export interface MarkdownStatistics {
  blockQuotes: number;
  codeBlocks: number;
  files: number;
  headingLevel1: number;
  headingLevel2: number;
  headingLevel3: number;
  headingLevel4: number;
  headingLevel5: number;
  headingLevel6: number;
  images: number;
  inlineCode: number;
  lines: number;
  links: number;
  listItems: number;
  lists: number;
  paragraphs: number;
  tableRows: number;
  tables: number;
  taskListItems: number;
  thematicBreaks: number;
}

/** Code statistics specific to Python source files. */
export interface PythonStatistics {
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  decorators: number;
  docstringLines: number;
  docstrings: number;
  files: number;
  functions: number;
  imports: number;
  lines: number;
  protocols: number;
}

/** What a `render` function is handed. */
export interface RenderMarkdownArguments {
  /** The configured description, for a renderer that wants to place it itself. */
  description: string | undefined;
  /**
   * The built-in badge rendering of these same statistics.
   *
   * Call it to add to the default report rather than replace it.
   */
  renderBadges: () => string;
  statistics: CodeStatisticsResult;
}

/** Turns the measured statistics into the markdown that will be written. */
export type RenderMarkdownOutput = (args: RenderMarkdownArguments) => string;

/**
 * Configuration with every default applied.
 *
 * Consumers read this shape rather than the authored one, so no analyzer has
 * to know which fields a configuration file may omit.
 */
export interface ResolvedCodometerConfiguration {
  exclude: string[];
  output: ResolvedCodometerOutputConfiguration;
  python: ResolvedCodometerPythonConfiguration;
}

/** JSON output destination with defaults applied. */
export interface ResolvedCodometerJsonOutputConfiguration {
  indentation: number;
  path: string;
}

/**
 * Markdown output destination with defaults applied.
 *
 * `render` and `write` stay `undefined` when the configuration supplies
 * neither: the built-in implementations live in the CLI that calls them, so
 * "unset" is what selects them rather than a default named here.
 */
export interface ResolvedCodometerMarkdownOutputConfiguration {
  description: string | undefined;
  endMarker: string;
  path: string | undefined;
  render: RenderMarkdownOutput | undefined;
  startMarker: string;
  write: undefined | WriteMarkdownOutput;
}

/**
 * Output destinations with defaults applied.
 *
 * A destination stays `undefined` when nothing named it. Absent means "do not
 * write this file", which is a different instruction from a default path
 * nobody asked for.
 */
export interface ResolvedCodometerOutputConfiguration {
  json: ResolvedCodometerJsonOutputConfiguration | undefined;
  markdown: ResolvedCodometerMarkdownOutputConfiguration | undefined;
}

/** Python analysis settings with defaults applied. */
export interface ResolvedCodometerPythonConfiguration {
  command: string;
}

/** Code statistics specific to TypeScript source files. */
export interface TypescriptStatistics {
  decorators: number;
  docComments: number;
  enums: number;
  files: number;
  genericDeclarations: number;
  interfaces: number;
}

/** What a `write` function is handed. */
export interface WriteMarkdownArguments {
  anchors: MarkdownAnchorHelpers;
  /** True when nothing may be written and the file is only being inspected. */
  check: boolean;
  /** The markdown produced by the render step. */
  content: string;
  /** The configured path, resolved against the measured directory. */
  path: string | undefined;
  statistics: CodeStatisticsResult;
}

/**
 * Decides which file the rendered markdown lands in, and how.
 *
 * Return `false` to report the destination as stale — in check mode that is
 * what fails the command. Anything else counts as up to date.
 */
export type WriteMarkdownOutput = (args: WriteMarkdownArguments) => boolean;
