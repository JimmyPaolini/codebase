import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { GenerationService } from "./generation.service";

import type {
  DirectoryEntry,
  FileSystemAdapter,
  FormatterAdapter,
  GeneratorDefinition,
  GeneratorHookContext,
  RunGeneratorArguments,
} from "./generation.types";

interface GenerationServiceWithPrivateMethods {
  fileSystemPathExists(pathName: string): Promise<boolean>;
  normalizeInputs(
    inputs: Record<string, string | undefined>,
  ): Record<string, string>;
  renderTemplateValue(
    value: string,
    substitutions: Record<string, string>,
  ): string;
  resolveRunGeneratorArguments(args: RunGeneratorArguments): {
    formatter: FormatterAdapter;
  };
}

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

describe(GenerationService, () => {
  it("builds expected substitutions for a generator name", () => {
    const service = new GenerationService();

    expect(service.buildNameSubstitutions("alpha-module")).toStrictEqual({
      nameCamelCase: "alphaModule",
      nameKebabCase: "alpha-module",
      namePascalCase: "AlphaModule",
      nameSnakeCase: "alpha_module",
    });
  });

  it("renders templates, runs hooks, and formats generated files", async () => {
    const service = new GenerationService();
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

  it("normalizes inputs by excluding undefined values", () => {
    const service =
      // type-coverage:ignore-next-line
      new GenerationService() as unknown as GenerationServiceWithPrivateMethods;

    const normalizedInputs = service.normalizeInputs({
      alpha: "one",
      beta: undefined,
      gamma: "three",
    });

    expect(normalizedInputs).toStrictEqual({
      alpha: "one",
      gamma: "three",
    });
  });

  it("replaces placeholders and keeps unresolved placeholders unchanged", () => {
    const service =
      // type-coverage:ignore-next-line
      new GenerationService() as unknown as GenerationServiceWithPrivateMethods;

    const renderedValue = service.renderTemplateValue(
      "__nameKebabCase__-__unknown__",
      { nameKebabCase: "demo-project" },
    );

    expect(renderedValue).toBe("demo-project-__unknown__");
  });

  it("falls back to default adapters and definition name when inputs are omitted", async () => {
    const service = new GenerationService();
    const templateDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-generation-default-runtime-"),
    );
    const definition: GeneratorDefinition = {
      name: "fallback-name",
      templateDirectoryPath,
    };

    const result = await service.runGenerator({
      definition,
      targetDirectoryPath: "/output",
    });

    expect(result).toStrictEqual({
      generatedFilePaths: [],
      outputDirectoryPath: "/output",
    });
    expect(service.buildNameSubstitutions(definition.name)).toStrictEqual({
      nameCamelCase: "fallbackName",
      nameKebabCase: "fallback-name",
      namePascalCase: "FallbackName",
      nameSnakeCase: "fallback_name",
    });
  });

  it("renders with default adapters against the real file system", async () => {
    const service = new GenerationService();
    const templateDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-generation-template-"),
    );
    const nestedTemplateDirectoryPath = path.join(
      templateDirectoryPath,
      "__nameKebabCase__",
    );
    await mkdir(nestedTemplateDirectoryPath, { recursive: true });
    await writeFile(
      path.join(templateDirectoryPath, "README.md"),
      "# {{ namePascalCase }}\n{{ unresolved }}\n",
      "utf8",
    );
    await writeFile(
      path.join(nestedTemplateDirectoryPath, "__nameCamelCase__.ts"),
      "export const generated = '{{nameKebabCase}}';\n",
      "utf8",
    );

    const outputDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-generation-output-"),
    );
    const definition: GeneratorDefinition = {
      name: "alpha-module",
      templateDirectoryPath,
    };

    const result = await service.runGenerator({
      definition,
      targetDirectoryPath: outputDirectoryPath,
    });

    const readmeOutputPath = path.join(outputDirectoryPath, "README.md");
    const sourceOutputPath = path.join(
      outputDirectoryPath,
      "alpha-module",
      "alphaModule.ts",
    );

    expect(result.generatedFilePaths).toStrictEqual([
      readmeOutputPath,
      sourceOutputPath,
    ]);
    await expect(readFile(readmeOutputPath, "utf8")).resolves.toBe(
      "# AlphaModule\n{{ unresolved }}\n",
    );
    await expect(readFile(sourceOutputPath, "utf8")).resolves.toBe(
      "export const generated = 'alpha-module';\n",
    );
  });

  it("checks filesystem path existence for existing and missing paths", async () => {
    const service =
      // type-coverage:ignore-next-line
      new GenerationService() as unknown as GenerationServiceWithPrivateMethods;
    const existingFilePath = path.join(
      await mkdtemp(path.join(tmpdir(), "conformetry-generation-exists-")),
      "existing.txt",
    );
    await writeFile(existingFilePath, "content", "utf8");

    await expect(service.fileSystemPathExists(existingFilePath)).resolves.toBe(
      true,
    );
    await expect(
      service.fileSystemPathExists(`${existingFilePath}.missing`),
    ).resolves.toBe(false);
  });

  it("resolves a default formatter that supports both format methods", async () => {
    const service =
      // type-coverage:ignore-next-line
      new GenerationService() as unknown as GenerationServiceWithPrivateMethods;
    const definition: GeneratorDefinition = {
      name: "formatter-test",
      templateDirectoryPath: "/unused",
    };
    const { formatter } = service.resolveRunGeneratorArguments({
      definition,
      targetDirectoryPath: "/output",
    });

    await expect(
      formatter.formatFile("/output/file.ts"),
    ).resolves.toBeUndefined();
    await expect(
      formatter.formatFiles(["/output/file-one.ts", "/output/file-two.ts"]),
    ).resolves.toBeUndefined();
  });
});
