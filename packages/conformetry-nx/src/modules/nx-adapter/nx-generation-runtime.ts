import path from "node:path";

import {
  NxTemplateRenderer,
  type TemplateRenderer,
} from "./nx-template-renderer.ts";

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
  schemaPath: string;
  targetPathStrategy?: string;
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
 * Executes generation against the provided filesystem adapter.
 */
export class GenerationRuntimeService {
  private readonly defaultFileSystem: FileSystemAdapter = {
    exists: async (_pathName: string) => {
      return await Promise.resolve(false);
    },
    listDirectory: async (_directoryPath: string) => {
      return await Promise.resolve([]);
    },
    makeDirectory: async (_directoryPath: string) => {
      await Promise.resolve();
    },
    readFile: async (_filePath: string) => {
      return await Promise.resolve("");
    },
    writeFile: async (_filePath: string, _content: string) => {
      await Promise.resolve();
    },
  };

  private readonly defaultFormatter: FormatterAdapter = {
    formatFile: async (_filePath: string) => {
      await Promise.resolve();
    },
    formatFiles: async (_filePaths: string[]) => {
      await Promise.resolve();
    },
  };

  private readonly defaultTemplateRenderer: TemplateRenderer =
    new NxTemplateRenderer();

  /**
   * Creates the hook context passed to generator hooks.
   */
  private createHookContext(args: {
    definition: RunGeneratorArguments["definition"];
    generatedFilePaths: string[];
    input: Record<string, string>;
    outputDirectoryPath: string;
    substitutions: Record<string, string>;
  }): GeneratorHookContext {
    return {
      definition: args.definition,
      generatedFilePaths: args.generatedFilePaths,
      input: args.input,
      outputDirectoryPath: args.outputDirectoryPath,
      substitutions: args.substitutions,
    };
  }

  /**
   * Filters undefined input values out of the runtime input map.
   */
  private normalizeInputs(
    inputs: Record<string, string | undefined>,
  ): Record<string, string> {
    const normalizedInputs: Record<string, string> = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (value !== undefined) {
        normalizedInputs[key] = value;
      }
    }

