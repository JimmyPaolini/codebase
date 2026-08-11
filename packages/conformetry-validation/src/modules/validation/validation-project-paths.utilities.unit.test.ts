import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  discoverWorkspaceProjectPaths,
  resolveValidationSelection,
} from "./validation-project-paths.utilities.js";
import {
  normalizeProjectPath,
  readTemplateRuleNamesByProjectTag,
  resolveApplicableTemplateRuleNames,
  resolveMatchedProjects,
  resolveProjectPaths,
} from "./validation-project-selection.utilities.js";

const temporaryDirectoryPaths: string[] = [];

describe("validation project path utilities", () => {
  afterEach(() => {
    for (const temporaryDirectoryPath of temporaryDirectoryPaths) {
      fs.rmSync(temporaryDirectoryPath, { force: true, recursive: true });
    }
    temporaryDirectoryPaths.length = 0;
  });

  it("discovers valid project roots and ignores invalid metadata", () => {
    const workingDirectory = createTemporaryDirectoryPath();
    writeProjectMetadata({
      projectMetadata: {
        name: "affirmations",
        sourceRoot: "applications/affirmations",
      },
      relativeProjectPath: "applications/affirmations",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: {
        name: "caelundas",
        sourceRoot: "applications/caelundas",
      },
      relativeProjectPath: "applications/caelundas",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: "invalid",
      relativeProjectPath: "applications/invalid",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: {
        name: "ignored",
        sourceRoot: "node_modules/ignored",
      },
      relativeProjectPath: "node_modules/ignored",
      workingDirectory,
    });

    expect(discoverWorkspaceProjectPaths(workingDirectory)).toStrictEqual([
      "applications/affirmations",
      "applications/caelundas",
    ]);
  });

  it("returns an empty list when no project metadata is present", () => {
    const workingDirectory = createTemporaryDirectoryPath();

    expect(discoverWorkspaceProjectPaths(workingDirectory)).toStrictEqual([]);
  });

  it("routes all-project validation to only tagged conformetry projects", () => {
    const workingDirectory = createTemporaryDirectoryPath();
    writeNxJsonConfiguration(workingDirectory);
    writeProjectMetadata({
      projectMetadata: {
        name: "caelundas",
        sourceRoot: "applications/caelundas",
        tags: ["framework:nest-commander", "generator:nestjs-command-project"],
      },
      relativeProjectPath: "applications/caelundas",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: {
        name: "lexico",
        sourceRoot: "applications/lexico/src",
        tags: ["framework:react", "language:typescript"],
      },
      relativeProjectPath: "applications/lexico",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: {
        name: "affirmations",
        sourceRoot: "applications/affirmations",
        tags: ["generator:jupyter-notebook-application", "language:python"],
      },
      relativeProjectPath: "applications/affirmations",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: {
        name: "nestjs-service-project",
        sourceRoot:
          "configuration/conformetry-templates/nestjs-service-project",
        tags: ["generator:nestjs-service-project"],
      },
      relativeProjectPath:
        "configuration/conformetry-templates/nestjs-service-project",
      workingDirectory,
    });

    expect(
      resolveValidationSelection({
        configuredTemplateRuleNames: [
          "jupyter-notebook-application",
          "nestjs-command-module",
          "nestjs-command-project",
          "nestjs-service-file",
          "nestjs-service-module",
          "react-component",
        ],
        workingDirectory,
      }),
    ).toStrictEqual({
      projectPaths: ["applications/affirmations", "applications/caelundas"],
      templateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-module",
        "nestjs-command-project",
        "nestjs-service-file",
        "nestjs-service-module",
      ],
    });
  });

  it("filters requested rules to those applicable to selected projects", () => {
    const workingDirectory = createTemporaryDirectoryPath();
    writeNxJsonConfiguration(workingDirectory);
    writeProjectMetadata({
      projectMetadata: {
        name: "caelundas",
        sourceRoot: "applications/caelundas",
        tags: ["framework:nest-commander", "generator:nestjs-command-project"],
      },
      relativeProjectPath: "applications/caelundas",
      workingDirectory,
    });

    expect(
      resolveValidationSelection({
        configuredTemplateRuleNames: [
          "nestjs-command-project",
          "react-component",
        ],
        requestedProjectPaths: ["caelundas"],
        requestedRuleNames: [
          "json",
          "react-component",
          "nestjs-command-project",
        ],
        workingDirectory,
      }),
    ).toStrictEqual({
      projectPaths: ["applications/caelundas"],
      templateRuleNames: ["nestjs-command-project"],
    });
  });

  it("normalizes selectors and resolves tag mappings for configured rules", () => {
    const workingDirectory = createTemporaryDirectoryPath();
    const relativeProjectPath = "./applications/fixtures/project";
    const projectSelector = path.join(
      workingDirectory,
      "applications",
      "fixtures",
      "project",
    );
    const templateRuleNamesByProjectTag = {
      "framework:nest-commander": ["nestjs-command-project"],
      "generator:jupyter-notebook-application": [
        "jupyter-notebook-application",
      ],
    };

    expect(normalizeProjectPath(relativeProjectPath)).toBe(
      "applications/fixtures/project",
    );
    expect(normalizeProjectPath(".")).toBe(".");
    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toBeUndefined();

    fs.writeFileSync(
      path.join(workingDirectory, "nx.json"),
      JSON.stringify({
        plugins: [
          {
            options: {
              templateRuleNamesByProjectTag,
            },
            plugin: "@jimmypaolini/conformetry-nx",
          },
        ],
      }),
      "utf8",
    );

    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toStrictEqual(
      templateRuleNamesByProjectTag,
    );
    expect(
      resolveApplicableTemplateRuleNames({
        configuredTemplateRuleNames: [
          "jupyter-notebook-application",
          "nestjs-command-project",
          "react-component",
        ],
        projectTags: [
          "framework:nest-commander",
          "generator:jupyter-notebook-application",
        ],
        templateRuleNamesByProjectTag,
      }),
    ).toStrictEqual(["jupyter-notebook-application", "nestjs-command-project"]);
    expect(
      resolveMatchedProjects({
        projectSelectors: [projectSelector],
        workingDirectory,
        workspaceProjects: [
          {
            name: "project",
            rootPath: "applications/fixtures/project",
            sourceRoot: "applications/fixtures/project/src",
            tags: [],
          },
        ],
      }),
    ).toStrictEqual([
      {
        name: "project",
        rootPath: "applications/fixtures/project",
        sourceRoot: "applications/fixtures/project/src",
        tags: [],
      },
    ]);
    expect(
      resolveProjectPaths({
        matchedProjects: [],
        projectSelectors: [projectSelector],
        workingDirectory,
      }),
    ).toStrictEqual(["applications/fixtures/project"]);
  });

  it("ignores malformed plugin mappings and path selectors", () => {
    const workingDirectory = createTemporaryDirectoryPath();

    fs.writeFileSync(
      path.join(workingDirectory, "nx.json"),
      JSON.stringify({
        plugins: [
          {
            options: {
              templateRuleNamesByProjectTag: {
                "framework:typescript": ["react-component", 42],
              },
            },
            plugin: "@jimmypaolini/conformetry-nx",
          },
        ],
      }),
      "utf8",
    );

    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toStrictEqual({
      "framework:typescript": ["react-component"],
    });
    expect(
      resolveMatchedProjects({
        projectSelectors: ["non-existent"],
        workingDirectory,
        workspaceProjects: [
          {
            name: "real-project",
            rootPath: "packages/real-project",
            sourceRoot: "packages/real-project/src",
            tags: [],
          },
        ],
      }),
    ).toStrictEqual([]);
    expect(
      resolveProjectPaths({
        matchedProjects: [],
        projectSelectors: ["not/a/real/path"],
        workingDirectory,
      }),
    ).toStrictEqual(["not/a/real/path"]);
  });

  it("covers remaining selector, generator, and malformed mapping branches", () => {
    const workingDirectory = createTemporaryDirectoryPath();
    const project = {
      name: "demo-project",
      rootPath: "apps/demo-project",
      sourceRoot: "apps/demo-project/src",
      tags: ["generator:custom-generator"],
    };

    expect(normalizeProjectPath("./apps/demo-project")).toBe(
      "apps/demo-project",
    );
    expect(
      resolveApplicableTemplateRuleNames({
        configuredTemplateRuleNames: ["custom-generator"],
        projectTags: ["generator:custom-generator"],
      }),
    ).toStrictEqual(["custom-generator"]);

    fs.writeFileSync(
      path.join(workingDirectory, "nx.json"),
      JSON.stringify(null),
      "utf8",
    );

    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toBeUndefined();

    fs.writeFileSync(
      path.join(workingDirectory, "nx.json"),
      JSON.stringify({
        plugins: [
          {
            options: {
              templateRuleNamesByProjectTag: {
                "framework:typescript": "not-an-array",
              },
            },
            plugin: "@jimmypaolini/conformetry-nx",
          },
        ],
      }),
      "utf8",
    );

    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toBeUndefined();

    fs.writeFileSync(
      path.join(workingDirectory, "nx.json"),
      JSON.stringify({
        plugins: [
          {
            options: null,
            plugin: "@jimmypaolini/conformetry-nx",
          },
        ],
      }),
      "utf8",
    );

    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toBeUndefined();

    expect(
      resolveMatchedProjects({
        projectSelectors: ["apps/demo-project"],
        workingDirectory,
        workspaceProjects: [project],
      }),
    ).toStrictEqual([project]);
    expect(
      resolveProjectPaths({
        matchedProjects: [project],
        projectSelectors: ["unused"],
        workingDirectory,
      }),
    ).toStrictEqual(["apps/demo-project"]);
    expect(
      resolveProjectPaths({
        matchedProjects: [],
        projectSelectors: [path.join(workingDirectory, "apps", "demo-project")],
        workingDirectory,
      }),
    ).toStrictEqual(["apps/demo-project"]);

    writeProjectMetadata({
      projectMetadata: {
        name: "demo-project",
        sourceRoot: "apps/demo-project/src",
        tags: ["generator:custom-generator"],
      },
      relativeProjectPath: "apps/demo-project",
      workingDirectory,
    });

    expect(
      resolveValidationSelection({
        configuredTemplateRuleNames: ["custom-generator"],
        requestedProjectPaths: ["missing-project"],
        requestedRuleNames: ["custom-generator"],
        workingDirectory,
      }),
    ).toStrictEqual({
      projectPaths: ["missing-project"],
      templateRuleNames: ["custom-generator"],
    });
    expect(
      resolveValidationSelection({
        configuredTemplateRuleNames: ["custom-generator", "react-component"],
        requestedRuleNames: ["custom-generator"],
        workingDirectory,
      }),
    ).toStrictEqual({
      projectPaths: ["apps/demo-project"],
      templateRuleNames: ["custom-generator"],
    });
  });

  it("handles missing plugin data and generator-specific rule matching", () => {
    const workingDirectory = createTemporaryDirectoryPath();

    fs.writeFileSync(
      path.join(workingDirectory, "nx.json"),
      JSON.stringify({
        plugins: "not-an-array",
      }),
      "utf8",
    );

    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toBeUndefined();

    fs.writeFileSync(
      path.join(workingDirectory, "nx.json"),
      JSON.stringify({
        plugins: [
          {
            options: {
              templateRuleNamesByProjectTag: {
                "framework:react": [],
              },
            },
            plugin: "@jimmypaolini/conformetry-nx",
          },
        ],
      }),
      "utf8",
    );

    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toBeUndefined();
    expect(
      resolveApplicableTemplateRuleNames({
        configuredTemplateRuleNames: [
          "react-component",
          "nestjs-command-project",
          "alpha-generator",
        ],
        projectTags: ["framework:react", "generator:alpha-generator"],
        templateRuleNamesByProjectTag: {
          "framework:react": ["react-component"],
        },
      }),
    ).toStrictEqual(["react-component", "alpha-generator"]);
  });

  it("matches child paths under a project root and prefers the matched root", () => {
    const workingDirectory = createTemporaryDirectoryPath();
    const project = {
      name: "nested-project",
      rootPath: "packages/nested-project",
      sourceRoot: "packages/nested-project/src",
      tags: [],
    };
    const nestedSelector = path.join(
      workingDirectory,
      "packages",
      "nested-project",
      "src",
    );

    expect(
      resolveMatchedProjects({
        projectSelectors: ["packages/nested-project/src"],
        workingDirectory,
        workspaceProjects: [project],
      }),
    ).toStrictEqual([project]);
    expect(
      resolveMatchedProjects({
        projectSelectors: [nestedSelector],
        workingDirectory,
        workspaceProjects: [project],
      }),
    ).toStrictEqual([project]);
    expect(
      resolveMatchedProjects({
        projectSelectors: ["nested-project"],
        workingDirectory,
        workspaceProjects: [project],
      }),
    ).toStrictEqual([project]);
    expect(
      resolveProjectPaths({
        matchedProjects: [project],
        projectSelectors: ["unused"],
        workingDirectory,
      }),
    ).toStrictEqual(["packages/nested-project"]);
  });

  it("ignores malformed plugin entries and invalid option shapes", () => {
    const workingDirectory = createTemporaryDirectoryPath();
    const project = {
      name: "named-project",
      rootPath: "apps/named-project",
      sourceRoot: "apps/named-project/src",
      tags: ["generator:custom-generator"],
    };

    fs.writeFileSync(
      path.join(workingDirectory, "nx.json"),
      JSON.stringify({
        plugins: [
          "not-a-plugin",
          { options: "ignored", plugin: "other-plugin" },
          {
            options: {
              templateRuleNamesByProjectTag: {
                "framework:react": ["react-component", null],
              },
            },
            plugin: "@jimmypaolini/conformetry-nx",
          },
        ],
      }),
      "utf8",
    );

    expect(readTemplateRuleNamesByProjectTag(workingDirectory)).toStrictEqual({
      "framework:react": ["react-component"],
    });
    expect(
      resolveMatchedProjects({
        projectSelectors: [
          path.join(workingDirectory, "apps", "named-project", "src", "nested"),
        ],
        workingDirectory,
        workspaceProjects: [project],
      }),
    ).toStrictEqual([project]);
    expect(
      resolveApplicableTemplateRuleNames({
        configuredTemplateRuleNames: ["custom-generator", "react-component"],
        projectTags: ["generator:custom-generator", "framework:react"],
        templateRuleNamesByProjectTag: {
          "framework:react": ["react-component"],
        },
      }),
    ).toStrictEqual(["custom-generator", "react-component"]);
  });
});

