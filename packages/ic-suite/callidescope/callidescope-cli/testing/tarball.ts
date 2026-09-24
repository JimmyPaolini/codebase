import { execFileSync, spawnSync } from "node:child_process";
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

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const workspaceRoot = path.resolve(packageRoot, "..", "..", "..", "..");

const tarballsDirectory = path.resolve(workspaceRoot, "dist", "tarballs");

const typescriptCompilerBinary = path.resolve(
  workspaceRoot,
  "node_modules",
  "typescript-7",
  "bin",
  "tsc",
);

/** Options for asserting a command line binary runs from its tarball. */
export interface AssertCommandLineBinaryOptions {
  /** The binary command name, e.g. `callidescope`. */
  readonly binaryName: string;
  /** The tarball base name without version or extension, e.g. `callidescope-cli`. */
  readonly tarballName: string;
}

/** Options for asserting a package tarball installs and typechecks cleanly. */
export interface AssertTarballOptions {
  /** Optional custom consumer source code to typecheck against the package. */
  readonly consumerSource?: string;
  /** The npm package name, e.g. `@callidescope/cli`. */
  readonly packageName: string;
  /** The tarball base name without version or extension, e.g. `callidescope-cli`. */
  readonly tarballName: string;
}

/** Result of executing a command line binary. */
export interface CommandLineBinaryResult {
  /** Standard error and standard output combined. */
  readonly output: string;
  /** Process exit status code. */
  readonly status: null | number;
}

/**
 * Asserts that a command-line binary runs from its packed tarball and returns its execution result.
 *
 * @param options - Binary identification options.
 * @returns The exit status and output from executing the binary.
 */
export function assertCommandLineBinaryRuns(
  options: AssertCommandLineBinaryOptions,
): CommandLineBinaryResult {
  const { binaryName, tarballName } = options;

  const tarballPath = ensureTarball(tarballName);

  const scratchDirectory = path.resolve(
    packageRoot,
    "tmp",
    `cli-bin-test-${String(Date.now())}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(scratchDirectory, { recursive: true });

  try {
    const targetDir = path.resolve(scratchDirectory, "package");
    mkdirSync(targetDir, { recursive: true });

    execFileSync(
      "tar",
      ["-xzf", tarballPath, "-C", targetDir, "--strip-components=1"],
      { stdio: "pipe" },
    );

    const manifestPath = path.resolve(targetDir, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      readonly bin?: Record<string, string> | string;
      readonly name?: string;
    };

    if (!manifest.name) {
      throw new Error("Missing manifest name in tarball package.json");
    }

    const binField = manifest.bin;
    const binRelative =
      typeof binField === "string" ? binField : (binField?.[binaryName] ?? "");

    const binPath = path.resolve(targetDir, binRelative);

    const tsconfigPath = path.resolve(packageRoot, "tsconfig.json");

    const result = spawnSync(
      process.execPath,
      ["--import", "@swc-node/register/esm-register", binPath, "--help"],
      {
        cwd: packageRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          SWC_NODE_PROJECT: tsconfigPath,
        },
        timeout: 30_000,
      },
    );

    return {
      output: `${result.stdout}\n${result.stderr}`,
      status: result.status,
    };
  } finally {
    rmSync(scratchDirectory, { force: true, recursive: true });
  }
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
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      readonly name?: string;
    };

    if (manifest.name !== packageName) {
      throw new Error(
        `Expected manifest name "${packageName}", got "${String(manifest.name)}"`,
      );
    }

    const consumerPath = path.resolve(scratchDirectory, "consumer.ts");
    const defaultSource = `import * as packageModule from "${packageName}";\nexport { packageModule };\n`;
    writeFileSync(consumerPath, consumerSource ?? defaultSource, "utf8");

    const tsconfigPath = path.resolve(scratchDirectory, "tsconfig.json");
    const tsconfigContent = JSON.stringify({
      compilerOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        ignoreDeprecations: "6.0",
        lib: ["ES2023", "DOM"],
        module: "ESNext",
        moduleResolution: "bundler",
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: "ES2023",
        types: ["node"],
      },
      include: ["consumer.ts"],
    });
    writeFileSync(tsconfigPath, tsconfigContent, "utf8");

    execFileSync(
      process.execPath,
      [typescriptCompilerBinary, "--noEmit", "-p", tsconfigPath],
      {
        cwd: scratchDirectory,
        stdio: "pipe",
      },
    );
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
