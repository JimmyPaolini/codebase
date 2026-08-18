import fs from "node:fs";
import path from "node:path";

/**
 * Dependency sections validated by the workspace catalog policy.
 */
type DependencySectionName =
  | "dependencies"
  | "devDependencies"
  | "optionalDependencies"
  | "peerDependencies";

/**
 * Supported dependency sections from a package.json manifest.
 */
interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const dependencySectionNames: DependencySectionName[] = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

const workspaceScopes = ["applications", "packages", "tools"];

/**
 * Determines whether a dependency name is a local workspace package.
 */
function isInternalWorkspaceDependency(dependencyName: string): boolean {
  return (
    dependencyName.startsWith("@callidescope/") ||
    dependencyName.startsWith("@codebase/") ||
    dependencyName.startsWith("@codometer/") ||
    dependencyName.startsWith("@conformetry/") ||
    dependencyName.startsWith("@jimmypaolini/")
  );
}

/**
 * Validates all workspace manifests and exits with non-zero on violations.
 */
function main(): void {
  const workspaceRoot = process.cwd();
  const manifestPaths = resolveWorkspaceManifestPaths(workspaceRoot);
  const allViolations: string[] = [];

  for (const manifestPath of manifestPaths) {
    const manifest = readJsonFile(manifestPath);
    const manifestViolations = validateManifestDependencies(
      manifestPath,
      manifest,
    );

    allViolations.push(...manifestViolations);
  }

  if (allViolations.length === 0) {
    console.log(
      `Catalog policy passed for ${manifestPaths.length} workspace manifests.`,
    );

    return;
  }

  console.error("Catalog policy violations found:");

  for (const violation of allViolations) {
    console.error(`- ${violation}`);
  }

  process.exit(1);
}

/**
 * Reads and parses a JSON manifest file.
 */
function readJsonFile(filePath: string): PackageManifest {
  const fileContent = fs.readFileSync(filePath, "utf8");

  return JSON.parse(fileContent) as PackageManifest;
}

/**
 * Finds every workspace package.json targeted by the catalog policy.
 */
function resolveWorkspaceManifestPaths(workspaceRoot: string): string[] {
  const manifestPaths = [path.join(workspaceRoot, "package.json")];

  for (const workspaceScope of workspaceScopes) {
    const scopePath = path.join(workspaceRoot, workspaceScope);

    if (!fs.existsSync(scopePath)) {
      continue;
    }

    const scopeChildren = fs.readdirSync(scopePath, {
      withFileTypes: true,
    });

    for (const scopeChild of scopeChildren) {
      if (!scopeChild.isDirectory()) {
        continue;
      }

      const packageManifestPath = path.join(
        scopePath,
        scopeChild.name,
        "package.json",
      );

      if (fs.existsSync(packageManifestPath)) {
        manifestPaths.push(packageManifestPath);
      }
    }
  }

  return manifestPaths;
}

/**
 * Ensures dependencies use workspace:* for internal packages and catalog: for external packages.
 */
function validateManifestDependencies(
  manifestPath: string,
  manifest: PackageManifest,
): string[] {
  const violations: string[] = [];
  const relativeManifestPath = path.relative(process.cwd(), manifestPath);

  for (const dependencySectionName of dependencySectionNames) {
    const dependencies = manifest[dependencySectionName] ?? {};

    for (const [dependencyName, dependencyVersion] of Object.entries(
      dependencies,
    )) {
      if (isInternalWorkspaceDependency(dependencyName)) {
        if (!dependencyVersion.startsWith("workspace:")) {
          violations.push(
            `${relativeManifestPath} -> ${dependencySectionName}.${dependencyName} must use workspace:* (found ${dependencyVersion})`,
          );
        }

        continue;
      }

      if (dependencyVersion !== "catalog:") {
        violations.push(
          `${relativeManifestPath} -> ${dependencySectionName}.${dependencyName} must use catalog: (found ${dependencyVersion})`,
        );
      }
    }
  }

  return violations;
}

main();
