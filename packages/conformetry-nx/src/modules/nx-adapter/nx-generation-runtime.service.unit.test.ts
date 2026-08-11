import { describe, expect, it, vi } from "vitest";

import { GenerationRuntimeService } from "./nx-generation-runtime.service.js";

import type {
  DirectoryEntry,
  FileSystemAdapter,
  FormatterAdapter,
  GeneratorDefinition,
  GeneratorHookContext,
} from "./nx-adapter.types.js";

class MockFileSystemAdapter implements FileSystemAdapter {
  private readonly directoryEntries = new Map<string, DirectoryEntry[]>();
  private readonly files = new Map<string, string>();

  public async exists(pathName: string): Promise<boolean> {
    await Promise.resolve();
    return this.directoryEntries.has(pathName) || this.files.has(pathName);
  }

  public async listDirectory(directoryPath: string): Promise<DirectoryEntry[]> {
    await Promise.resolve();
    const entries = this.directoryEntries.get(directoryPath);
    if (entries === undefined) {
      throw new Error(`Directory ${directoryPath} does not exist`);
    }

    return entries;
  }

  public async makeDirectory(directoryPath: string): Promise<void> {
    await Promise.resolve();
    if (!this.directoryEntries.has(directoryPath)) {
      this.directoryEntries.set(directoryPath, []);
    }
  }

  public async readFile(filePath: string): Promise<string> {
    await Promise.resolve();
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`File ${filePath} does not exist`);
    }

    return content;
  }

  public seedDirectory(directoryPath: string, entries: DirectoryEntry[]): void {
    this.directoryEntries.set(directoryPath, entries);
  }

  public seedFile(filePath: string, content: string): void {
    this.files.set(filePath, content);
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    await Promise.resolve();
    this.files.set(filePath, content);
  }
}

class MockFormatterAdapter implements FormatterAdapter {
  public readonly formattedFiles: string[] = [];

  public async formatFile(filePath: string): Promise<void> {
    await Promise.resolve();
    this.formattedFiles.push(filePath);
  }

  public async formatFiles(filePaths: string[]): Promise<void> {
    await Promise.resolve();
    this.formattedFiles.push(...filePaths);
  }
}

describe(GenerationRuntimeService, () => {
  it("builds expected substitutions for a generator name", () => {
    const service = new GenerationRuntimeService();

    expect(service.buildNameSubstitutions("alpha-module")).toStrictEqual({
      nameCamelCase: "alphaModule",
      nameKebabCase: "alpha-module",
      namePascalCase: "AlphaModule",
      nameSnakeCase: "alpha_module",
    });
  });

  it("renders templates, runs hooks, and formats generated files", async () => {
    const service = new GenerationRuntimeService();
    const filesystem = new MockFileSystemAdapter();
    const formatter = new MockFormatterAdapter();
    let preGenerateContext: GeneratorHookContext | undefined;
    let postGenerateContext: GeneratorHookContext | undefined;
    const preGenerate = vi.fn<(context: GeneratorHookContext) => void>(
      (context) => {
        preGenerateContext = {
          ...context,
          generatedFilePaths: [...context.generatedFilePaths],
          input: { ...context.input },
          substitutions: { ...context.substitutions },
        };
      },
    );
    const postGenerate = vi.fn<(context: GeneratorHookContext) => void>(
      (context) => {
        postGenerateContext = {
          ...context,
          generatedFilePaths: [...context.generatedFilePaths],
          input: { ...context.input },
          substitutions: { ...context.substitutions },
        };
      },
    );

    filesystem.seedDirectory("/templates", [
      { isDirectory: true, name: "__nameKebabCase__" },
      { isDirectory: false, name: "README.md" },
    ]);
    filesystem.seedDirectory("/templates/__nameKebabCase__", [
      { isDirectory: false, name: "index.ts" },
    ]);
    filesystem.seedFile("/templates/README.md", "# {{namePascalCase}}\n");
    filesystem.seedFile(
      "/templates/__nameKebabCase__/index.ts",
      "export const name = '{{nameKebabCase}}';\n",
    );

    const definition: GeneratorDefinition = {
      hooks: {
        postGenerate,
        preGenerate,
      },
      name: "alpha-module",
      templateDirectoryPath: "/templates",
    };

    const result = await service.runGenerator({
      definition,
      filesystem,
      formatter,
      inputs: { name: "alpha-module" },
      targetDirectoryPath: "/output",
    });

    expect(preGenerate).toHaveBeenCalledTimes(1);
    expect(postGenerate).toHaveBeenCalledTimes(1);
    expect(preGenerateContext).toStrictEqual({
      definition,
      generatedFilePaths: [],
      input: { name: "alpha-module" },
      outputDirectoryPath: "/output",
      substitutions: {
        name: "alpha-module",
        nameCamelCase: "alphaModule",
        nameKebabCase: "alpha-module",
        namePascalCase: "AlphaModule",
        nameSnakeCase: "alpha_module",
      },
    });
    expect(postGenerateContext).toStrictEqual({
      definition,
      generatedFilePaths: [
        "/output/README.md",
        "/output/alpha-module/index.ts",
      ],
      input: { name: "alpha-module" },
      outputDirectoryPath: "/output",
      substitutions: {
        name: "alpha-module",
        nameCamelCase: "alphaModule",
        nameKebabCase: "alpha-module",
        namePascalCase: "AlphaModule",
        nameSnakeCase: "alpha_module",
      },
    });
    expect(result.generatedFilePaths).toStrictEqual([
      "/output/README.md",
      "/output/alpha-module/index.ts",
    ]);
    expect(formatter.formattedFiles).toStrictEqual([
      "/output/README.md",
      "/output/alpha-module/index.ts",
    ]);
  });

  it("falls back to default adapters when optional runtime dependencies are omitted", async () => {
    const service = new GenerationRuntimeService();

    const result = await service.runGenerator({
      definition: {
        name: "fallback-name",
        templateDirectoryPath: "templates",
      },
      targetDirectoryPath: "/output",
    });

    expect(result).toStrictEqual({
      generatedFilePaths: [],
      outputDirectoryPath: "/output",
    });
  });

  it("supports direct calls to default adapter methods", async () => {
    const service = new GenerationRuntimeService();

    const result = await service.runGenerator({
      definition: {
        name: "default-adapter-flow",
        templateDirectoryPath: "templates",
      },
      targetDirectoryPath: "/output",
    });

    expect(result).toStrictEqual({
      generatedFilePaths: [],
      outputDirectoryPath: "/output",
    });
  });
});