    return normalizedInputs;
  }

  /**
   * Recursively renders a template tree and returns all generated paths.
   */
  private async renderTemplateDirectory(args: {
    filesystem: FileSystemAdapter;
    substitutions: Record<string, string>;
    targetDirectoryPath: string;
    templateDirectoryPath: string;
    templateRenderer: TemplateRenderer;
  }): Promise<string[]> {
    const {
      filesystem,
      substitutions,
      targetDirectoryPath,
      templateDirectoryPath,
      templateRenderer,
    } = args;

    const entries = await filesystem.listDirectory(templateDirectoryPath);
    const generatedFilePaths: string[] = [];

    for (const entry of entries) {
      const paths = this.resolveTemplatePaths({
        entryName: entry.name,
        substitutions,
        targetDirectoryPath,
        templateDirectoryPath,
      });

      if (entry.isDirectory) {
        await filesystem.makeDirectory(paths.nextTargetPath);
        const childPaths = await this.renderTemplateDirectory({
          filesystem,
          substitutions,
          targetDirectoryPath: paths.nextTargetPath,
          templateDirectoryPath: paths.nextTemplatePath,
          templateRenderer,
        });
        generatedFilePaths.push(...childPaths);
        continue;
      }

      generatedFilePaths.push(
        await this.renderTemplateFile({
          filesystem,
          nextTargetPath: paths.nextTargetPath,
          nextTemplatePath: paths.nextTemplatePath,
          substitutions,
          templateRenderer,
        }),
      );
    }

    return generatedFilePaths;
  }

  /**
   * Renders a single template file to disk.
   */
  private async renderTemplateFile(args: {
    filesystem: FileSystemAdapter;
    nextTargetPath: string;
    nextTemplatePath: string;
    substitutions: Record<string, string>;
    templateRenderer: TemplateRenderer;
  }): Promise<string> {
    const fileContent = await args.filesystem.readFile(args.nextTemplatePath);
    const renderedContent = args.templateRenderer.render(
      fileContent,
      args.substitutions,
    );
    await args.filesystem.writeFile(args.nextTargetPath, renderedContent);

    return args.nextTargetPath;
  }

  /**
   * Renders the full template tree and sorts the generated paths.
   */
  private async renderTemplateTree(args: {
    filesystem: FileSystemAdapter;
    substitutions: Record<string, string>;
    targetDirectoryPath: string;
    templateDirectoryPath: string;
    templateRenderer: TemplateRenderer;
  }): Promise<string[]> {
    const generatedFilePaths = await this.renderTemplateDirectory(args);
    return generatedFilePaths.toSorted();
  }

  /**
   * Replaces `__placeholder__` tokens in names and paths.
   */
  private renderTemplateValue(
    value: string,
    substitutions: Record<string, string>,
  ): string {
    return value.replaceAll(/__(\w+)__/g, (_token, field: string) => {
      return substitutions[field] ?? _token;
    });
  }

  /**
   * Resolves runtime arguments with the built-in default adapters.
   */
  private resolveRunGeneratorArguments(args: RunGeneratorArguments): {
    definition: RunGeneratorArguments["definition"];
    filesystem: FileSystemAdapter;
    formatter: FormatterAdapter;
    inputs: Record<string, string | undefined>;
    targetDirectoryPath: string;
    templateRenderer: TemplateRenderer;
  } {
    return {
      definition: args.definition,
      filesystem: args.filesystem ?? this.defaultFileSystem,
      formatter: args.formatter ?? this.defaultFormatter,
      inputs: args.inputs ?? {},
      targetDirectoryPath: args.targetDirectoryPath,
      templateRenderer: args.templateRenderer ?? this.defaultTemplateRenderer,
    };
  }

  /**
   * Resolves template entry and target paths for the current item.
   */
  private resolveTemplatePaths(args: {
    entryName: string;
    substitutions: Record<string, string>;
    targetDirectoryPath: string;
    templateDirectoryPath: string;
  }): {
    nextTargetPath: string;
    nextTemplatePath: string;
  } {
    const renderedName = this.renderTemplateValue(
      args.entryName,
      args.substitutions,
    );

    return {
      nextTargetPath: path.join(args.targetDirectoryPath, renderedName),
      nextTemplatePath: path.join(args.templateDirectoryPath, args.entryName),
    };
  }

  /**
   * Converts a generator name to camel case.
   */
  private toCamelCase(value: string): string {
    return value
      .split(/[-_\s]+/)
      .filter((segment): segment is string => segment.length > 0)
      .map((segment, index) => {
        if (index === 0) {
          return segment.toLowerCase();
        }

        return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
      })
      .join("");
  }

  /**
   * Converts a generator name to kebab case.
   */
  private toKebabCase(value: string): string {
    return value
      .trim()
      .split(/[_\s]+/)
      .flatMap((segment) => {
        return segment.split(/(?=[A-Z])/);
      })
      .filter((segment): segment is string => segment.length > 0)
      .map((segment) => {
        return segment.toLowerCase();
      })
      .join("-");
  }

  /**
   * Converts a generator name to Pascal case.
   */
  private toPascalCase(value: string): string {
    return this.toCamelCase(value).replace(/^./u, (character) => {
      return character.toUpperCase();
    });
  }

  /**
   * Converts a generator name to snake case.
   */
  private toSnakeCase(value: string): string {
    return value
      .trim()
      .split(/[-\s]+/)
      .flatMap((segment) => {
        return segment.split(/(?=[A-Z])/);
      })
      .filter((segment): segment is string => segment.length > 0)
      .map((segment) => {
        return segment.toLowerCase();
      })
      .join("_");
  }

  /**
   * Builds common name substitutions from the provided generator name.
   */
  public buildNameSubstitutions(name: string): Record<string, string> {
    return {
      nameCamelCase: this.toCamelCase(name),
      nameKebabCase: this.toKebabCase(name),
      namePascalCase: this.toPascalCase(name),
      nameSnakeCase: this.toSnakeCase(name),
    };
  }

  /**
   * Runs the generator lifecycle and returns generated file paths.
   */
  public async runGenerator(
    args: RunGeneratorArguments,
  ): Promise<RunGeneratorResult> {
    const {
      definition,
      filesystem,
      formatter,
      inputs,
      targetDirectoryPath,
      templateRenderer,
    } = this.resolveRunGeneratorArguments(args);

    const normalizedInputs = this.normalizeInputs(inputs);
    const name = normalizedInputs["name"] ?? definition.name;
    const substitutions = {
      ...this.buildNameSubstitutions(name),
      ...normalizedInputs,
    };
    const context = this.createHookContext({
      definition,
      generatedFilePaths: [],
      input: normalizedInputs,
      outputDirectoryPath: targetDirectoryPath,
      substitutions,
    });

    await definition.hooks?.preGenerate?.(context);

    context.generatedFilePaths = await this.renderTemplateTree({
      filesystem,
      substitutions,
      targetDirectoryPath,
      templateDirectoryPath: definition.templateDirectoryPath,
      templateRenderer,
    });

    await definition.hooks?.postGenerate?.(context);
    await formatter.formatFiles(context.generatedFilePaths);

    return {
      generatedFilePaths: context.generatedFilePaths,
      outputDirectoryPath: targetDirectoryPath,
    };
  }
}
