import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  EXCLUDE_PATHS,
  JS_EXTENSIONS,
  TEST_FILE_REGEX,
  TS_EXTENSIONS,
} from "./discover-files.constants";

import type { DiscoverFilesResult } from "./discover-files.types";

/** Discovers and categorizes git-tracked files within a codebase directory. */
@Injectable()
export class DiscoverFilesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🌎 Public Methods

  /** Returns categorized file path lists for the given codebase root. */
  discoverFiles(workingDirectory: string): DiscoverFilesResult {
    const allExtensions = new Set([...TS_EXTENSIONS, ...JS_EXTENSIONS]);

    const trackedFiles = execSync("git ls-files", { cwd: workingDirectory })
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((filePath) => existsSync(filePath))
      .filter(
        (filePath) =>
          !EXCLUDE_PATHS.some((excluded) => filePath.includes(excluded)),
      );

    const sourceFiles = trackedFiles.filter((filePath) =>
      allExtensions.has(path.extname(filePath)),
    );

    return {
      jsFiles: sourceFiles.filter((filePath) =>
        JS_EXTENSIONS.has(path.extname(filePath)),
      ),
      pyFiles: trackedFiles.filter(
        (filePath) => path.extname(filePath) === ".py",
      ),
      sourceFiles,
      testFiles: sourceFiles.filter((filePath) =>
        TEST_FILE_REGEX.test(filePath),
      ),
      trackedFiles,
      tsFiles: sourceFiles.filter((filePath) =>
        TS_EXTENSIONS.has(path.extname(filePath)),
      ),
    };
  }
}
