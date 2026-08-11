import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { discoverWorkspaceProjectPaths } from "./validation-project-paths.utilities.js";

const temporaryDirectoryPaths: string[] = [];

describe(discoverWorkspaceProjectPaths, () => {
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
});

function createTemporaryDirectoryPath(): string {
  const temporaryDirectoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "conformetry-validation-project-paths-"),
  );
  temporaryDirectoryPaths.push(temporaryDirectoryPath);
  return temporaryDirectoryPath;
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
