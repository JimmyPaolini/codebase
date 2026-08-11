import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createTemplateValidationMetadataOperations } from "./configuration-template-validation-metadata.utilities.js";
import { createTemplateValidationOperations } from "./configuration-template-validation-operations.utilities.js";

import type { ConformetryConfiguration } from "./configuration.types.js";

const createdDirectoryPaths: string[] = [];

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directoryPath = await mkdtemp(path.join(tmpdir(), prefix));
  createdDirectoryPaths.push(directoryPath);

  return directoryPath;
}

describe("template validation metadata utilities", () => {
  afterEach(async () => {
    await Promise.all(
      createdDirectoryPaths.splice(0).map(async (directoryPath) => {
        await rm(directoryPath, { force: true, recursive: true });
      }),
    );
  });

  it("parses project metadata records and safely handles invalid payloads", () => {
    const metadataOperations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );

    expect(
      metadataOperations.parseProjectMetadataRecord("invalid"),
    ).toBeUndefined();
    expect(
      metadataOperations.parseProjectMetadataRecord('"text"'),
    ).toBeUndefined();
    expect(
      metadataOperations.parseProjectMetadataRecord(
        JSON.stringify({
          sourceRoot: "packages/demo/src",
          tags: ["generator:demo", 42],
        }),
      ),
    ).toStrictEqual({
      sourceRoot: "packages/demo/src",
      tags: ["generator:demo"],
    });
    expect(metadataOperations.parseProjectMetadataRecord("{}")).toStrictEqual(
      {},
    );
    expect(
      metadataOperations.parseProjectMetadataRecord(
        JSON.stringify({ sourceRoot: 42, tags: "invalid" }),
      ),
    ).toStrictEqual({});
  });

  it("resolves generator names from tags and ignores missing or empty values", () => {
    const metadataOperations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );

    expect(metadataOperations.resolveGeneratorNameFromTags({})).toBeUndefined();
    expect(
      metadataOperations.resolveGeneratorNameFromTags({
        tags: ["framework:nestjs", "name:demo"],
      }),
    ).toBeUndefined();
    expect(
      metadataOperations.resolveGeneratorNameFromTags({
        tags: ["framework:nestjs", "generator:   ", "generator:demo-rule"],
      }),
    ).toBe("demo-rule");
  });

  it("resolves selected generator names with and without template rule filters", () => {
    const metadataOperations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );
    const configuration: ConformetryConfiguration = {
      generators: {
        alpha: {
          name: "alpha",
          parameters: {},
          templateDirectoryPath: "templates/alpha",
        },
        beta: {
          name: "beta",
          parameters: {},
          templateDirectoryPath: "templates/beta",
        },
      },
    };

    expect(
      metadataOperations.resolveSelectedGeneratorNames({
        configuration,
      }),
    ).toStrictEqual(["alpha", "beta"]);
    expect(
      metadataOperations.resolveSelectedGeneratorNames({
        configuration,
        templateRuleNames: ["beta", "missing"],
      }),
    ).toStrictEqual(["beta"]);
    expect(
      metadataOperations.resolveSelectedGeneratorNames({
        configuration,
        templateRuleNames: [],
      }),
    ).toStrictEqual(["alpha", "beta"]);
  });

  it("resolves project metadata and fallback project types from filesystem content", async () => {
    const metadataOperations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );
    const workingDirectory = await createTemporaryDirectory(
      "conformetry-metadata-filesystem-",
    );
    const projectPath = path.join(workingDirectory, "packages", "demo");
    await mkdir(projectPath, { recursive: true });
    await writeFile(
      path.join(projectPath, "pyproject.toml"),
      'description = "metadata description"\n',
      "utf8",
    );

    expect(metadataOperations.resolveProjectDescription(projectPath)).toBe(
      "metadata description",
    );
    expect(
      metadataOperations.resolveProjectDescription(
        path.join(workingDirectory, "missing"),
      ),
    ).toBe("");

    expect(
      metadataOperations.resolveProjectTemplateMetadata(projectPath),
    ).toStrictEqual({
      description: "metadata description",
    });

    await writeFile(path.join(projectPath, "project.json"), "{invalid", "utf8");

    expect(
      metadataOperations.resolveProjectTemplateMetadata(projectPath),
    ).toStrictEqual({
      description: "metadata description",
    });

    await writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({
        sourceRoot: "applications/demo/src",
        tags: ["name:demo", "generator:nestjs-service-module"],
      }),
      "utf8",
    );

    expect(
      metadataOperations.resolveProjectTemplateMetadata(projectPath),
    ).toStrictEqual({
      description: "metadata description",
      generatorName: "nestjs-service-module",
      type: "applications",
    });

    await writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({ tags: ["name:demo"] }),
      "utf8",
    );

    expect(
      metadataOperations.resolveProjectTemplateMetadata(projectPath),
    ).toStrictEqual({
      description: "metadata description",
    });

    await writeFile(
      path.join(projectPath, "pyproject.toml"),
      'name = "demo"\n',
      "utf8",
    );

    expect(metadataOperations.resolveProjectDescription(projectPath)).toBe("");

    expect(
      metadataOperations.resolveProjectType({
        projectPath,
        projectTemplateMetadata: { type: "tools" },
        workingDirectory,
      }),
    ).toBe("tools");
    expect(
      metadataOperations.resolveProjectType({
        projectPath,
        projectTemplateMetadata: {},
        workingDirectory,
      }),
    ).toBe("packages");
    expect(
      metadataOperations.resolveProjectType({
        projectPath: workingDirectory,
        projectTemplateMetadata: {},
        workingDirectory,
      }),
    ).toBe("applications");
  });

  it("selects the best matched generator candidate using metadata and candidate ranking", async () => {
    const metadataOperations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );
    const workingDirectory = await createTemporaryDirectory(
      "conformetry-metadata-candidate-",
    );
    const projectPath = path.join(workingDirectory, "apps", "demo");
    const alphaTemplateDirectoryPath = path.join(
      workingDirectory,
      "templates",
      "alpha",
      "src",
    );
    const betaTemplateDirectoryPath = path.join(
      workingDirectory,
      "templates",
      "beta",
      "src",
    );
    await mkdir(path.join(projectPath, "src"), { recursive: true });
    await mkdir(alphaTemplateDirectoryPath, { recursive: true });
    await mkdir(betaTemplateDirectoryPath, { recursive: true });
    await writeFile(
      path.join(projectPath, "src", "index.ts"),
      "export const project = 'demo';\n",
      "utf8",
    );
    await writeFile(
      path.join(alphaTemplateDirectoryPath, "index.ts"),
      "export const project = '{{name}}';\n",
      "utf8",
    );
    await writeFile(
      path.join(betaTemplateDirectoryPath, "index.ts"),
      "export const project = '{{name}}';\n",
      "utf8",
    );
    await writeFile(
      path.join(projectPath, "project.json"),
      JSON.stringify({
        sourceRoot: "apps/demo/src",
        tags: ["generator:beta"],
      }),
      "utf8",
    );

    const configuration: ConformetryConfiguration = {
      generators: {
        alpha: {
          name: "alpha",
          parameters: {},
          templateDirectoryPath: "templates/alpha",
        },
        beta: {
          name: "beta",
          parameters: {},
          templateDirectoryPath: "templates/beta",
        },
      },
    };

    const bestCandidate =
      metadataOperations.resolveBestMatchedGeneratorCandidate({
        configuration,
        fileExtensions: [".ts"],
        projectPath,
        selectedGeneratorNames: ["alpha", "beta"],
        workingDirectory,
      });

    expect(bestCandidate?.generatorName).toBe("beta");
    expect(bestCandidate?.existingFileCount).toBe(1);

    const unmatchedCandidate =
      metadataOperations.resolveBestMatchedGeneratorCandidate({
        configuration,
        fileExtensions: [".ts"],
        projectPath,
        selectedGeneratorNames: ["missing-generator"],
        workingDirectory,
      });

    expect(unmatchedCandidate).toBeUndefined();
  });

  it("converts unknown arrays only when values are arrays", () => {
    const metadataOperations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );

    expect(metadataOperations.toUnknownArray("value")).toBeUndefined();
    expect(metadataOperations.toUnknownArray([1, "two"])).toStrictEqual([
      1,
      "two",
    ]);
  });

  it("resolves source-root types only when sourceRoot is present", () => {
    const metadataOperations = createTemplateValidationMetadataOperations(
      createTemplateValidationOperations(),
    );

    expect(metadataOperations.resolveSourceRootType({})).toBeUndefined();
    expect(
      metadataOperations.resolveSourceRootType({
        sourceRoot: "packages/demo/src",
      }),
    ).toBe("packages");
  });
});