function createTemporaryDirectoryPath(): string {
  const temporaryDirectoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "conformetry-validation-project-paths-"),
  );
  temporaryDirectoryPaths.push(temporaryDirectoryPath);
  return temporaryDirectoryPath;
}

function writeNxJsonConfiguration(workingDirectory: string): void {
  fs.writeFileSync(
    path.join(workingDirectory, "nx.json"),
    JSON.stringify({
      plugins: [
        {
          options: {
            templateRuleNamesByProjectTag: {
              "framework:nest-commander": [
                "nestjs-command-module",
                "nestjs-command-project",
                "nestjs-service-file",
                "nestjs-service-module",
              ],
            },
          },
          plugin: "@jimmypaolini/conformetry-nx",
        },
      ],
    }),
    "utf8",
  );
}

function writeProjectMetadata(args: {
  projectMetadata: unknown;
  relativeProjectPath: string;
  workingDirectory: string;
}): void {
  const projectDirectoryPath = path.join(
    args.workingDirectory,
    args.relativeProjectPath,
  );
  fs.mkdirSync(projectDirectoryPath, { recursive: true });
  fs.writeFileSync(
    path.join(projectDirectoryPath, "project.json"),
    typeof args.projectMetadata === "string"
      ? args.projectMetadata
      : JSON.stringify(args.projectMetadata),
    "utf8",
  );
}
