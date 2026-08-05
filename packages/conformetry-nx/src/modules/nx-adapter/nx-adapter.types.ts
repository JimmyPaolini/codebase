import type { GeneratorCallback, Tree } from "@nx/devkit";

// 🏷️ Types

/**
 * A generator callback compatible with Nx generator factories.
 */
export type ConformetryGeneratorFactory = (
  tree: Tree,
  options?: Record<string, unknown>,
) => Promise<GeneratorCallback>;

/**
 * Creates a generator factory that renders templates into an Nx tree.
 */
export interface ConformetryGeneratorFactoryOptions {
  definition: GeneratorDefinition;
  resolveTargetDirectoryPath?: (args: {
    options: Record<string, unknown>;
    tree: Tree;
  }) => Promise<string> | string;
}

/**
 * A directory entry read from the source template tree.
 */
export interface DirectoryEntry {
  isDirectory: boolean;
  name: string;
}

/**
 * Filesystem operations used by the runtime.
 */
export interface FileSystemAdapter {
  exists(pathName: string): Promise<boolean>;
  listDirectory(directoryPath: string): Promise<DirectoryEntry[]>;
  makeDirectory(directoryPath: string): Promise<void>;
  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
}

/**
 * Formatting operations applied after generation completes.
 */
export interface FormatterAdapter {
  formatFile(filePath: string): Promise<void>;
  formatFiles(filePaths: string[]): Promise<void>;
}

/**
 * Generator metadata and runtime configuration.
 */
export interface GeneratorDefinition {
  aliases?: string[];
  description?: string;
  hooks?: GeneratorHooks;
  name: string;
  templateDirectoryPath: string;
}

/**
 * A generator hook function.
 */
export type GeneratorHook = (
  context: GeneratorHookContext,
) => Promise<void> | void;

/**
 * Data exposed to generator hooks.
 */
export interface GeneratorHookContext {
  definition: GeneratorDefinition;
  generatedFilePaths: string[];
  input: Record<string, string>;
  outputDirectoryPath: string;
  substitutions: Record<string, string>;
}

/**
 * Generator lifecycle hooks.
 */
export interface GeneratorHooks {
  postGenerate?: GeneratorHook;
  preGenerate?: GeneratorHook;
}

/**
 * Minimal glob matcher used by the runtime.
 */
export interface PathMatcher {
  match(pathName: string, pattern: string): boolean;
}

/**
 * Resolves the target directory for generated files.
 */
export interface ResolveConformetryTargetDirectoryPathArguments {
  definition: GeneratorDefinition;
  options: Record<string, unknown>;
  tree: Tree;
}

/**
 * Arguments accepted by the runtime runner.
 */
export interface RunGeneratorArguments {
  definition: GeneratorDefinition;
  filesystem?: FileSystemAdapter;
  formatter?: FormatterAdapter;
  inputs?: Record<string, string | undefined>;
  pathMatcher?: PathMatcher;
  targetDirectoryPath: string;
  templateRenderer?: TemplateRenderer;
}

/**
 * Result returned by the runtime runner.
 */
export interface RunGeneratorResult {
  generatedFilePaths: string[];
  outputDirectoryPath: string;
}

/**
 * Renders template placeholders into generated output files.
 */
export interface TemplateRenderer {
  render(
    templateContent: string,
    substitutions: Record<string, string>,
  ): string;
}
