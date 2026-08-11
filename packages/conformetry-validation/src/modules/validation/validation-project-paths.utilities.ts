import fs from "node:fs";
import path from "node:path";

/**
 * Discovers real workspace project roots by scanning project.json metadata.
 */
export function discoverWorkspaceProjectPaths(
  workingDirectory: string,
): string[] {
  const discoveredProjectPaths = new Set<string>();
  const projectMetadataFilename = "project.json";
  const skippedDirectoryNames = new Set<string>([
    ".git",
    "dist",
    "node_modules",
  ]);

  collectWorkspaceProjectPaths({
    currentDirectory: workingDirectory,
    discoveredProjectPaths,
    projectMetadataFilename,
    skippedDirectoryNames,
    workingDirectory,
  });

  return [...discoveredProjectPaths].toSorted();
}

/**
 * Recursively scans a directory tree for project.json files.
 */
function collectWorkspaceProjectPaths(args: {
  currentDirectory: string;
  discoveredProjectPaths: Set<string>;
  projectMetadataFilename: string;
  skippedDirectoryNames: Set<string>;
  workingDirectory: string;
}): void {
  const directoryEntries = fs.readdirSync(args.currentDirectory, {
    withFileTypes: true,
  });

  for (const directoryEntry of directoryEntries) {
    const entryPath = path.join(args.currentDirectory, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      if (!args.skippedDirectoryNames.has(directoryEntry.name)) {
        collectWorkspaceProjectPaths({
          currentDirectory: entryPath,
          discoveredProjectPaths: args.discoveredProjectPaths,
          projectMetadataFilename: args.projectMetadataFilename,
          skippedDirectoryNames: args.skippedDirectoryNames,
          workingDirectory: args.workingDirectory,
        });
      }

      continue;
    }

    if (
      !directoryEntry.isFile() ||
      directoryEntry.name !== args.projectMetadataFilename
    ) {
      continue;
    }

    const projectPath = path.dirname(entryPath);
    const projectMetadata = readProjectMetadata(entryPath);

    if (!isWorkspaceProjectMetadata(projectMetadata)) {
      continue;
    }

    args.discoveredProjectPaths.add(
      normalizeProjectPath(path.relative(args.workingDirectory, projectPath)),
    );
  }
}

/**
 * Checks whether the parsed project metadata looks like a workspace project.
 */
function isWorkspaceProjectMetadata(
  projectMetadata: unknown,
): projectMetadata is {
  name: string;
  sourceRoot: string;
} {
  if (typeof projectMetadata !== "object" || projectMetadata === null) {
    return false;
  }

  const projectMetadataRecord = projectMetadata as {
    name?: unknown;
    sourceRoot?: unknown;
  };

  return (
    typeof projectMetadataRecord.name === "string" &&
    typeof projectMetadataRecord.sourceRoot === "string"
  );
}

/**
 * Normalizes a discovered project path to a workspace-relative value.
 */
function normalizeProjectPath(projectPath: string): string {
  const normalizedPath = path.normalize(projectPath).replaceAll("\\", "/");

  if (normalizedPath === ".") {
    return ".";
  }

  return normalizedPath.startsWith("./")
    ? normalizedPath.slice(2)
    : normalizedPath;
}

/**
 * Reads and parses project metadata from a project.json file.
 */
function readProjectMetadata(projectMetadataPath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(projectMetadataPath, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}
