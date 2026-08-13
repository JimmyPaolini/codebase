import fs from "node:fs";
import path from "node:path";

import { DiscoveryService } from "@jimmypaolini/conformetry-configuration";
import { ErrorsService } from "@jimmypaolini/conformetry-core";
import { Injectable } from "@nestjs/common";

import type { CheckInstanceFilesArguments } from "./files.types";
import type {
  ConformanceError,
  ValidationFileResult,
} from "@jimmypaolini/conformetry-core";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Checks that every file a project's template declares actually exists.
 *
 * This runs before any language validator, and is the only check that covers
 * *every* template file regardless of extension. A language validator only
 * sees documents whose extension it claims, so files such as `.gitignore`,
 * `.env.default`, and `pyproject.toml` were previously never checked at all —
 * a project could delete them and still validate clean.
 */
@Injectable()
/* v8 ignore stop */
export class FilesService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly errorsService: ErrorsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Reports a path as a missing directory when the template entry lives under
   * a directory that does not exist, and as a missing file otherwise.
   *
   * Reporting the absent directory once is more useful than reporting each of
   * the twenty files inside it.
   */
  private buildMissingError(args: {
    instanceFilePath: string;
    templateFilePath: string;
  }): ConformanceError {
    const parentDirectoryPath = path.dirname(args.instanceFilePath);

    if (fs.existsSync(parentDirectoryPath)) {
      return this.errorsService.buildMissingFileError(args);
    }

    return this.errorsService.buildMissingDirectoryError({
      instanceDirectoryPath: parentDirectoryPath,
      templateDirectoryPath: path.dirname(args.templateFilePath),
    });
  }

  /**
   * Reports every file a matched instance's template requires but the instance
   * lacks.
   *
   * Missing directories are collapsed to one finding each, so deleting a whole
   * module reports the directory rather than each file within it.
   */
  public checkInstanceFiles(
    args: CheckInstanceFilesArguments,
  ): ValidationFileResult[] {
    const expectedFiles = this.discoveryService.resolveInstanceFiles(
      args.instances,
    );
    const reportedDirectories = new Set<string>();
    const fileResults: ValidationFileResult[] = [];

    for (const expectedFile of expectedFiles) {
      if (fs.existsSync(expectedFile.instanceFilePath)) {
        continue;
      }

      const parentDirectoryPath = path.dirname(expectedFile.instanceFilePath);

      if (reportedDirectories.has(parentDirectoryPath)) {
        continue;
      }

      const error = this.buildMissingError(expectedFile);

      if (error.errorType === "directory") {
        reportedDirectories.add(parentDirectoryPath);
      }

      fileResults.push({
        errors: [error],
        filename: path.basename(expectedFile.instanceFilePath),
        instanceFilePath: expectedFile.instanceFilePath,
        templateFilePath: expectedFile.templateFilePath,
      });
    }

    return fileResults;
  }
}
