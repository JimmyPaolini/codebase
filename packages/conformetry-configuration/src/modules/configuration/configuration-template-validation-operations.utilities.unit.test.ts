import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createTemplateValidationOperations } from "./configuration-template-validation-operations.utilities";
import * as configurationUtilities from "./configuration.utilities";

const createdDirectories: string[] = [];

describe("template validation operations", () => {
  afterEach(async () => {
    await Promise.all(
      createdDirectories.splice(0).map(async (directoryPath) => {
        await rm(directoryPath, { force: true, recursive: true });
      }),
    );
  });

  it("applies substitutions, preserves unknown tokens, and infers generator names", () => {
    const operations = createTemplateValidationOperations();

    expect(
      operations.applySubstitutions("__name__-__missing__", {
        name: "demo",
      }),
    ).toBe("demo-__missing__");
    expect(
      operations.inferGeneratorNamesFromProjectPath({
        configuredGeneratorNames: ["react-component", "nestjs-service-module"],
        projectPath: "applications/react-component-demo",
      }),
    ).toStrictEqual(new Set(["react-component"]));
  });

  it("collects template files recursively, sorted, and excludes schema files", async () => {
    const operations = createTemplateValidationOperations();
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-operations-collect-"),
    );
    createdDirectories.push(temporaryDirectoryPath);

    await mkdir(path.join(temporaryDirectoryPath, "nested"), {
      recursive: true,
    });
    await writeFile(path.join(temporaryDirectoryPath, "b.ts"), "", "utf8");
    await writeFile(
      path.join(temporaryDirectoryPath, "nested", "a.ts"),
      "",
      "utf8",
    );
    await writeFile(
      path.join(temporaryDirectoryPath, "schema.json"),
      "",
      "utf8",
    );

    const templateFilePaths = operations.collectTemplateFilePaths(
      temporaryDirectoryPath,
    );

    expect(templateFilePaths).toStrictEqual([
      path.join(temporaryDirectoryPath, "b.ts"),
      path.join(temporaryDirectoryPath, "nested", "a.ts"),
    ]);
    expect(operations.isTemplateFile("schema.json", true)).toBe(false);
    expect(operations.isTemplateFile("index.ts", false)).toBe(false);
    expect(operations.isTemplateFile("index.ts", true)).toBe(true);
  });

  it("creates and ranks generator candidates by metadata, inference, and existing files", async () => {
    const operations = createTemplateValidationOperations();
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-operations-candidates-"),
    );
    createdDirectories.push(temporaryDirectoryPath);
    const projectPath = path.join(temporaryDirectoryPath, "apps", "demo");

    await mkdir(path.join(projectPath, "src"), { recursive: true });
    await mkdir(
      path.join(
        temporaryDirectoryPath,
        "configuration",
        "conformetry-templates",
        "demo",
        "src",
      ),
      { recursive: true },
    );
    await mkdir(
      path.join(
        temporaryDirectoryPath,
        "configuration",
        "conformetry-templates",
        "other",
        "src",
      ),
      { recursive: true },
    );
    await writeFile(path.join(projectPath, "src", "index.ts"), "", "utf8");
    await writeFile(
      path.join(
        temporaryDirectoryPath,
        "configuration",
        "conformetry-templates",
        "demo",
        "src",
        "index.ts",
      ),
      "",
      "utf8",
    );
    await writeFile(
      path.join(
        temporaryDirectoryPath,
        "configuration",
        "conformetry-templates",
        "other",
        "src",
        "index.ts",
      ),
      "",
      "utf8",
    );

    const configuration = {
      generators: {
        demo: {
          name: "demo",
          parameters: {},
          templateDirectoryPath: "configuration/conformetry-templates/demo",
        },
        other: {
          name: "other",
          parameters: {},
          templateDirectoryPath: "configuration/conformetry-templates/other",
        },
      },
    };

    const substitutions = operations.createTemplateSubstitutions({
      projectPath,
      projectTemplateMetadata: {
        generatorName: "demo",
      },
      workingDirectory: temporaryDirectoryPath,
    });

    const demoCandidate = operations.createMatchedGeneratorCandidate({
      configuration,
      generatorName: "demo",
      projectPath,
      substitutions,
      workingDirectory: temporaryDirectoryPath,
    });
    const otherCandidate = operations.createMatchedGeneratorCandidate({
      configuration,
      generatorName: "other",
      projectPath,
      substitutions,
      workingDirectory: temporaryDirectoryPath,
    });

    expect(demoCandidate).toBeDefined();
    expect(otherCandidate).toBeDefined();

    if (demoCandidate === undefined || otherCandidate === undefined) {
      throw new Error("Expected both candidates to exist");
    }

    expect(
      operations.compareMatchedCandidates({
        inferredGeneratorNames: new Set<string>(),
        leftCandidate: otherCandidate,
        projectTemplateMetadata: { generatorName: "demo" },
        rightCandidate: demoCandidate,
      }),
    ).toBeGreaterThan(0);

    expect(
      operations.compareMatchedCandidates({
        inferredGeneratorNames: new Set(["other"]),
        leftCandidate: otherCandidate,
        projectTemplateMetadata: {},
        rightCandidate: demoCandidate,
      }),
    ).toBeLessThan(0);
    expect(
      operations.compareMatchedCandidates({
        inferredGeneratorNames: new Set(["demo"]),
        leftCandidate: otherCandidate,
        projectTemplateMetadata: {},
        rightCandidate: demoCandidate,
      }),
    ).toBeGreaterThan(0);

    expect(
      operations.compareMatchedCandidates({
        inferredGeneratorNames: new Set<string>(),
        leftCandidate: {
          ...otherCandidate,
          existingFileCount: 1,
        },
        projectTemplateMetadata: {},
        rightCandidate: {
          ...demoCandidate,
          existingFileCount: 2,
        },
      }),
    ).toBeGreaterThan(0);

    expect(
      operations.compareMatchedCandidates({
        inferredGeneratorNames: new Set<string>(),
        leftCandidate: {
          ...otherCandidate,
          existingFileCount: 1,
          generatorName: "aaa",
        },
        projectTemplateMetadata: {},
        rightCandidate: {
          ...demoCandidate,
          existingFileCount: 1,
          generatorName: "zzz",
        },
      }),
    ).toBeLessThan(0);
  });

  it("returns undefined for missing or empty generator candidates", async () => {
    const operations = createTemplateValidationOperations();
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-operations-missing-"),
    );
    createdDirectories.push(temporaryDirectoryPath);

    const configuration = {
      generators: {
        demo: {
          name: "demo",
          parameters: {},
          templateDirectoryPath: "configuration/conformetry-templates/demo",
        },
      },
    };

    await mkdir(
      path.join(
        temporaryDirectoryPath,
        "configuration",
        "conformetry-templates",
        "demo",
      ),
      { recursive: true },
    );

    expect(
      operations.createMatchedGeneratorCandidate({
        configuration,
        generatorName: "missing",
        projectPath: temporaryDirectoryPath,
        substitutions: {},
        workingDirectory: temporaryDirectoryPath,
      }),
    ).toBeUndefined();

    expect(
      operations.createMatchedGeneratorCandidate({
        configuration,
        generatorName: "demo",
        projectPath: temporaryDirectoryPath,
        substitutions: {},
        workingDirectory: temporaryDirectoryPath,
      }),
    ).toBeUndefined();
  });

  it("creates substitutions, resolves description and type, and prepares documents", async () => {
    const operations = createTemplateValidationOperations();
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-operations-documents-"),
    );
    createdDirectories.push(temporaryDirectoryPath);
    const projectPath = path.join(
      temporaryDirectoryPath,
      "applications",
      "demo",
    );
    const templateRootPath = path.join(
      temporaryDirectoryPath,
      "configuration",
      "conformetry-templates",
      "demo",
    );

    await mkdir(path.join(templateRootPath, "src"), { recursive: true });
    await mkdir(path.join(projectPath, "src"), { recursive: true });
    await writeFile(
      path.join(projectPath, "pyproject.toml"),
      'description = "demo description"\n',
      "utf8",
    );
    await writeFile(
      path.join(templateRootPath, "src", "__nameKebabCase__.ts"),
      'export const name = "{{ nameKebabCase }}";\n',
      "utf8",
    );
    await writeFile(
      path.join(templateRootPath, "src", "missing.ts"),
      'export const fallback = "{{unknown}}";\n',
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "src", "demo.ts"),
      'export const name = "demo";\n',
      "utf8",
    );

    const substitutions = operations.createTemplateSubstitutions({
      projectPath,
      projectTemplateMetadata: {},
      workingDirectory: temporaryDirectoryPath,
    });

    expect(substitutions["description"]).toBe("demo description");
    expect(substitutions["type"]).toBe("applications");
    expect(
      operations.createTemplateSubstitutions({
        projectPath,
        projectTemplateMetadata: {
          description: "provided",
          type: "packages",
        },
        workingDirectory: temporaryDirectoryPath,
      }),
    ).toMatchObject({
      description: "provided",
      type: "packages",
    });
    expect(
      operations.createTemplateSubstitutions({
        projectPath: temporaryDirectoryPath,
        projectTemplateMetadata: {},
        workingDirectory: temporaryDirectoryPath,
      }),
    ).toMatchObject({
      type: "applications",
    });

    const generatorCandidate = {
      absoluteTemplateDirectoryPath: templateRootPath,
      existingFileCount: 1,
      generatorName: "demo",
      substitutions,
      templateFilePaths: [
        path.join(templateRootPath, "src", "__nameKebabCase__.ts"),
        path.join(templateRootPath, "src", "missing.ts"),
        path.join(templateRootPath, "src", "fallback.ts"),
      ],
    };
    await writeFile(
      path.join(templateRootPath, "src", "fallback.ts"),
      'export const fallback = "{{unknown}}";\n',
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "src", "fallback.ts"),
      'export const fallback = "{{unknown}}";\n',
      "utf8",
    );

    const preparedDocuments = operations.prepareDocumentsForGenerator({
      fileExtensions: [".json"],
      generatorCandidate,
      projectPath,
    });

    expect(preparedDocuments.documents).toStrictEqual([]);
    expect(preparedDocuments.violations).toStrictEqual([]);

    const preparedTemplateValidation = operations.prepareDocumentsForGenerator({
      fileExtensions: [".ts"],
      generatorCandidate,
      projectPath,
    });

    expect(preparedTemplateValidation.documents).toHaveLength(2);
    expect(preparedTemplateValidation.documents[0]?.renderedTemplate).toBe(
      'export const name = "demo";\n',
    );
    expect(preparedTemplateValidation.documents[1]?.renderedTemplate).toBe(
      'export const fallback = "{{unknown}}";\n',
    );
    expect(preparedTemplateValidation.violations).toStrictEqual([
      `Missing file ${path.join(projectPath, "src", "missing.ts")} required by template ${path.join(templateRootPath, "src", "missing.ts")}`,
    ]);
  });

  it("uses fallback substitutions and handles pyproject files without descriptions", async () => {
    const buildNameSubstitutionsSpy = vi
      .spyOn(configurationUtilities, "buildNameSubstitutions")
      .mockReturnValueOnce({});
    const operations = createTemplateValidationOperations();
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-operations-fallback-substitutions-"),
    );
    createdDirectories.push(temporaryDirectoryPath);
    const projectPath = path.join(temporaryDirectoryPath, "packages", "demo");

    await mkdir(projectPath, { recursive: true });
    await writeFile(
      path.join(projectPath, "pyproject.toml"),
      'name = "demo"\n',
    );

    try {
      expect(
        operations.createTemplateSubstitutions({
          projectPath,
          projectTemplateMetadata: {},
          workingDirectory: temporaryDirectoryPath,
        }),
      ).toMatchObject({
        description: "",
        nameCamelCase: "demo",
        nameKebabCase: "demo",
        namePascalCase: "demo",
        nameSnakeCase: "demo",
      });
    } finally {
      buildNameSubstitutionsSpy.mockRestore();
    }
  });
});
