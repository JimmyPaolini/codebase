import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createTemplateValidationOperations } from "./configuration-template-validation-operations.utilities.js";
import * as configurationUtilities from "./configuration.utilities.js";

import type {
  ConformetryConfiguration,
  MatchedGeneratorCandidate,
} from "./configuration.types.js";

const createdDirectoryPaths: string[] = [];

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directoryPath = await mkdtemp(path.join(tmpdir(), prefix));
  createdDirectoryPaths.push(directoryPath);

  return directoryPath;
}

describe("template validation operations utilities", () => {
  afterEach(async () => {
    await Promise.all(
      createdDirectoryPaths.splice(0).map(async (directoryPath) => {
        await rm(directoryPath, { force: true, recursive: true });
      }),
    );
  });

  it("applies substitutions while preserving unmatched placeholders", () => {
    const operations = createTemplateValidationOperations();

    const substitutedValue = operations.applySubstitutions(
      "hello __name__, __unknown__",
      { name: "world" },
    );

    expect(substitutedValue).toBe("hello world, __unknown__");
  });

  it("collects template file paths from nested directories and excludes ignored scaffold files", async () => {
    const operations = createTemplateValidationOperations();
    const templateDirectoryPath = await createTemporaryDirectory(
      "conformetry-operations-collect-",
    );
    await mkdir(path.join(templateDirectoryPath, "nested"), {
      recursive: true,
    });
    await mkdir(path.join(templateDirectoryPath, "src", "modules", "logger"), {
      recursive: true,
    });
    await writeFile(
      path.join(templateDirectoryPath, "schema.json"),
      "{}",
      "utf8",
    );
    await writeFile(
      path.join(templateDirectoryPath, "README.md"),
      "# demo",
      "utf8",
    );
    await writeFile(
      path.join(templateDirectoryPath, "nested", "index.ts"),
      "export const value = 1;\n",
      "utf8",
    );
    await writeFile(
      path.join(templateDirectoryPath, "src", "index.ts"),
      "export {};\n",
      "utf8",
    );
    await writeFile(
      path.join(
        templateDirectoryPath,
        "src",
        "modules",
        "logger",
        "logger.service.ts",
      ),
      "export class LoggerService {}\n",
      "utf8",
    );

    const templateFilePaths = operations.collectTemplateFilePaths(
      templateDirectoryPath,
    );

    expect(templateFilePaths).toStrictEqual([
      path.join(templateDirectoryPath, "README.md"),
      path.join(templateDirectoryPath, "nested", "index.ts"),
    ]);
  });

  it("ranks matched candidates by generator tag, inferred names, file count, and lexical fallback", () => {
    const operations = createTemplateValidationOperations();
    const projectTemplateMetadata = {
      generatorName: "preferred-generator",
    };
    const baseCandidate = {
      absoluteTemplateDirectoryPath: "/tmp/template",
      substitutions: {},
      templateFilePaths: [],
    };

    const tagPrioritizedResult = operations.compareMatchedCandidates({
      inferredGeneratorNames: new Set<string>(),
      leftCandidate: {
        ...baseCandidate,
        existingFileCount: 4,
        generatorName: "other-generator",
      },
      projectTemplateMetadata,
      rightCandidate: {
        ...baseCandidate,
        existingFileCount: 1,
        generatorName: "preferred-generator",
      },
    });

    expect(tagPrioritizedResult).toBeGreaterThan(0);

    const inferredPrioritizedResult = operations.compareMatchedCandidates({
      inferredGeneratorNames: new Set(["inferred-generator"]),
      leftCandidate: {
        ...baseCandidate,
        existingFileCount: 2,
        generatorName: "inferred-generator",
      },
      projectTemplateMetadata: {},
      rightCandidate: {
        ...baseCandidate,
        existingFileCount: 3,
        generatorName: "other-generator",
      },
    });

    expect(inferredPrioritizedResult).toBeLessThan(0);

    const fileCountPrioritizedResult = operations.compareMatchedCandidates({
      inferredGeneratorNames: new Set<string>(),
      leftCandidate: {
        ...baseCandidate,
        existingFileCount: 1,
        generatorName: "alpha",
      },
      projectTemplateMetadata: {},
      rightCandidate: {
        ...baseCandidate,
        existingFileCount: 4,
        generatorName: "beta",
      },
    });

    expect(fileCountPrioritizedResult).toBeGreaterThan(0);

    const lexicalFallbackResult = operations.compareMatchedCandidates({
      inferredGeneratorNames: new Set<string>(),
      leftCandidate: {
        ...baseCandidate,
        existingFileCount: 2,
        generatorName: "alpha",
      },
      projectTemplateMetadata: {},
      rightCandidate: {
        ...baseCandidate,
        existingFileCount: 2,
        generatorName: "beta",
      },
    });

    expect(lexicalFallbackResult).toBeLessThan(0);
  });

  it("creates matched candidates only when generator definitions and template files exist", async () => {
    const operations = createTemplateValidationOperations();
    const workingDirectory = await createTemporaryDirectory(
      "conformetry-operations-candidate-",
    );
    const projectPath = path.join(workingDirectory, "apps", "demo");
    const templateDirectoryPath = path.join(
      workingDirectory,
      "templates",
      "demo-generator",
    );
    await mkdir(path.join(projectPath, "src"), { recursive: true });
    await mkdir(path.join(templateDirectoryPath, "src"), { recursive: true });
    await writeFile(
      path.join(templateDirectoryPath, "src", "__nameKebabCase__.ts"),
      "export const value = '{{name}}';\n",
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "src", "demo.ts"),
      "export {};\n",
      "utf8",
    );

    const configuration: ConformetryConfiguration = {
      generators: {
        "demo-generator": {
          name: "demo-generator",
          parameters: {},
          templateDirectoryPath: "templates/demo-generator",
        },
      },
    };

    const matchedCandidate = operations.createMatchedGeneratorCandidate({
      configuration,
      generatorName: "demo-generator",
      projectPath,
      substitutions: {
        name: "demo",
        nameKebabCase: "demo",
      },
      workingDirectory,
    });

    expect(matchedCandidate).toMatchObject({
      existingFileCount: 1,
      generatorName: "demo-generator",
    });
    expect(matchedCandidate?.templateFilePaths).toStrictEqual([
      path.join(templateDirectoryPath, "src", "__nameKebabCase__.ts"),
    ]);
    expect(
      operations.countExistingTemplateMappedFiles({
        absoluteTemplateDirectoryPath: templateDirectoryPath,
        projectPath,
        substitutions: {
          name: "demo",
          nameKebabCase: "demo",
        },
        templateFilePaths: [
          path.join(templateDirectoryPath, "src", "__nameKebabCase__.ts"),
          path.join(templateDirectoryPath, "src", "missing.ts"),
        ],
      }),
    ).toBe(1);

    const missingGeneratorCandidate =
      operations.createMatchedGeneratorCandidate({
        configuration,
        generatorName: "missing-generator",
        projectPath,
        substitutions: {},
        workingDirectory,
      });

    expect(missingGeneratorCandidate).toBeUndefined();

    const emptyTemplateDirectoryPath = path.join(
      workingDirectory,
      "templates",
      "empty-generator",
    );
    await mkdir(emptyTemplateDirectoryPath, { recursive: true });
    const configurationWithEmptyTemplateDirectory: ConformetryConfiguration = {
      generators: {
        "empty-generator": {
          name: "empty-generator",
          parameters: {},
          templateDirectoryPath: "templates/empty-generator",
        },
      },
    };
    const emptyTemplateCandidate = operations.createMatchedGeneratorCandidate({
      configuration: configurationWithEmptyTemplateDirectory,
      generatorName: "empty-generator",
      projectPath,
      substitutions: {},
      workingDirectory,
    });

    expect(emptyTemplateCandidate).toBeUndefined();
  });

  it("creates substitutions using explicit metadata and fallback filesystem metadata", async () => {
    const operations = createTemplateValidationOperations();
    const workingDirectory = await createTemporaryDirectory(
      "conformetry-operations-substitutions-",
    );
    const projectPath = path.join(workingDirectory, "applications", "demo-app");
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      path.join(projectPath, "pyproject.toml"),
      'description = "fallback description"\n',
      "utf8",
    );

    const explicitMetadataSubstitutions =
      operations.createTemplateSubstitutions({
        projectPath,
        projectTemplateMetadata: {
          description: "explicit description",
          type: "packages",
        },
        workingDirectory,
      });

    expect(explicitMetadataSubstitutions["description"]).toBe(
      "explicit description",
    );
    expect(explicitMetadataSubstitutions["type"]).toBe("packages");

    const fallbackMetadataSubstitutions =
      operations.createTemplateSubstitutions({
        projectPath,
        projectTemplateMetadata: {},
        workingDirectory,
      });

    expect(fallbackMetadataSubstitutions["description"]).toBe(
      "fallback description",
    );
    expect(fallbackMetadataSubstitutions["type"]).toBe("applications");
  });

  it("falls back to raw project name substitutions when name conversion returns undefined fields", async () => {
    const operations = createTemplateValidationOperations();
    const buildNameSubstitutionsSpy = vi
      .spyOn(configurationUtilities, "buildNameSubstitutions")
      .mockReturnValue({});
    const workingDirectory = await createTemporaryDirectory(
      "conformetry-operations-name-fallback-",
    );
    const projectPath = path.join(workingDirectory, "applications", "demo-app");
    await mkdir(projectPath, { recursive: true });

    try {
      const substitutions = operations.createTemplateSubstitutions({
        projectPath,
        projectTemplateMetadata: {
          description: "description",
          type: "applications",
        },
        workingDirectory,
      });

      expect(substitutions["nameCamelCase"]).toBe("demo-app");
      expect(substitutions["nameKebabCase"]).toBe("demo-app");
      expect(substitutions["namePascalCase"]).toBe("demo-app");
      expect(substitutions["nameSnakeCase"]).toBe("demo-app");
    } finally {
      buildNameSubstitutionsSpy.mockRestore();
    }
  });

  it("infers generator names from project path and detects template files correctly", () => {
    const operations = createTemplateValidationOperations();

    expect(
      operations.inferGeneratorNamesFromProjectPath({
        configuredGeneratorNames: ["nestjs-service-module", "react-component"],
        projectPath: "/repo/packages/Nestjs-Service-Module",
      }),
    ).toStrictEqual(new Set(["nestjs-service-module"]));

    expect(operations.isTemplateFile("schema.json", true)).toBe(false);
    expect(operations.isTemplateFile("component.ts", false)).toBe(false);
    expect(operations.isTemplateFile("component.ts", true)).toBe(true);
  });

  it("prepares documents for template files and reports violations for missing instances", async () => {
    const operations = createTemplateValidationOperations();
    const workingDirectory = await createTemporaryDirectory(
      "conformetry-operations-documents-",
    );
    const projectPath = path.join(workingDirectory, "apps", "demo");
    const templateDirectoryPath = path.join(
      workingDirectory,
      "templates",
      "demo",
    );
    await mkdir(path.join(projectPath, "src"), { recursive: true });
    await mkdir(path.join(templateDirectoryPath, "src"), { recursive: true });
    await writeFile(
      path.join(templateDirectoryPath, "src", "existing.ts"),
      'export const value = "{{name}}";\n',
      "utf8",
    );
    await writeFile(
      path.join(templateDirectoryPath, "src", "missing.ts"),
      "export const missing = true;\n",
      "utf8",
    );
    await writeFile(
      path.join(templateDirectoryPath, "src", "notes.md"),
      "# notes\n",
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "src", "existing.ts"),
      'export const value = "demo";\n',
      "utf8",
    );

    const generatorCandidate: MatchedGeneratorCandidate = {
      absoluteTemplateDirectoryPath: templateDirectoryPath,
      existingFileCount: 1,
      generatorName: "demo",
      substitutions: { name: "demo" },
      templateFilePaths: [
        path.join(templateDirectoryPath, "src", "existing.ts"),
        path.join(templateDirectoryPath, "src", "missing.ts"),
        path.join(templateDirectoryPath, "src", "notes.md"),
      ],
    };

    const preparedDocumentForUnsupportedExtension =
      operations.prepareDocumentForTemplateFile({
        extensionSet: new Set([".ts"]),
        generatorCandidate,
        projectPath,
        templateFilePath: path.join(templateDirectoryPath, "src", "notes.md"),
        templateRootPath: templateDirectoryPath,
      });

    expect(preparedDocumentForUnsupportedExtension).toBeUndefined();

    const preparedDocumentForMissingFile =
      operations.prepareDocumentForTemplateFile({
        extensionSet: new Set([".ts"]),
        generatorCandidate,
        projectPath,
        templateFilePath: path.join(templateDirectoryPath, "src", "missing.ts"),
        templateRootPath: templateDirectoryPath,
      });

    expect(preparedDocumentForMissingFile).toBeDefined();
    expect(preparedDocumentForMissingFile).not.toHaveProperty("document");

    if (
      preparedDocumentForMissingFile === undefined ||
      !("violation" in preparedDocumentForMissingFile)
    ) {
      throw new TypeError("Expected a violation response");
    }

    expect(preparedDocumentForMissingFile.violation).toContain("Missing file");

    const preparedDocumentForExistingFile =
      operations.prepareDocumentForTemplateFile({
        extensionSet: new Set([".ts"]),
        generatorCandidate,
        projectPath,
        templateFilePath: path.join(
          templateDirectoryPath,
          "src",
          "existing.ts",
        ),
        templateRootPath: templateDirectoryPath,
      });

    expect(preparedDocumentForExistingFile).toBeDefined();
    expect(preparedDocumentForExistingFile).not.toHaveProperty("violation");

    if (
      preparedDocumentForExistingFile === undefined ||
      !("document" in preparedDocumentForExistingFile)
    ) {
      throw new TypeError("Expected a document response");
    }

    expect(preparedDocumentForExistingFile.document).toMatchObject({
      filename: "existing.ts",
      instance: 'export const value = "demo";\n',
      renderedTemplate: 'export const value = "demo";\n',
    });

    const preparedDocuments = operations.prepareDocumentsForGenerator({
      fileExtensions: [".ts"],
      generatorCandidate,
      projectPath,
    });

    expect(preparedDocuments.documents).toHaveLength(1);
    expect(preparedDocuments.violations).toHaveLength(1);
  });

  it("resolves project descriptions and project types from metadata or path fallbacks", async () => {
    const operations = createTemplateValidationOperations();
    const workingDirectory = await createTemporaryDirectory(
      "conformetry-operations-project-metadata-",
    );
    const projectPath = path.join(workingDirectory, "packages", "demo");
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      path.join(projectPath, "pyproject.toml"),
      'description = "operations description"\n',
      "utf8",
    );

    expect(operations.resolveProjectDescription(projectPath)).toBe(
      "operations description",
    );
    expect(
      operations.resolveProjectDescription(
        path.join(workingDirectory, "missing"),
      ),
    ).toBe("");

    expect(
      operations.resolveProjectType({
        projectPath,
        projectTemplateMetadata: { type: "applications" },
        workingDirectory,
      }),
    ).toBe("applications");
    expect(
      operations.resolveProjectType({
        projectPath,
        projectTemplateMetadata: {},
        workingDirectory,
      }),
    ).toBe("packages");
    expect(
      operations.resolveProjectType({
        projectPath: workingDirectory,
        projectTemplateMetadata: {},
        workingDirectory,
      }),
    ).toBe("applications");
  });
});
