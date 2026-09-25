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

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { TARBALLS_DIRECTORY_MISSING_MESSAGE } from "./publish-set.constants";

import type {
  PublishSetPackage,
  PublishSetVerificationResult,
} from "./publish-set.types";

/**
 * Service that verifies publish set tarballs and CLI binaries.
 */
@Injectable()
export class PublishSetService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(PublishSetService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Creates scratch and node_modules directories for tarball verification.
   */
  private createScratchDirectories(workspaceRoot: string): {
    nodeModulesDirectory: string;
    scratchDirectory: string;
  } {
    const scratchDirectory = path.resolve(
      workspaceRoot,
      "tmp",
      `publish-set-verify-${Date.now()}`,
    );
    const nodeModulesDirectory = path.resolve(scratchDirectory, "node_modules");

    mkdirSync(nodeModulesDirectory, { recursive: true });

    return { nodeModulesDirectory, scratchDirectory };
  }

  /**
   * Spawns the CLI binary and returns error message if execution fails.
   */
  private executeSpawnedBinary(
    binaryName: string,
    binPath: string,
    packageRoot: string,
  ): null | string {
    const tsconfigPath = path.resolve(packageRoot, "tsconfig.json");

    const result = spawnSync(
      process.execPath,
      ["--import", "@swc-node/register/esm-register", binPath, "--help"],
      {
        cwd: packageRoot,
        encoding: "utf8",
        // eslint-disable-next-line unicorn/prevent-abbreviations
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          SWC_NODE_PROJECT: tsconfigPath,
        },
        timeout: 30_000,
      },
    );

    if (result.status !== 0) {
      return `CLI binary ${binaryName} for ${binaryName} failed with exit code ${String(result.status)}: ${result.stderr}`;
    }

    return null;
  }

  /**
   * Inspects a child directory and parses a PublishSetPackage if publishable.
   */
  private parsePackageCandidate(
    familyDirectory: string,
    childName: string,
  ): null | PublishSetPackage {
    const packageDirectory = path.resolve(familyDirectory, childName);
    const manifestPath = path.resolve(packageDirectory, "package.json");
    const projectPath = path.resolve(packageDirectory, "project.json");

    if (!existsSync(manifestPath) || !existsSync(projectPath)) {
      return null;
    }

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      readonly bin?: Record<string, string> | string;
      readonly name: string;
      readonly publishConfig?: unknown;
    };

    if (!manifest.publishConfig) {
      return null;
    }

    const project = JSON.parse(readFileSync(projectPath, "utf8")) as {
      readonly name: string;
    };

    let binaryName: string | undefined;
    if (manifest.bin && childName.endsWith("-cli")) {
      binaryName =
        typeof manifest.bin === "string"
          ? childName
          : Object.keys(manifest.bin)[0];
    }

    if (binaryName) {
      return {
        binary: binaryName,
        name: manifest.name,
        tarball: project.name,
      };
    }

    return {
      name: manifest.name,
      tarball: project.name,
    };
  }

  /**
   * Reads the relative bin script path from a package manifest.
   */
  private readPackageManifestBin(
    targetDirectory: string,
    binaryName: string,
  ): string {
    const manifestPath = path.resolve(targetDirectory, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      readonly bin?: Record<string, string> | string;
    };
    const binField = manifest.bin;

    if (typeof binField === "string") {
      return binField;
    }

    return binField?.[binaryName] ?? "";
  }

  /**
   * Resolves publishable packages under a single toolchain family directory.
   */
  private resolveFamilyPackages(familyDirectory: string): PublishSetPackage[] {
    const packages: PublishSetPackage[] = [];
    const children = readdirSync(familyDirectory, { withFileTypes: true });

    for (const child of children) {
      if (!child.isDirectory()) {
        continue;
      }

      const item = this.parsePackageCandidate(familyDirectory, child.name);
      if (item) {
        packages.push(item);
      }
    }

    return packages;
  }

  /**
   * Unpacks a CLI package tarball into a target directory.
   */
  private unpackCliTarball(
    targetDirectory: string,
    tarballsDirectory: string,
    tarballName: string,
  ): void {
    mkdirSync(targetDirectory, { recursive: true });

    const tarballPath = path.resolve(
      tarballsDirectory,
      `${tarballName}-0.0.1.tgz`,
    );

    execFileSync(
      "tar",
      ["-xzf", tarballPath, "-C", targetDirectory, "--strip-components=1"],
      { stdio: "pipe" },
    );
  }

  /**
   * Unpacks all tarballs in `dist/tarballs` into a target node_modules directory.
   */
  private unpackTarballs(
    nodeModulesDirectory: string,
    tarballsDirectory: string,
  ): void {
    const tarballFiles = readdirSync(tarballsDirectory).filter((file) =>
      file.endsWith(".tgz"),
    );

    for (const file of tarballFiles) {
      const rawName = file.replace(/-0\.0\.1\.tgz$/, "");
      const slashIndex = rawName.indexOf("-");
      const scope = rawName.slice(0, slashIndex);
      const unscopedPackageName = rawName.slice(slashIndex + 1);
      const scopedName = `@${scope}/${unscopedPackageName}`;

      const targetDirectory = path.resolve(nodeModulesDirectory, scopedName);
      mkdirSync(targetDirectory, { recursive: true });

      execFileSync(
        "tar",
        [
          "-xzf",
          path.resolve(tarballsDirectory, file),
          "-C",
          targetDirectory,
          "--strip-components=1",
        ],
        { stdio: "pipe" },
      );
    }
  }

  /**
   * Verifies CLI binaries for all packages that define a binary.
   */
  private verifyAllCliBinaries(
    workspaceRoot: string,
    tarballsDirectory: string,
    publishSetPackages: readonly PublishSetPackage[],
  ): string[] {
    const errors: string[] = [];

    for (const item of publishSetPackages) {
      const error = this.verifyCliBinary(
        workspaceRoot,
        tarballsDirectory,
        item,
      );

      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Verifies typechecking for all packages in the publish set.
   */
  private verifyAllTypechecks(
    scratchDirectory: string,
    typescriptCompilerBinary: string,
    publishSetPackages: readonly PublishSetPackage[],
  ): string[] {
    const errors: string[] = [];

    for (const item of publishSetPackages) {
      const error = this.verifyPackageTypecheck(
        scratchDirectory,
        typescriptCompilerBinary,
        item,
      );

      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  /**
   * Executes a CLI binary from its installed tarball with `--help`.
   */
  private verifyCliBinary(
    workspaceRoot: string,
    tarballsDirectory: string,
    publishSetPackage: PublishSetPackage,
  ): null | string {
    const binaryName = publishSetPackage.binary;
    if (!binaryName) {
      return null;
    }

    const nameParts = publishSetPackage.tarball.split("-");
    const family = nameParts[0] ?? "callidescope";
    const packageRoot = path.resolve(
      workspaceRoot,
      "packages",
      "ic-suite",
      family,
      publishSetPackage.tarball,
    );

    const cliScratchDirectory = path.resolve(
      packageRoot,
      "tmp",
      `cli-bin-verify-${Date.now()}`,
    );
    mkdirSync(cliScratchDirectory, { recursive: true });

    try {
      const targetDirectory = path.resolve(cliScratchDirectory, "package");
      this.unpackCliTarball(
        targetDirectory,
        tarballsDirectory,
        publishSetPackage.tarball,
      );

      const binRelative = this.readPackageManifestBin(
        targetDirectory,
        binaryName,
      );
      const binPath = path.resolve(targetDirectory, binRelative);

      return this.executeSpawnedBinary(binaryName, binPath, packageRoot);
    } catch (error) {
      return `Failed to execute CLI binary for ${publishSetPackage.name}: ${String(error)}`;
    } finally {
      rmSync(cliScratchDirectory, { force: true, recursive: true });
    }
  }

  /**
   * Typechecks a single package consumer import against its installed tarball.
   */
  private verifyPackageTypecheck(
    scratchDirectory: string,
    typescriptCompilerBinary: string,
    publishSetPackage: PublishSetPackage,
  ): null | string {
    const consumerPath = path.resolve(
      scratchDirectory,
      `consumer-${publishSetPackage.tarball}.ts`,
    );
    writeFileSync(
      consumerPath,
      `import * as item from "${publishSetPackage.name}";\nexport { item };\n`,
      "utf8",
    );

    const tsconfigPath = path.resolve(
      scratchDirectory,
      `tsconfig-${publishSetPackage.tarball}.json`,
    );
    /* eslint-disable unicorn/prevent-abbreviations */
    writeFileSync(
      tsconfigPath,
      JSON.stringify({
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
        include: [`consumer-${publishSetPackage.tarball}.ts`],
      }),
      "utf8",
    );
    /* eslint-enable unicorn/prevent-abbreviations */

    try {
      execFileSync(
        process.execPath,
        [typescriptCompilerBinary, "--noEmit", "-p", tsconfigPath],
        {
          cwd: scratchDirectory,
          stdio: "pipe",
        },
      );

      return null;
    } catch (error) {
      return `Failed to typecheck ${publishSetPackage.name} from tarball: ${String(error)}`;
    }
  }

  // 🌎 Public Methods

  /**
   * Dynamically resolves all publishable packages in `packages/ic-suite`.
   *
   * @param workspaceRoot - Absolute path to the workspace root directory.
   * @returns Array of publishable packages with names, tarball bases, and CLI binaries.
   */
  public resolvePublishSetPackages(workspaceRoot: string): PublishSetPackage[] {
    const icSuiteDirectory = path.resolve(
      workspaceRoot,
      "packages",
      "ic-suite",
    );

    if (!existsSync(icSuiteDirectory)) {
      return [];
    }

    const packages: PublishSetPackage[] = [];
    const families = readdirSync(icSuiteDirectory, { withFileTypes: true });

    for (const family of families) {
      if (!family.isDirectory()) {
        continue;
      }

      const familyDirectory = path.resolve(icSuiteDirectory, family.name);
      packages.push(...this.resolveFamilyPackages(familyDirectory));
    }

    return packages.toSorted((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  /**
   * Verifies that all publish set tarballs install and typecheck cleanly,
   * and that all CLI binaries execute successfully.
   *
   * @param workspaceRoot - Absolute path to the workspace root directory.
   * @returns Verification result including success status, counts, and error messages.
   */
  public verifyPublishSet(workspaceRoot: string): PublishSetVerificationResult {
    const tarballsDirectory = path.resolve(workspaceRoot, "dist", "tarballs");

    if (!existsSync(tarballsDirectory)) {
      return {
        binaryCount: 0,
        messages: [TARBALLS_DIRECTORY_MISSING_MESSAGE],
        packageCount: 0,
        succeeded: false,
      };
    }

    const publishSetPackages = this.resolvePublishSetPackages(workspaceRoot);
    const binaryCount = publishSetPackages.filter((item) => item.binary).length;
    const typescriptCompilerBinary = path.resolve(
      workspaceRoot,
      "node_modules",
      "typescript-7",
      "bin",
      "tsc",
    );

    const { nodeModulesDirectory, scratchDirectory } =
      this.createScratchDirectories(workspaceRoot);
    const messages: string[] = [];

    try {
      this.unpackTarballs(nodeModulesDirectory, tarballsDirectory);

      const typecheckErrors = this.verifyAllTypechecks(
        scratchDirectory,
        typescriptCompilerBinary,
        publishSetPackages,
      );
      const cliErrors = this.verifyAllCliBinaries(
        workspaceRoot,
        tarballsDirectory,
        publishSetPackages,
      );

      messages.push(...typecheckErrors, ...cliErrors);
    } finally {
      rmSync(scratchDirectory, { force: true, recursive: true });
    }

    return {
      binaryCount,
      messages,
      packageCount: publishSetPackages.length,
      succeeded: messages.length === 0,
    };
  }
}
