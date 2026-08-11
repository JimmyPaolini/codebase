import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  discoverWorkspaceProjectPaths,
  resolveValidationSelection,
} from "./validation-project-paths.utilities.js";

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
