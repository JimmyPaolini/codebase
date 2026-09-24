import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const workspaceRoot = path.resolve(packageRoot, "..", "..", "..", "..");

const tarballsDirectory = path.resolve(workspaceRoot, "dist", "tarballs");

/** Options for asserting a package tarball installs and typechecks cleanly. */
export interface AssertTarballOptions {
  /** Optional custom consumer source code to typecheck against the package. */
  readonly consumerSource?: string;
  /** The npm package name, e.g. `@conformetry/validation`. */
  readonly packageName: string;
  /** The tarball base name without version or extension, e.g. `conformetry-validation`. */
  readonly tarballName: string;
}

/**
 * Asserts that a package installs from its tarball and its types typecheck cleanly
 * under modern module resolution without workspace resolution.
 *
 * @param options - Package identification and configuration options.
 */
export function assertTarballTypechecks(options: AssertTarballOptions): void {
  const { consumerSource, packageName, tarballName } = options;

  const tarballPath = ensureTarball(tarballName);

  const scratchDirectory = path.resolve(
    packageRoot,
    "tmp",
    `tarball-test-${String(Date.now())}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(scratchDirectory, { recursive: true });

  try {
    const nodeModulesDir = path.resolve(scratchDirectory, "node_modules");
    mkdirSync(nodeModulesDir, { recursive: true });

    unpackDependencies(nodeModulesDir);

    const targetModuleDir = path.resolve(nodeModulesDir, packageName);
    mkdirSync(targetModuleDir, { recursive: true });

    execFileSync(
      "tar",
      ["-xzf", tarballPath, "-C", targetModuleDir, "--strip-components=1"],
      { stdio: "pipe" },
    );

    const manifestPath = path.resolve(targetModuleDir, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
      string,
      unknown
    >;

    if (manifest["name"] !== packageName) {
      throw new Error(
        `Expected manifest name "${packageName}", got "${String(manifest["name"])}"`,
      );
    }

    const consumerPath = path.resolve(scratchDirectory, "consumer.ts");
    const defaultSource = `import * as packageModule from "${packageName}";\nexport { packageModule };\n`;
    writeFileSync(consumerPath, consumerSource ?? defaultSource, "utf8");

    const compilerOptions: ts.CompilerOptions = {
      emitDecoratorMetadata: true,
      experimentalDecorators: true,
      ignoreDeprecations: "6.0",
      lib: ["lib.es2023.d.ts", "lib.dom.d.ts"],
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2023,
      types: ["node"],
    };

    const program = ts.createProgram([consumerPath], compilerOptions);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    const errors = diagnostics.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    );

    if (errors.length > 0) {
      const messages = errors
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        )
        .join("\n");
      throw new Error(
        `TypeScript diagnostics failed for ${packageName} from tarball:\n${messages}`,
      );
    }
  } finally {
    rmSync(scratchDirectory, { force: true, recursive: true });
  }
}

/**
 * Ensures the tarball for a package exists, packing the publish set if necessary.
 *
 * @param tarballName - Base name of the tarball.
 * @returns Absolute path to the packed tarball file.
 */
export function ensureTarball(tarballName: string): string {
  const tarballPath = path.resolve(
    tarballsDirectory,
    `${tarballName}-0.0.1.tgz`,
  );

  if (!existsSync(tarballPath)) {
    execFileSync(
      "node",
      [
        "--import",
        "@swc-node/register/esm-register",
        path.resolve(workspaceRoot, "scripts", "pack-publish-set.ts"),
      ],
      {
        cwd: workspaceRoot,
        stdio: "pipe",
      },
    );
  }

  if (!existsSync(tarballPath)) {
    throw new Error(`Tarball not found at ${tarballPath}`);
  }

  return tarballPath;
}

/**
 * Unpacks all available publish-set tarballs into a target node_modules directory.
 *
 * @param nodeModulesDir - The target node_modules directory.
 */
export function unpackDependencies(nodeModulesDir: string): void {
  if (!existsSync(tarballsDirectory)) {
    return;
  }

  const tarballFiles = readdirSync(tarballsDirectory).filter((file) =>
    file.endsWith(".tgz"),
  );

  for (const file of tarballFiles) {
    const rawName = file.replace(/-0\.0\.1\.tgz$/, "");
    const slashIndex = rawName.indexOf("-");
    const scope = rawName.slice(0, slashIndex);
    const unscopedPackageName = rawName.slice(slashIndex + 1);
    const scopedName = `@${scope}/${unscopedPackageName}`;

    const targetDir = path.resolve(nodeModulesDir, scopedName);
    mkdirSync(targetDir, { recursive: true });

    execFileSync(
      "tar",
      [
        "-xzf",
        path.resolve(tarballsDirectory, file),
        "-C",
        targetDir,
        "--strip-components=1",
      ],
      { stdio: "pipe" },
    );
  }
}
