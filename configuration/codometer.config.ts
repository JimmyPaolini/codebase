import { existsSync } from "node:fs";
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

/** Manifest whose presence is what makes a directory a project. */
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
 * Whether a directory holds a project at all.
 *
 * A folder carrying no manifest is no project, so it gets no target rather
 * than one over a build nobody emits. A project that has not been built yet
 * and a folder that was never going to have a build must not read alike: the
 * first is an empty target, which is what the empty-match rule exists to
 * report on.
 */
const holdsProject = (directory: string): boolean =>
  existsSync(path.join(directory, MANIFEST_FILE));

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
 * What a project inherits before it declares anything of its own.
 *
 * Build output mirrors a project's own path under the workspace directory, so
 * the compiled target is derived rather than written out: a project's
 * configuration file never restates where that project sits. Written once
 * here, every project starts from it.
 */
const buildProjectConfiguration = (
  context: CodometerConfigurationContext,
  workspaceDirectory: string,
): CodometerConfiguration => {
  const projectPath = toConfiguredPath(
    path.relative(workspaceDirectory, context.directory),
  );

  return {
    ...sharedConfiguration,
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
 * What codometer measures for anything that is not a project of its own.
 *
 * Every project carries a `codometer.config.ts` calling `defineProject`, and
 * codometer takes the first file it finds walking upward, so this default
 * answers for the two things no project file covers: the workspace directory
 * itself, measured as one repository with no target and no glob, and any
 * folder that is not a project at all — `configuration/`, `scripts/` — which
 * gets the conventions and nothing else.
 *
 * A project is still handled here as a fallback rather than an error, so a
 * newly generated project measures sensibly before anyone writes its file.
 * What it cannot do is gate one: limits live in the project files now, which
 * is the point of the split. A project whose file is missing is measured and
 * reported like the rest and gated by nothing.
 *
 * @see [`packages/codometer-examples/README.md`](../packages/codometer-examples/README.md)
 * for the guided tour, and
 * [`packages/codometer-examples/AGENTS.md`](../packages/codometer-examples/AGENTS.md)
 * for the message-to-example lookup table.
 */
// 🧬 Inheritance

/**
 * What a project's own configuration file may declare on top of the defaults.
 *
 * Everything a configuration can hold. A field written here replaces the
 * inherited one rather than merging into it, which is what a project declaring
 * its own `targets` — several bundles instead of one compiled tree — needs.
 * Every field left out is inherited, so a project gating a size says only that.
 */
export type CodometerProjectOptions = CodometerConfiguration;

/**
 * Builds one project's configuration from the shared defaults and its overrides.
 *
 * This is what every project's `codometer.config.ts` calls, and the reason
 * those files are three lines rather than a restatement of the conventions.
 * A project declaring nothing is measured exactly as the defaults describe.
 *
 * Returned as a factory rather than a plain object so a project file never has
 * to say where it sits: the compiled target is still derived from the
 * directory codometer was pointed at, and `defineProject` is the only thing
 * that has to know how. That also means these files stay correct when a
 * project moves.
 *
 * Overriding is deliberately a replacement and not a merge. Codometer already
 * refuses to fold a distant configuration file into a nearer one, on the
 * grounds that a limit which never applied must not read like one that did —
 * and the same argument applies a second time here, between the defaults and
 * the project overriding them.
 */
export const defineProject =
  (options: CodometerProjectOptions = {}): CodometerConfigurationFactory =>
  (context) => ({
    ...buildProjectConfiguration(
      context,
      findWorkspaceDirectory(context.configurationDirectory),
    ),
    ...options,
  });

const codometerConfiguration: CodometerConfigurationFactory = (context) => {
  const workspaceDirectory = findWorkspaceDirectory(
    context.configurationDirectory,
  );

  if (context.directory === workspaceDirectory) {
    return buildWorkspaceConfiguration();
  }

  return holdsProject(context.directory)
    ? buildProjectConfiguration(context, workspaceDirectory)
    : { ...sharedConfiguration };
};

export default codometerConfiguration;
