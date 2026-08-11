import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplateValidationService } from "./configuration-template-validation.service";
import { ConfigurationService } from "./configuration.service";

const createdDirectories: string[] = [];

describe("template validation service", () => {
  afterEach(async () => {
    await Promise.all(
      createdDirectories.splice(0).map(async (directoryPath) => {
        await rm(directoryPath, { force: true, recursive: true });
      }),
    );
  });

  it("prepares validation payloads from template files", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-template-validation-"),
    );
    createdDirectories.push(workingDirectory);

    await writeFile(
      path.join(workingDirectory, "pnpm-workspace.yaml"),
      "{}\n",
      "utf8",
    );
    await mkdir(
      path.join(
        workingDirectory,
        "configuration",
        "conformetry-templates",
        "demo",
        "src",
      ),
      { recursive: true },
    );
    await mkdir(path.join(workingDirectory, "apps", "demo", "src"), {
      recursive: true,
    });
    await writeFile(
      path.join(workingDirectory, "configuration", "conformetry.config.json"),
      JSON.stringify({
        generators: {
          demo: {
            name: "demo",
            parameters: {
              project: {
                type: "string",
              },
            },
          },
        },
      }),
      "utf8",
    );
    await writeFile(
      path.join(
        workingDirectory,
        "configuration",
        "conformetry-templates",
        "demo",
        "src",
        "index.ts",
      ),
      'export const projectName = "{{name}}";\n',
      "utf8",
    );
    await writeFile(
      path.join(workingDirectory, "apps", "demo", "src", "index.ts"),
      'export const projectName = "demo";\n',
      "utf8",
    );

    const previousWorkingDirectory = process.cwd();
    process.chdir(workingDirectory);

    try {
      const configurationService = new ConfigurationService();
      const templateValidationService = new TemplateValidationService(
        configurationService,
      );
      const payload =
        await templateValidationService.prepareTemplateValidationPayload({
          configurationPath: "configuration/conformetry.config.json",
          fileExtensions: [".ts"],
          filePaths: ["apps/demo"],
          workingDirectory,
        });

      expect(payload.violations).toStrictEqual([]);
      expect(payload.documents).toHaveLength(1);
      expect(payload.documents[0]?.renderedTemplate).toBe(
        'export const projectName = "demo";\n',
      );
      expect(payload.documents[0]?.instance).toBe(
        'export const projectName = "demo";\n',
      );
    } finally {
      process.chdir(previousWorkingDirectory);
    }
  });

  it("validates project paths for missing files and non-directory paths", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-template-path-validation-"),
    );
    createdDirectories.push(workingDirectory);

    const templateValidationService = new TemplateValidationService(
      new ConfigurationService(),
    );
    const missingPath = path.join(workingDirectory, "missing");
    const filePath = path.join(workingDirectory, "file.ts");
    await writeFile(filePath, "export {};\n", "utf8");

    expect(
      templateValidationService.validateProjectPath(missingPath),
    ).toStrictEqual([`Missing project path ${missingPath}`]);
    expect(
      templateValidationService.validateProjectPath(filePath),
    ).toStrictEqual([
      `Expected a project directory path but found file ${filePath}`,
    ]);
    expect(
      templateValidationService.validateProjectPath(workingDirectory),
    ).toStrictEqual([]);
  });

  it("prepares project documents for matched generators", async () => {
    const templateValidationService = new TemplateValidationService(
      new ConfigurationService(),
    );
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-template-project-documents-"),
    );
    createdDirectories.push(workingDirectory);
    const projectPath = path.join(workingDirectory, "apps", "demo");
    const templateDirectoryPath = path.join(
      workingDirectory,
      "configuration",
      "conformetry-templates",
      "demo",
      "src",
    );

    expect(
      templateValidationService.prepareDocumentsForProjectPath({
        configuration: { generators: {} },
        fileExtensions: [".ts"],
        projectPath: "/missing",
        selectedGeneratorNames: [],
        workingDirectory,
      }),
    ).toStrictEqual({
      documents: [],
      violations: ["Missing project path /missing"],
    });

    await mkdir(projectPath, { recursive: true });

    expect(
      templateValidationService.prepareDocumentsForProjectPath({
        configuration: { generators: {} },
        fileExtensions: [".ts"],
        projectPath,
        selectedGeneratorNames: [],
        workingDirectory,
      }),
    ).toStrictEqual({
      documents: [],
      violations: [],
    });

    await mkdir(templateDirectoryPath, { recursive: true });
    await mkdir(path.join(projectPath, "src"), { recursive: true });
    await writeFile(
      path.join(templateDirectoryPath, "index.ts"),
      'export const name = "{{name}}";\n',
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "src", "index.ts"),
      'export const name = "demo";\n',
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({
        tags: ["generator:demo"],
      }),
      "utf8",
    );

    const preparedProject =
      templateValidationService.prepareDocumentsForProjectPath({
        configuration: {
          generators: {
            demo: {
              name: "demo",
              parameters: {},
              templateDirectoryPath: "configuration/conformetry-templates/demo",
            },
          },
        },
        fileExtensions: [".ts"],
        projectPath,
        selectedGeneratorNames: ["demo"],
        workingDirectory,
      });

    expect(preparedProject.violations).toStrictEqual([]);
    expect(preparedProject.documents).toHaveLength(1);
    expect(preparedProject.documents[0]?.renderedTemplate).toBe(
      'export const name = "demo";\n',
    );
  });

  it("exposes helper operations through public methods", async () => {
    const templateValidationService = new TemplateValidationService(
      new ConfigurationService(),
    );
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-template-helper-methods-"),
    );
    createdDirectories.push(workingDirectory);
    const templateDirectoryPath = path.join(workingDirectory, "template");

    await mkdir(templateDirectoryPath, { recursive: true });
    await writeFile(path.join(templateDirectoryPath, "schema.json"), "{}\n");
    await writeFile(path.join(templateDirectoryPath, "index.ts"), "", "utf8");

    expect(
      templateValidationService.applySubstitutions("__name__", {
        name: "demo",
      }),
    ).toBe("demo");
    expect(
      templateValidationService.collectTemplateFilePaths(templateDirectoryPath),
    ).toStrictEqual([path.join(templateDirectoryPath, "index.ts")]);
    expect(templateValidationService.isTemplateFile("index.ts", true)).toBe(
      true,
    );
    expect(templateValidationService.isTemplateFile("index.ts", false)).toBe(
      false,
    );
    expect(
      templateValidationService.compareMatchedCandidates({
        inferredGeneratorNames: new Set<string>(),
        leftCandidate: {
          absoluteTemplateDirectoryPath: "/left",
          existingFileCount: 1,
          generatorName: "alpha",
          substitutions: {},
          templateFilePaths: [],
        },
        projectTemplateMetadata: {},
        rightCandidate: {
          absoluteTemplateDirectoryPath: "/right",
          existingFileCount: 1,
          generatorName: "beta",
          substitutions: {},
          templateFilePaths: [],
        },
      }),
    ).toBeLessThan(0);
    expect(
      templateValidationService.countExistingTemplateMappedFiles({
        absoluteTemplateDirectoryPath: templateDirectoryPath,
        projectPath: workingDirectory,
        substitutions: {},
        templateFilePaths: [path.join(templateDirectoryPath, "index.ts")],
      }),
    ).toBe(0);
  });

  it("prepares payloads with and without template rule filters", async () => {
    const templateValidationService = new TemplateValidationService(
      new ConfigurationService(),
    );
    const loadConformetryConfigurationSpy = vi
      .spyOn(ConfigurationService.prototype, "loadConformetryConfiguration")
      .mockResolvedValue({
        generators: {
          demo: {
            name: "demo",
            parameters: {},
            templateDirectoryPath: "configuration/conformetry-templates/demo",
          },
          second: {
            name: "second",
            parameters: {},
            templateDirectoryPath: "configuration/conformetry-templates/second",
          },
        },
      });
    const prepareDocumentsForProjectPathSpy = vi
      .spyOn(templateValidationService, "prepareDocumentsForProjectPath")
      .mockReturnValue({
        documents: [],
        violations: [],
      });

    try {
      await templateValidationService.prepareTemplateValidationPayload({
        configurationPath: "configuration/conformetry.config.ts",
        fileExtensions: [".ts"],
        filePaths: ["apps/demo", "packages/demo"],
        workingDirectory: "/workspace",
      });
      await templateValidationService.prepareTemplateValidationPayload({
        configurationPath: "configuration/conformetry.config.ts",
        fileExtensions: [".ts"],
        filePaths: ["apps/demo"],
        templateRuleNames: ["demo"],
        workingDirectory: "/workspace",
      });

      expect(loadConformetryConfigurationSpy).toHaveBeenCalledTimes(2);
      expect(prepareDocumentsForProjectPathSpy).toHaveBeenCalledTimes(3);
      expect(prepareDocumentsForProjectPathSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          selectedGeneratorNames: ["demo", "second"],
        }),
      );
      expect(prepareDocumentsForProjectPathSpy).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          selectedGeneratorNames: ["demo"],
        }),
      );
    } finally {
      prepareDocumentsForProjectPathSpy.mockRestore();
      loadConformetryConfigurationSpy.mockRestore();
    }
  });
});
