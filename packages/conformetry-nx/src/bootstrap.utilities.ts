// 🛠️ Utilities

import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  DEFAULT_OUTPUT_PATH,
  DEFAULT_PACKAGE_NAME,
} from "./modules/generator/generator.constants";
import { DEFAULT_CONFIGURATION_PATH } from "./modules/options/options.constants";
import { resolveGeneratorService } from "./plugin-context.utilities";

import type { EmittedFile } from "./modules/generator/generator.types";

/**
 * Emits the generator plugin and puts it where Nx will find it.
 *
 * Run from a `postinstall`, which is what makes the emitted plugin a build
 * artifact rather than a committed one. `GeneratorService.emitPlugin` is called
 * directly rather than through `nx sync`, which builds the whole project graph
 * before it emits anything — too slow to pay for on every install, and it would
 * fail the install itself whenever any project in the workspace momentarily
 * fails to load.
 */
export async function bootstrapPlugin(
  workspaceRoot: string,
): Promise<EmittedFile[]> {
  const generatorService = await resolveGeneratorService();
  const files = await generatorService.emitPlugin({
    configurationPath: DEFAULT_CONFIGURATION_PATH,
    outputPath: DEFAULT_OUTPUT_PATH,
    packageName: DEFAULT_PACKAGE_NAME,
  });

  writePlugin({ files, workspaceRoot });
  linkPlugin(workspaceRoot);

  return files;
}

/**
 * Bootstraps the plugin, warning rather than failing the install.
 *
 * A `postinstall` that exits non-zero fails `pnpm install` itself, which would
 * leave an unrelated dependency change uninstallable for as long as the
 * conformetry configuration is mid-edit. Nothing is lost by warning: every
 * conformetry command re-checks the emitted plugin against the configuration
 * and refuses to run against a stale one.
 */
export async function runBootstrapCli(workspaceRoot: string): Promise<void> {
  try {
    const files = await bootstrapPlugin(workspaceRoot);

    console.info(
      `Emitted ${files.length} files of the conformetry generator plugin to ${DEFAULT_OUTPUT_PATH}.`,
    );
  } catch (error) {
    console.warn(
      `Could not emit the conformetry generator plugin from ${DEFAULT_CONFIGURATION_PATH}:`,
    );
    console.warn(error instanceof Error ? error.message : error);
  }
}

/**
 * Links the emitted plugin into the workspace's root `node_modules`.
 *
 * Nx resolves `nx g <package>:<generator>` by requiring the package by name,
 * and the emitted directory is gitignored, so it is invisible to project
 * discovery — the link is the only thing that makes the generators
 * addressable. The package manager will not create it: pnpm links a workspace
 * package into the root only when the root manifest depends on it, and a
 * `workspace:*` dependency on a package that has not been emitted yet fails
 * `pnpm install` outright on a fresh clone.
 */
function linkPlugin(workspaceRoot: string): void {
  const linkPath = path.resolve(
    workspaceRoot,
    "node_modules",
    DEFAULT_PACKAGE_NAME,
  );

  mkdirSync(path.dirname(linkPath), { recursive: true });
  // `rmSync` on a symlink removes the link, never what it points at, so a
  // re-run replaces the link rather than writing through into the emitted
  // directory.
  rmSync(linkPath, { force: true, recursive: true });
  symlinkSync(
    path.relative(
      path.dirname(linkPath),
      path.resolve(workspaceRoot, DEFAULT_OUTPUT_PATH),
    ),
    linkPath,
    "dir",
  );
}

/**
 * Writes the emitted files, replacing whatever the last emit left behind.
 *
 * `src` is cleared rather than overwritten so that dropping a generator from
 * the configuration drops its schema too — the drift check compares the files
 * that should exist against disk, and would never notice one that should not.
 */
function writePlugin(args: {
  files: EmittedFile[];
  workspaceRoot: string;
}): void {
  rmSync(path.resolve(args.workspaceRoot, DEFAULT_OUTPUT_PATH, "src"), {
    force: true,
    recursive: true,
  });

  for (const file of args.files) {
    const absolutePath = path.resolve(args.workspaceRoot, file.filePath);

    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, file.content, "utf8");
  }
}
