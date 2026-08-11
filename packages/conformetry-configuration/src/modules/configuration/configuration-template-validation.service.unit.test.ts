import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateValidationService } from "./configuration-template-validation.service";
import { ConfigurationService } from "./configuration.service";

import type {
  ConformetryConfiguration,
  PreparedValidationDocument,
} from "./configuration.types";

const createdDirectories: string[] = [];

describe("template validation service", () => {
  let service: TemplateValidationService;

  beforeEach(() => {
    service = new TemplateValidationService(new ConfigurationService());
  });

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

  it("delegates helper operations for substitutions, file collection, and candidate ranking", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-template-validation-helpers-"),
    );
    createdDirectories.push(workingDirectory);
    await mkdir(path.join(workingDirectory, "templates", "demo"), {
      recursive: true,
    });
    await writeFile(
      path.join(workingDirectory, "templates", "demo", "index.ts"),
      "export const value = 1;\n",
      "utf8",
    );
    await writeFile(
      path.join(workingDirectory, "templates", "demo", "schema.json"),
      "{}\n",
      "utf8",
    );
    await mkdir(path.join(workingDirectory, "apps", "demo", "src"), {
      recursive: true,
    });
    await writeFile(
      path.join(workingDirectory, "apps", "demo", "src", "demo.ts"),
      "export {};\n",
      "utf8",
    );

    expect(
      service.applySubstitutions("hello __name__", { name: "world" }),
    ).toBe("hello world");
    expect(
      service.collectTemplateFilePaths(
        path.join(workingDirectory, "templates"),
      ),
    ).toStrictEqual([
      path.join(workingDirectory, "templates", "demo", "index.ts"),
      path.join(workingDirectory, "templates", "demo", "schema.json"),
    ]);
    expect(service.isTemplateFile("schema.json", true)).toBe(true);
    expect(service.isTemplateFile("index.ts", true)).toBe(true);

    const compareResult = service.compareMatchedCandidates({
      inferredGeneratorNames: new Set(["demo"]),
      leftCandidate: {
        absoluteTemplateDirectoryPath: "/tmp/left",
        existingFileCount: 1,
        generatorName: "demo",
        substitutions: {},
        templateFilePaths: [],
      },
      projectTemplateMetadata: {},
      rightCandidate: {
        absoluteTemplateDirectoryPath: "/tmp/right",
        existingFileCount: 1,
        generatorName: "alpha",
        substitutions: {},
        templateFilePaths: [],
      },
    });

    expect(compareResult).toBeLessThan(0);

    expect(
      service.countExistingTemplateMappedFiles({
        absoluteTemplateDirectoryPath: path.join(
          workingDirectory,
          "templates",
          "demo",
        ),
        projectPath: path.join(workingDirectory, "apps", "demo"),
        substitutions: { nameKebabCase: "demo" },
        templateFilePaths: [
          path.join(
            workingDirectory,
            "templates",
            "demo",
            "src",
            "__nameKebabCase__.ts",
          ),
        ],
      }),
    ).toBe(1);
  });

  it("creates template substitutions from metadata and fallback path inference", () => {
    const metadataSubstitutions = service.createTemplateSubstitutions({
      projectPath: "/workspace/packages/demo-app",
      projectTemplateMetadata: {
        description: "explicit description",
        type: "packages",
      },
      workingDirectory: "/workspace",
    });

    expect(metadataSubstitutions["description"]).toBe("explicit description");
    expect(metadataSubstitutions["type"]).toBe("packages");

    const fallbackSubstitutions = service.createTemplateSubstitutions({
      projectPath: "/workspace/apps/demo-app",
      projectTemplateMetadata: {},
      workingDirectory: "/workspace",
    });

    expect(fallbackSubstitutions["type"]).toBe("apps");
  });

  it("returns path violations for missing paths and file paths", async () => {
    const missingProjectPath = path.join(
      tmpdir(),
      "conformetry-template-validation-missing-path",
    );

    expect(service.validateProjectPath(missingProjectPath)).toStrictEqual([
      `Missing project path ${missingProjectPath}`,
    ]);

    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-template-validation-file-path-"),
    );
    createdDirectories.push(workingDirectory);
    const filePath = path.join(workingDirectory, "project.txt");
    await writeFile(filePath, "demo\n", "utf8");

    expect(service.validateProjectPath(filePath)).toStrictEqual([
      `Expected a project directory path but found file ${filePath}`,
    ]);
  });

  it("returns violations when project path validation fails", () => {
    const result = service.prepareDocumentsForProjectPath({
      configuration: { generators: {} },
      fileExtensions: [".ts"],
      projectPath: path.join(
        tmpdir(),
        "conformetry-template-validation-missing-project",
      ),
      selectedGeneratorNames: [],
      workingDirectory: "/workspace",
    });

    expect(result.documents).toStrictEqual([]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("Missing project path");
  });

  it("returns empty documents and violations when no generator candidate matches", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-template-validation-no-match-"),
    );
    createdDirectories.push(workingDirectory);
    const projectPath = path.join(workingDirectory, "apps", "demo");
    await mkdir(projectPath, { recursive: true });
    const configuration: ConformetryConfiguration = {
      generators: {},
    };

    const result = service.prepareDocumentsForProjectPath({
      configuration,
      fileExtensions: [".ts"],
      projectPath,
      selectedGeneratorNames: ["demo"],
      workingDirectory,
    });

    expect(result).toStrictEqual({
      documents: [],
      violations: [],
    });
  });

  it("aggregates prepared project documents for each input path with template-rule filtering", async () => {
    const configuration: ConformetryConfiguration = {
      generators: {
        alpha: {
          name: "alpha",
          parameters: {},
          templateDirectoryPath: "templates/alpha",
        },
      },
    };
    const preparedDocument: PreparedValidationDocument = {
      filename: "index.ts",
      instance: "instance",
      instanceFilePath: "/workspace/apps/demo/index.ts",
      renderedTemplate: "rendered",
      templateFilePath: "/workspace/templates/alpha/index.ts",
    };
    const configurationService = new ConfigurationService();
    const loadConformetryConfigurationSpy = vi
      .spyOn(configurationService, "loadConformetryConfiguration")
      .mockResolvedValue(configuration);
    const configuredService = new TemplateValidationService(
      configurationService,
    );
    const prepareDocumentsForProjectPathSpy = vi
      .spyOn(configuredService, "prepareDocumentsForProjectPath")
      .mockImplementation(
        ({
          projectPath,
        }: {
          projectPath: string;
        }): {
          documents: PreparedValidationDocument[];
          violations: string[];
        } => {
          return projectPath.endsWith("demo")
            ? {
                documents: [preparedDocument],
                violations: [],
              }
            : {
                documents: [],
                violations: [`Violation in ${projectPath}`],
              };
        },
      );

    try {
      const payload = await configuredService.prepareTemplateValidationPayload({
        configurationPath: "configuration/conformetry.config.ts",
        fileExtensions: [".ts"],
        filePaths: ["apps/demo", "apps/other"],
        templateRuleNames: ["alpha"],
        workingDirectory: "/workspace",
      });

      expect(loadConformetryConfigurationSpy).toHaveBeenCalledWith(
        "configuration/conformetry.config.ts",
      );
      expect(prepareDocumentsForProjectPathSpy).toHaveBeenCalledTimes(2);
      expect(payload).toStrictEqual({
        checkedPaths: ["apps/demo", "apps/other"],
        documents: [preparedDocument],
        violations: ["Violation in /workspace/apps/other"],
      });
    } finally {
      prepareDocumentsForProjectPathSpy.mockRestore();
      loadConformetryConfigurationSpy.mockRestore();
    }
  });
});
