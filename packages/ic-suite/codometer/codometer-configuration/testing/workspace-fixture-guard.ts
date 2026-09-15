import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

/**
 * Raised when a test would make `jiti` evaluate this workspace's own source.
 *
 * `jiti` evaluates a configuration file in a module registry of its own, and
 * because these packages' `main` points at TypeScript source rather than
 * `dist`, every workspace package that file reaches gets its whole source
 * graph evaluated a second time. V8 then records two coverage entries per file
 * and merge order decides, per file, which hit counts survive — so the
 * package's coverage drifts between identical runs, whole files lose their
 * branches, and functions that provably ran are reported with zero hits.
 * Nothing errors.
 *
 * Diagnosing that from the symptoms cost about 114 tool calls and a wrong
 * "unfixable `@vitest/coverage-v8` defect" verdict the first time, which is
 * why the fixture is forbidden outright rather than merely documented.
 */
export class WorkspaceFixtureError extends Error {
  constructor(reason: string) {
    super(
      `${reason}\n` +
        "That re-evaluates this workspace's TypeScript sources in a second module registry, which silently corrupts this package's v8 coverage. " +
        "Write the fixture into a temporary directory and keep its imports there too — JSON where the test does not need a TypeScript configuration, so nothing invokes jiti at all.",
    );
    this.name = "WorkspaceFixtureError";
  }
}

/**
 * Finds the workspace root by walking up from this file.
 *
 * `pnpm-workspace.yaml` rather than `.git`, so the search stops at the
 * workspace a worktree checked out rather than at a temporary fixture that
 * happens to carry a `.git` directory.
 */
function findWorkspaceRoot(): string | undefined {
  let candidateDirectory = import.meta.dirname;

  for (;;) {
    if (existsSync(path.join(candidateDirectory, "pnpm-workspace.yaml"))) {
      return candidateDirectory;
    }

    const parentDirectory = path.dirname(candidateDirectory);

    if (parentDirectory === candidateDirectory) {
      return undefined;
    }

    candidateDirectory = parentDirectory;
  }
}

const workspaceRoot = findWorkspaceRoot();

/** Whether a resolved path lies inside the workspace. */
function isInsideWorkspace(candidatePath: string): boolean {
  if (workspaceRoot === undefined) {
    return false;
  }

  const relativePath = path.relative(workspaceRoot, candidatePath);

  return (
    relativePath !== "" &&
    !relativePath.startsWith("..") &&
    !path.isAbsolute(relativePath)
  );
}

/**
 * Every specifier a module source imports, however it spells the import.
 *
 * Read off the text rather than from a parse, because the guard has to run
 * before the file is handed to anything that could evaluate it — which is the
 * whole point — and a specifier is a string literal in every form an import
 * takes.
 */
const IMPORT_SPECIFIER_PATTERN =
  /(?:\bfrom|\bimport|\brequire)\s*\(?\s*["'`]([^"'`]+)["'`]/g;

/**
 * Throws when a configuration a test is loading would evaluate workspace
 * source — because the file itself lives here, or because it imports something
 * that does.
 *
 * A path outside the workspace importing nothing from it — the temporary
 * fixture every test here builds — is left alone, as is any path at all when
 * the workspace root cannot be found, because a guard that cannot tell where
 * it is has nothing to judge.
 */
export function assertFixtureIsOutsideWorkspace(
  configurationPath: string,
): void {
  if (workspaceRoot === undefined) {
    return;
  }

  const resolvedPath = path.resolve(configurationPath);

  if (isInsideWorkspace(resolvedPath)) {
    throw new WorkspaceFixtureError(
      `A test asked jiti to evaluate a configuration file inside this workspace: ${configurationPath}`,
    );
  }

  if (existsSync(resolvedPath)) {
    assertFixtureImportsNothingInWorkspace(resolvedPath);
  }
}

/** Throws when a fixture's own source reaches back into the workspace. */
function assertFixtureImportsNothingInWorkspace(
  configurationPath: string,
): void {
  const source = readFileSync(configurationPath, "utf8");

  for (const match of source.matchAll(IMPORT_SPECIFIER_PATTERN)) {
    const specifier = match[1];

    if (specifier === undefined) {
      continue;
    }

    const isRelative = specifier.startsWith(".") || path.isAbsolute(specifier);
    const reaches = isRelative
      ? isInsideWorkspace(
          path.resolve(path.dirname(configurationPath), specifier),
        )
      : isWorkspacePackage(specifier);

    if (reaches) {
      throw new WorkspaceFixtureError(
        `A test asked jiti to evaluate ${configurationPath}, which imports "${specifier}" from inside this workspace.`,
      );
    }
  }
}

/**
 * Whether a bare specifier names a package this workspace publishes.
 *
 * Asked of the installed link rather than of a list of package names, because
 * that is what the import would actually resolve to: a workspace package is a
 * symlink into the repository, while a real dependency's realpath stays inside
 * a store.
 */
function isWorkspacePackage(specifier: string): boolean {
  if (workspaceRoot === undefined || specifier.startsWith("node:")) {
    return false;
  }

  const linkPath = path.join(
    workspaceRoot,
    "node_modules",
    readPackageName(specifier),
  );

  if (!existsSync(linkPath)) {
    return false;
  }

  return isInsideWorkspace(realpathSync(linkPath));
}

/** The package a bare specifier names, scope included. */
function readPackageName(specifier: string): string {
  const segments = specifier.split("/");

  return specifier.startsWith("@")
    ? segments.slice(0, 2).join("/")
    : (segments[0] ?? specifier);
}
