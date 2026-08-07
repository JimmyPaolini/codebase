import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildNameSubstitutions } from "@jimmypaolini/conformetry-configuration";
import { Injectable } from "@nestjs/common";

import type {
  DirectoryEntry,
  FileSystemAdapter,
  FormatterAdapter,
  GeneratorHookContext,
  RunGeneratorArguments,
  RunGeneratorResult,
  TemplateRenderer,
} from "./generation.types.js";

/**
 * Runs conformetry generators without depending on Nx devkit.
 */
@Injectable()
export class GenerationService {
  private readonly defaultFileSystem: FileSystemAdapter = {
    exists: async (pathName: string): Promise<boolean> => {
      return this.fileSystemPathExists(pathName);
    },
    listDirectory: async (directoryPath: string) => {
      return this.fileSystemListDirectory(directoryPath);
    },
    makeDirectory: async (directoryPath: string): Promise<void> => {
      await this.fileSystemMakeDirectory(directoryPath);
    },
    readFile: async (filePath: string): Promise<string> => {
      return this.fileSystemReadFile(filePath);
    },
    writeFile: async (filePath: string, content: string): Promise<void> => {
      await this.fileSystemWriteFile(filePath, content);
    },
  };

  private readonly defaultFormatter: FormatterAdapter = {
    formatFile: async (_filePath: string): Promise<void> => {
      await Promise.resolve();
    },
    formatFiles: async (_filePaths: string[]): Promise<void> => {
      await Promise.resolve();
    },
  };

  private readonly defaultTemplateRenderer: TemplateRenderer = {
    render: (
      templateContent: string,
      substitutions: Record<string, string>,
    ): string => {
      return templateContent.replaceAll(
        /\{\{([^{}]+)\}\}/gu,
        (_token, field: string) => {
          return substitutions[field.trim()] ?? _token;
        },
      );
    },
  };

  /**
   * Creates the hook context passed to generator hooks.
   */
  private createHookContext(args: {
    definition: RunGeneratorArguments["definition"];
    generatedInstanceFilePaths: string[];
    input: Record<string, string>;
    outputDirectoryPath: string;
    substitutions: Record<string, string>;
  }): GeneratorHookContext {
    return {
      definition: args.definition,
      generatedFilePaths: args.generatedInstanceFilePaths,
      input: args.input,
      outputDirectoryPath: args.outputDirectoryPath,
      substitutions: args.substitutions,
    };
  }

  /**
   * Lists entries in a filesystem directory.
   */
  private async fileSystemListDirectory(
    directoryPath: string,
  ): Promise<DirectoryEntry[]> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    return entries.map((entry) => {
      return {
        isDirectory: entry.isDirectory(),
        name: entry.name,
      };
    });
  }

  /**
   * Creates a directory recursively.
   */
  private async fileSystemMakeDirectory(directoryPath: string): Promise<void> {
    await mkdir(directoryPath, { recursive: true });
  }

  /**
   * Returns whether a filesystem path exists.
   */
  private async fileSystemPathExists(pathName: string): Promise<boolean> {
    try {
      await access(pathName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads a UTF-8 file from disk.
   */
  private async fileSystemReadFile(filePath: string): Promise<string> {
    return readFile(filePath, "utf8");
  }

  /**
   * Writes a UTF-8 file and ensures parent directories exist.
   */
  private async fileSystemWriteFile(
    filePath: string,
    content: string,
  ): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
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
   * Recursively renders a template tree and returns all generated instance paths.
   */
  private async renderDirectory(args: {
    filesystem: FileSystemAdapter;
    instanceDirectoryPath: string;
    substitutions: Record<string, string>;
    templateDirectoryPath: string;
    templateRenderer: TemplateRenderer;
  }): Promise<string[]> {
    const {
      filesystem,
      instanceDirectoryPath,
      substitutions,
      templateDirectoryPath,
      templateRenderer,
    } = args;

    const entries = await filesystem.listDirectory(templateDirectoryPath);
    const generatedInstanceFilePaths: string[] = [];

    for (const entry of entries) {
      const paths = this.resolveTemplatePaths({
        entryName: entry.name,
        instanceDirectoryPath,
        substitutions,
        templateDirectoryPath,
      });

      if (entry.isDirectory) {
        await filesystem.makeDirectory(paths.nextTargetPath);
        const childPaths = await this.renderDirectory({
          filesystem,
          instanceDirectoryPath: paths.nextInstancePath,
          substitutions,
          templateDirectoryPath: paths.nextTemplatePath,
          templateRenderer,
        });
        generatedInstanceFilePaths.push(...childPaths);
        continue;
      }

      generatedInstanceFilePaths.push(
        await this.renderFile({
          filesystem,
          nextInstancePath: paths.nextInstancePath,
          nextTemplatePath: paths.nextTemplatePath,
          substitutions,
          templateRenderer,
        }),
      );
    }

    return generatedInstanceFilePaths;
  }

  /**
   * Renders a single template file into the generated instance tree.
   */
  private async renderFile(args: {
    filesystem: FileSystemAdapter;
    nextInstancePath: string;
    nextTemplatePath: string;
    substitutions: Record<string, string>;
    templateRenderer: TemplateRenderer;
  }): Promise<string> {
    const fileContent = await args.filesystem.readFile(args.nextTemplatePath);
    const renderedContent = args.templateRenderer.render(
      fileContent,
      args.substitutions,
    );
    await args.filesystem.writeFile(args.nextInstancePath, renderedContent);

    return args.nextInstancePath;
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
   * Resolves template entry and instance paths for the current item.
   */
  private resolveTemplatePaths(args: {
    entryName: string;
    instanceDirectoryPath: string;
    substitutions: Record<string, string>;
    templateDirectoryPath: string;
  }): {
    nextInstancePath: string;
    nextTemplatePath: string;
  } {
    const renderedName = this.renderTemplateValue(
      args.entryName,
      args.substitutions,
    );

    return {
      nextInstancePath: path.join(args.instanceDirectoryPath, renderedName),
      nextTemplatePath: path.join(args.templateDirectoryPath, args.entryName),
    };
  }

  /**
   * Builds common name substitutions from the provided generator name.
   */
  public buildNameSubstitutions(name: string): Record<string, string> {
    return buildNameSubstitutions(name);
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
      generatedInstanceFilePaths: [],
      input: normalizedInputs,
      outputDirectoryPath: targetDirectoryPath,
      substitutions,
    });

    await definition.hooks?.preGenerate?.(context);

    context.generatedFilePaths = (
      await this.renderDirectory({
        filesystem,
        instanceDirectoryPath: targetDirectoryPath,
        substitutions,
        templateDirectoryPath: definition.templateDirectoryPath,
        templateRenderer,
      })
    ).toSorted();

    await definition.hooks?.postGenerate?.(context);
    await formatter.formatFiles(context.generatedFilePaths);

    return {
      generatedFilePaths: context.generatedFilePaths,
      outputDirectoryPath: targetDirectoryPath,
    };
  }
}
