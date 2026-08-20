import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  type CodometerConfiguration,
  type CodometerConfigurationContext,
  type CodometerConfigurationFactory,
} from "@codometer/configuration";

// ♟️ Conventions

/** File whose presence marks the directory every project path is written from. */
const WORKSPACE_MARKER = "pnpm-workspace.yaml";

/** Directory every project's build output is emitted beneath. */
const BUILD_DIRECTORY = "dist";

/** Manifest each project declares its own limit in, beside `typeCoverage`. */
const MANIFEST_FILE = "package.json";

/**
 * Name of the target holding a project's compiled JavaScript.
 *
 * Written out rather than derived: the pull request report joins each measured
 * target against the same target measured on the base branch, and the name is
 * the join key.
 */
const COMPILED_TARGET_NAME = "Compiled JavaScript";

/** Path separator every glob and every configured path is written with. */
const PATH_SEPARATOR = "/";

// 🔧 Helpers

/** Rewrites a path in the separator globs and configured paths are written with. */
const toConfiguredPath = (systemPath: string): string =>
  systemPath.split(path.sep).join(PATH_SEPARATOR);

/**
 * Walks upward from a directory looking for the one every path starts at.
 *
 * The workspace file is what marks it, so nothing here has to be told where
 * the repository was checked out — a worktree, a container, and a contributor's
 * laptop all answer the same.
 */
const findWorkspaceDirectory = (searchDirectory: string): string => {
  let candidateDirectory = path.resolve(searchDirectory);

  for (;;) {
    if (existsSync(path.join(candidateDirectory, WORKSPACE_MARKER))) {
      return candidateDirectory;
    }

    const parentDirectory = path.dirname(candidateDirectory);

    if (parentDirectory === candidateDirectory) {
      return path.resolve(searchDirectory);
    }

    candidateDirectory = parentDirectory;
  }
};

/**
 * Reads the limit a project declares for its own compiled JavaScript.
 *
 * It lives in the project's manifest beside `typeCoverage`, which is where
 * every other per-project gate in this repository is written. A project that
 * declares none is measured and reported like the rest, and gated by nothing.
 */
const readDeclaredLimit = (projectDirectory: string): string | undefined => {
  const manifestPath = path.join(projectDirectory, MANIFEST_FILE);

  if (!existsSync(manifestPath)) {
    return undefined;
  }

  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  const declared = (manifest as { sizeLimit?: unknown }).sizeLimit;

  return typeof declared === "string" ? declared : undefined;
};

// 🧱 Shared Configuration

/**
 * What every run of this repository measures the same way, wherever it starts.
 *
 * The file suffixes this repository's project structure enforces. Counting
 * them says what the TypeScript total is actually made of — how much is
 * services, and how much is the tests for them.
 */
const sharedConfiguration = {
  // Python lives in a uv workspace, so the interpreter is reached through uv
  // rather than being on PATH.
  python: { command: "uv run python" },
  statistics: [
    { label: "Module Files", patterns: ["**/*.module.ts"] },
    { label: "Service Files", patterns: ["**/*.service.ts"] },
    { label: "Command Files", patterns: ["**/*.command.ts"] },
    { label: "Constants Files", patterns: ["**/*.constants.ts"] },
    { label: "Types Files", patterns: ["**/*.types.ts"] },
    { label: "Utilities Files", patterns: ["**/*.utilities.ts"] },
    { label: "Errors Files", patterns: ["**/*.errors.ts"] },
    { label: "TypeORM Entities", patterns: ["**/*.entity.ts"] },
    { label: "Unit Tests", patterns: ["**/*.unit.test.ts"] },
    { label: "Integration Tests", patterns: ["**/*.integration.test.ts"] },
    { label: "End To End Tests", patterns: ["**/*.end-to-end.test.ts"] },
    // Not a file-name counter but a symbol one, and rendered beside the
    // built-in TypeScript counters rather than under Conventions. Every
    // service here is an injected singleton, so a static method appearing
    // anywhere is worth seeing in the report.
    {
      color: "166534",
      group: "typescript",
      label: "Static Methods",
      symbols: { kinds: ["method"], modifiers: ["static"] },
    },
  ],
} satisfies CodometerConfiguration;

/**
 * What a run measuring one project measures, derived from where that project is.
 *
 * This is the convention nineteen near-identical per-project configuration
 * files used to each restate: build output mirrors a project's own path under
 * the workspace directory, and the limit on it is declared in that project's
 * manifest. Written once here, it serves every project that follows it without
 * any of them carrying a configuration file at all.
 */
const buildProjectConfiguration = (
  context: CodometerConfigurationContext,
  workspaceDirectory: string,
): CodometerConfiguration => {
  const projectPath = toConfiguredPath(
    path.relative(workspaceDirectory, context.directory),
  );
  const declaredLimit = readDeclaredLimit(context.directory);

  return {
    ...sharedConfiguration,
    limits:
      declaredLimit === undefined
        ? []
        : [{ metric: `${COMPILED_TARGET_NAME}.size`, value: declaredLimit }],
    targets: [
      {
        analyses: ["size"],
        compression: "gzip",
        // Build output sits outside the project being measured, so the target
        // says how to get back out to the directory it is written beneath.
        directory: toConfiguredPath(
          path.relative(context.directory, workspaceDirectory),
        ),
        include: [
          [BUILD_DIRECTORY, projectPath, "**", "*.js"].join(PATH_SEPARATOR),
        ],
        name: COMPILED_TARGET_NAME,
      },
    ],
  };
};

/**
 * What a run measuring the whole repository measures.
 *
 * No target of its own: the repository is the one thing measured without a
 * glob, and its build output belongs to the projects that emit it.
 */
const buildWorkspaceConfiguration = (): CodometerConfiguration => ({
  ...sharedConfiguration,
  // What this repository does not measure lives in an ignore file, the way
  // every other tool here keeps its exclusions. Files `.gitignore` covers are
  // already absent — discovery reads those files itself — so the ignore file
  // only has to name what is committed but generated.
  excludeFrom: ["configuration/.codometerignore"],
  output: {
    markdown: {
      description:
        "Repository statistics measured by [codometer](packages/codometer-cli), regenerated by `nx run codebase:codometer`.",
      path: "README.md",
    },
  },
});

/**
 * Everything codometer needs to know about this repository in particular.
 *
 * Authored as a function rather than an object because one configuration file
 * serves every folder in the workspace: run in the workspace directory it
 * describes the repository, and run in a project it describes that project,
 * derived from where the project sits rather than from anything codometer
 * knows. The measurement itself lives in `@codometer/cli` and knows nothing
 * about this workspace.
 *
 * A project whose targets are not derivable this way — one emitting several
 * bundles, or declaring its limit inline — carries a configuration file of its
 * own, which fully replaces this one for that folder.
 */
const codometerConfiguration: CodometerConfigurationFactory = (context) => {
  const workspaceDirectory = findWorkspaceDirectory(
    context.configurationDirectory,
  );

  return context.directory === workspaceDirectory
    ? buildWorkspaceConfiguration()
    : buildProjectConfiguration(context, workspaceDirectory);
};

export default codometerConfiguration;
