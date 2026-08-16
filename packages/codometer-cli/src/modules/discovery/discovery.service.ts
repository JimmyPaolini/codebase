import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  JS_EXTENSIONS,
  JSON_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  NOTEBOOK_EXTENSIONS,
  TEST_FILE_REGEX,
  TS_EXTENSIONS,
} from "./discovery.constants";

import type {
  DiscoverFilesArguments,
  DiscoveryResult,
} from "./discovery.types";

/** Discovers and categorizes git-tracked files within a codebase directory. */
@Injectable()
export class DiscoveryService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether any exclusion glob claims the given repository-relative path.
   *
   * Matched with `path.matchesGlob` rather than by substring, so a glob naming
   * a `dist` directory removes build output and leaves a `redistribute`
   * directory alone.
   */
  private isExcluded(filePath: string, exclude: string[]): boolean {
    return exclude.some((pattern) => path.matchesGlob(filePath, pattern));
  }

  /** Lists the files git tracks in the given directory. */
  private listTrackedFiles(args: DiscoverFilesArguments): string[] {
    return execSync("git ls-files", { cwd: args.workingDirectory })
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((filePath) =>
        existsSync(path.resolve(args.workingDirectory, filePath)),
      )
      .filter((filePath) => !this.isExcluded(filePath, args.exclude));
  }

  // 🌎 Public Methods

  /** Returns categorized file path lists for the given codebase root. */
  discoverFiles(args: DiscoverFilesArguments): DiscoveryResult {
    const allExtensions = new Set([...TS_EXTENSIONS, ...JS_EXTENSIONS]);
    const trackedFiles = this.listTrackedFiles(args);
    const sourceFiles = trackedFiles.filter((filePath) =>
      allExtensions.has(path.extname(filePath)),
    );

    return {
      jsFiles: sourceFiles.filter((filePath) =>
        JS_EXTENSIONS.has(path.extname(filePath)),
      ),
      jsonFiles: trackedFiles.filter((filePath) =>
        JSON_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
      ),
      markdownFiles: trackedFiles.filter((filePath) =>
        MARKDOWN_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
      ),
      notebookFiles: trackedFiles.filter((filePath) =>
        NOTEBOOK_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
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
