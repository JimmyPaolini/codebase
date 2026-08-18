import { execFileSync } from "node:child_process";
import { existsSync, lstatSync } from "node:fs";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";

import {
  CSS_EXTENSIONS,
  HCL_EXTENSIONS,
  JS_EXTENSIONS,
  JSON_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  NOTEBOOK_EXTENSIONS,
  SHELL_EXTENSIONS,
  SQL_EXTENSIONS,
  TEST_FILE_REGEX,
  TOML_EXTENSIONS,
  TS_EXTENSIONS,
  YAML_EXTENSIONS,
} from "./file-discovery.constants";

import type {
  DiscoverFilesArguments,
  FileDiscoveryResult,
} from "./file-discovery.types";

/** Discovers and categorizes git-tracked files within a codebase directory. */
@Injectable()
export class FileDiscoveryService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly logger = new Logger(FileDiscoveryService.name);

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Selects the tracked files whose extension belongs to a category. */
  private filterByExtension(
    trackedFiles: string[],
    extensions: Set<string>,
  ): string[] {
    return trackedFiles.filter((filePath) =>
      extensions.has(path.extname(filePath).toLowerCase()),
    );
  }

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

  /**
   * Whether a tracked path is a real file this run should measure.
   *
   * Symlinks are skipped: git tracks them as their own entries, and following
   * one counts its target a second time. `CLAUDE.md` pointing at `AGENTS.md`
   * is not a second document, and reading through the link reported it as one.
   */
  private isMeasurableFile(
    args: DiscoverFilesArguments,
    filePath: string,
  ): boolean {
    const resolvedPath = path.resolve(args.workingDirectory, filePath);

    if (!existsSync(resolvedPath)) {
      return false;
    }

    return !lstatSync(resolvedPath).isSymbolicLink();
  }

  /**
   * Collect the tracked files the configured ignore files exclude.
   *
   * Git does the matching. An ignore file is gitignore syntax — negations,
   * directory patterns, anchoring and all — and `git ls-files --ignored`
   * against it is the only reading of that syntax guaranteed to agree with
   * every other tool the repository points at the same file.
   *
   * Run through `execFileSync` with the arguments as an array, never a command
   * string: the path comes from a configuration file, and a shell would read a
   * quote or a `$(...)` in it as syntax rather than as part of a filename.
   */
  private listIgnoredFiles(args: DiscoverFilesArguments): Set<string> {
    const ignoredFiles = new Set<string>();

    for (const ignoreFilePath of args.excludeFrom) {
      const resolvedPath = path.resolve(args.workingDirectory, ignoreFilePath);

      if (!existsSync(resolvedPath)) {
        this.logger.warn(`🙈 Skipped missing ignore file`, undefined, {
          path: ignoreFilePath,
        });
        continue;
      }

      const output = execFileSync(
        "git",
        ["ls-files", "--cached", "--ignored", `--exclude-from=${resolvedPath}`],
        { cwd: args.workingDirectory },
      );

      for (const filePath of output.toString().trim().split("\n")) {
        if (filePath !== "") {
          ignoredFiles.add(filePath);
        }
      }
    }

    return ignoredFiles;
  }

  /**
   * Lists the files git tracks in the given directory.
   *
   * Enumerating through git is also what enforces `.gitignore`: an ignored
   * file is an untracked file, so it never reaches an analyzer in the first
   * place and no exclusion has to name it.
   */
  private listTrackedFiles(args: DiscoverFilesArguments): string[] {
    const ignoredFiles = this.listIgnoredFiles(args);

    return execFileSync("git", ["ls-files"], { cwd: args.workingDirectory })
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((filePath) => this.isMeasurableFile(args, filePath))
      .filter((filePath) => !ignoredFiles.has(filePath))
      .filter((filePath) => !this.isExcluded(filePath, args.exclude));
  }

  // 🌎 Public Methods

  /** Returns categorized file path lists for the given codebase root. */
  discoverFiles(args: DiscoverFilesArguments): FileDiscoveryResult {
    const allExtensions = new Set([...TS_EXTENSIONS, ...JS_EXTENSIONS]);
    const trackedFiles = this.listTrackedFiles(args);
    const sourceFiles = trackedFiles.filter((filePath) =>
      allExtensions.has(path.extname(filePath)),
    );

    return {
      cssFiles: this.filterByExtension(trackedFiles, CSS_EXTENSIONS),
      hclFiles: this.filterByExtension(trackedFiles, HCL_EXTENSIONS),
      jsFiles: sourceFiles.filter((filePath) =>
        JS_EXTENSIONS.has(path.extname(filePath)),
      ),
      jsonFiles: this.filterByExtension(trackedFiles, JSON_EXTENSIONS),
      markdownFiles: this.filterByExtension(trackedFiles, MARKDOWN_EXTENSIONS),
      notebookFiles: this.filterByExtension(trackedFiles, NOTEBOOK_EXTENSIONS),
      pyFiles: trackedFiles.filter(
        (filePath) => path.extname(filePath) === ".py",
      ),
      shellFiles: this.filterByExtension(trackedFiles, SHELL_EXTENSIONS),
      sourceFiles,
      sqlFiles: this.filterByExtension(trackedFiles, SQL_EXTENSIONS),
      testFiles: sourceFiles.filter((filePath) =>
        TEST_FILE_REGEX.test(filePath),
      ),
      tomlFiles: this.filterByExtension(trackedFiles, TOML_EXTENSIONS),
      trackedFiles,
      tsFiles: sourceFiles.filter((filePath) =>
        TS_EXTENSIONS.has(path.extname(filePath)),
      ),
      yamlFiles: this.filterByExtension(trackedFiles, YAML_EXTENSIONS),
    };
  }
}
