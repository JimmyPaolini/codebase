import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createTemplateValidationMetadataOperations } from "./configuration-template-validation-metadata.utilities";
import { createTemplateValidationOperations } from "./configuration-template-validation-operations.utilities";

const createdDirectories: string[] = [];

describe("template validation metadata operations", () => {
  afterEach(async () => {
    await Promise.all(
      createdDirectories.splice(0).map(async (directoryPath) => {
        await rm(directoryPath, { force: true, recursive: true });
      }),
    );
  });

  it("parses project metadata records and handles invalid values", () => {
    const operations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );

    expect(operations.parseProjectMetadataRecord("{not json")).toBeUndefined();
    expect(operations.parseProjectMetadataRecord("42")).toBeUndefined();
    expect(
      operations.parseProjectMetadataRecord(
        JSON.stringify({
          sourceRoot: "packages/demo/src",
          tags: ["generator:nestjs-service-project", 1, true],
        }),
      ),
    ).toStrictEqual({
      sourceRoot: "packages/demo/src",
      tags: ["generator:nestjs-service-project"],
    });
    expect(
      operations.parseProjectMetadataRecord(JSON.stringify({})),
    ).toStrictEqual({});
  });

  it("resolves generator tags, source root type, and unknown arrays", () => {
    const operations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );

    expect(
      operations.resolveGeneratorNameFromTags({
        tags: ["name:demo", "generator: nestjs-service-project "],
      }),
    ).toBe("nestjs-service-project");
    expect(
      operations.resolveGeneratorNameFromTags({ tags: ["name:demo"] }),
    ).toBeUndefined();
    expect(operations.resolveGeneratorNameFromTags({})).toBeUndefined();
    expect(
      operations.resolveGeneratorNameFromTags({
        tags: ["generator:   "],
      }),
    ).toBeUndefined();
    expect(
      operations.resolveSourceRootType({
        sourceRoot: "applications/demo/src",
      }),
    ).toBe("applications");
    expect(operations.resolveSourceRootType({})).toBeUndefined();
    expect(operations.toUnknownArray(["a", 1])).toStrictEqual(["a", 1]);
    expect(operations.toUnknownArray("value")).toBeUndefined();
  });

  it("resolves project template metadata from pyproject and project.json", async () => {
    const operations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-metadata-project-"),
    );
    createdDirectories.push(temporaryDirectoryPath);
    const projectPath = path.join(
      temporaryDirectoryPath,
      "applications",
      "demo",
    );

    await mkdir(projectPath, { recursive: true });
    await writeFile(
      path.join(projectPath, "pyproject.toml"),
      'description = "metadata description"\n',
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({
        sourceRoot: "packages/demo/src",
        tags: ["name:demo", "generator:nestjs-service-project"],
      }),
      "utf8",
    );

    expect(
      operations.resolveProjectTemplateMetadata(projectPath),
    ).toStrictEqual({
      description: "metadata description",
      generatorName: "nestjs-service-project",
      type: "packages",
    });
    expect(operations.resolveProjectDescription(projectPath)).toBe(
      "metadata description",
    );
    expect(operations.resolveProjectTemplateMetadata("/missing")).toStrictEqual(
      {
        description: "",
      },
    );
  });

  it("returns empty description and no generator when metadata tags do not match", async () => {
    const operations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-metadata-no-generator-"),
    );
    createdDirectories.push(temporaryDirectoryPath);

    await writeFile(
      path.join(temporaryDirectoryPath, "pyproject.toml"),
      'name = "demo"\n',
      "utf8",
    );
    await writeFile(
      path.join(temporaryDirectoryPath, "project.json"),
      JSON.stringify({
        tags: ["name:demo"],
      }),
      "utf8",
    );

    expect(
      operations.resolveProjectTemplateMetadata(temporaryDirectoryPath),
    ).toStrictEqual({
      description: "",
    });
  });

  it("falls back when project metadata cannot be parsed", async () => {
    const operations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-metadata-invalid-"),
    );
    createdDirectories.push(temporaryDirectoryPath);
    const projectPath = path.join(temporaryDirectoryPath, "packages", "demo");

    await mkdir(projectPath, { recursive: true });
    await writeFile(
      path.join(projectPath, "pyproject.toml"),
      'description = "invalid metadata fallback"\n',
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "project.json"),
      "{not-json",
      "utf8",
    );

    expect(
      operations.resolveProjectTemplateMetadata(projectPath),
    ).toStrictEqual({
      description: "invalid metadata fallback",
    });
  });

  it("resolves selected generators and project type fallback", () => {
    const operations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );
    const configuration = {
      generators: {
        alpha: {
          name: "alpha",
          parameters: {},
          templateDirectoryPath: "configuration/conformetry-templates/alpha",
        },
        beta: {
          name: "beta",
          parameters: {},
          templateDirectoryPath: "configuration/conformetry-templates/beta",
        },
      },
    };

    expect(
      operations.resolveSelectedGeneratorNames({ configuration }),
    ).toStrictEqual(["alpha", "beta"]);
    expect(
      operations.resolveSelectedGeneratorNames({
        configuration,
        templateRuleNames: ["beta", "missing"],
      }),
    ).toStrictEqual(["beta"]);
    expect(
      operations.resolveProjectType({
        projectPath: "/workspace/apps/demo",
        projectTemplateMetadata: {},
        workingDirectory: "/workspace",
      }),
    ).toBe("apps");
    expect(
      operations.resolveProjectType({
        projectPath: "/workspace/apps/demo",
        projectTemplateMetadata: { type: "packages" },
        workingDirectory: "/workspace",
      }),
    ).toBe("packages");
    expect(
      operations.resolveProjectType({
        projectPath: "/workspace",
        projectTemplateMetadata: {},
        workingDirectory: "/workspace",
      }),
    ).toBe("applications");
  });

  it("resolves the best matched candidate from inferred and tagged generators", async () => {
    const templateValidationOperations = createTemplateValidationOperations();
    const metadataOperations = createTemplateValidationMetadataOperations(
      templateValidationOperations,
    );
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-metadata-best-candidate-"),
    );
    createdDirectories.push(temporaryDirectoryPath);
    const projectPath = path.join(
      temporaryDirectoryPath,
      "applications",
      "demo-project",
    );

    await mkdir(path.join(projectPath, "src"), { recursive: true });
    await writeFile(path.join(projectPath, "src", "index.ts"), "", "utf8");
    await writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({
        tags: ["generator:beta"],
      }),
      "utf8",
    );
    await mkdir(
      path.join(
        temporaryDirectoryPath,
        "configuration",
        "conformetry-templates",
        "alpha",
        "src",
      ),
      { recursive: true },
    );
    await mkdir(
      path.join(
        temporaryDirectoryPath,
        "configuration",
        "conformetry-templates",
        "beta",
        "src",
      ),
      { recursive: true },
    );
    await writeFile(
      path.join(
        temporaryDirectoryPath,
        "configuration",
        "conformetry-templates",
        "alpha",
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
        "beta",
        "src",
        "index.ts",
      ),
      "",
      "utf8",
    );

    const configuration = {
      generators: {
        alpha: {
          name: "alpha",
          parameters: {},
          templateDirectoryPath: "configuration/conformetry-templates/alpha",
        },
        beta: {
          name: "beta",
          parameters: {},
          templateDirectoryPath: "configuration/conformetry-templates/beta",
        },
      },
    };

    const matchedCandidate =
      metadataOperations.resolveBestMatchedGeneratorCandidate({
        configuration,
        projectPath,
        selectedGeneratorNames: ["alpha", "beta"],
        workingDirectory: temporaryDirectoryPath,
      });

    expect(matchedCandidate?.generatorName).toBe("beta");
  });
});
