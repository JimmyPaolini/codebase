import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { createFixtureTree } from "../../../testing/fixture-tree";

import { FileDiscoveryService } from "./file-discovery.service";
import { IgnoreRulesService } from "./ignore-rules.service";

import type { FileDiscoveryResult } from "./file-discovery.types";

const DEFAULT_EXCLUDE = [
  "**/.nx/**",
  "**/build/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
];

describe(FileDiscoveryService, () => {
  let service: FileDiscoveryService;
  let workingDirectory: string;

  /** Discovers the fixture tree with the repository's default exclusions. */
  function discover(exclude = DEFAULT_EXCLUDE): FileDiscoveryResult {
    return service.discoverFiles({
      exclude,
      excludeFrom: [".codometerignore"],
      workingDirectory,
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [FileDiscoveryService, IgnoreRulesService],
    }).compile();
    service = await module.resolve(FileDiscoveryService);
    workingDirectory = createFixtureTree();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  it("discovers every measurable file, sorted, and nothing else", () => {
    expect.hasAssertions();
    expect(discover().trackedFiles).toStrictEqual([
      ".codometerignore",
      ".gitignore",
      "AGENTS.md",
      "nested/.gitignore",
      "nested/deep/deeper.ts",
      "nested/keep.md",
      "redistribute/index.ts",
      "src/app.ts",
      "src/app.unit.test.ts",
      "src/data.json",
      "src/main.tf",
      "src/notebook.ipynb",
      "src/query.sql",
      "src/script.sh",
      "src/settings.toml",
      "src/styles.css",
      "src/utility.js",
      "src/values.yaml",
    ]);
  });

  it("categorizes TypeScript, JavaScript, and test files", () => {
    expect.hasAssertions();

    const result = discover();

    expect(result.tsFiles).toStrictEqual([
      "nested/deep/deeper.ts",
      "redistribute/index.ts",
      "src/app.ts",
      "src/app.unit.test.ts",
    ]);
    expect(result.jsFiles).toStrictEqual(["src/utility.js"]);
    expect(result.testFiles).toStrictEqual(["src/app.unit.test.ts"]);
    expect(result.pyFiles).toStrictEqual([]);
    expect(result.sourceFiles).toStrictEqual([
      "nested/deep/deeper.ts",
      "redistribute/index.ts",
      "src/app.ts",
      "src/app.unit.test.ts",
      "src/utility.js",
    ]);
  });

  it("categorizes every other language by extension", () => {
    expect.hasAssertions();

    const result = discover();

    expect(result.cssFiles).toStrictEqual(["src/styles.css"]);
    expect(result.hclFiles).toStrictEqual(["src/main.tf"]);
    expect(result.markdownFiles).toStrictEqual(["AGENTS.md", "nested/keep.md"]);
    expect(result.shellFiles).toStrictEqual(["src/script.sh"]);
    expect(result.sqlFiles).toStrictEqual(["src/query.sql"]);
    expect(result.tomlFiles).toStrictEqual(["src/settings.toml"]);
    expect(result.yamlFiles).toStrictEqual(["src/values.yaml"]);
  });

  it("categorizes notebooks apart from plain JSON", () => {
    expect.hasAssertions();

    const result = discover();

    // A notebook is JSON on disk, but the jupyter analyzer takes it apart
    // instead, so it must not also be counted as a plain JSON document.
    expect(result.notebookFiles).toStrictEqual(["src/notebook.ipynb"]);
    expect(result.jsonFiles).toStrictEqual(["src/data.json"]);
  });

  it("applies the repository's own gitignore files", () => {
    expect.hasAssertions();

    const { trackedFiles } = discover();

    // `build/`, `*.log`, and `nested/generated/` from the root ignore file.
    expect(trackedFiles).not.toContain("build/output.js");
    expect(trackedFiles).not.toContain("debug.log");
    expect(trackedFiles).not.toContain("nested/generated/thing.ts");
  });

  it("lets a nested ignore file overrule the one above it", () => {
    expect.hasAssertions();

    const { trackedFiles } = discover();

    // `nested/.gitignore` claims `*.md` and then re-includes `keep.md`.
    expect(trackedFiles).toContain("nested/keep.md");
    expect(trackedFiles).not.toContain("nested/drop.md");
  });

  it("excludes what a configured ignore file claims", () => {
    expect.hasAssertions();

    const { trackedFiles } = discover();

    // `/README.md` is anchored, `vendor/` is a whole directory.
    expect(trackedFiles).not.toContain("README.md");
    expect(trackedFiles).not.toContain("vendor/vendored.ts");
  });

  it("keeps a path that merely contains an excluded name", () => {
    expect.hasAssertions();

    const { trackedFiles } = discover();

    expect(trackedFiles).toContain("redistribute/index.ts");
    expect(trackedFiles).not.toContain("node_modules/library/index.ts");
  });

  it("excludes files with a glob that names no directory", () => {
    expect.hasAssertions();

    const { jsonFiles, trackedFiles } = discover([
      ...DEFAULT_EXCLUDE,
      "src/*.json",
    ]);

    expect(jsonFiles).toStrictEqual([]);
    expect(trackedFiles).not.toContain("src/data.json");
  });

  it("skips symlinks so a mirrored file is not counted twice", () => {
    expect.hasAssertions();

    const { markdownFiles } = discover();

    // CLAUDE.md is a link to AGENTS.md; following it would report one document
    // as two.
    expect(markdownFiles).toStrictEqual(["AGENTS.md", "nested/keep.md"]);
  });

  it("warns and continues when a configured ignore file is missing", () => {
    expect.hasAssertions();

    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);
    const result = service.discoverFiles({
      exclude: DEFAULT_EXCLUDE,
      excludeFrom: [".nope-ignore"],
      workingDirectory,
    });

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🙈 Skipped missing ignore file",
      undefined,
      { path: ".nope-ignore" },
    );
    // Nothing was subtracted, so the files that ignore file would have claimed
    // are still there.
    expect(result.trackedFiles).toContain("README.md");
    expect(result.trackedFiles).toContain("vendor/vendored.ts");

    loggerWarnSpy.mockRestore();
  });

  it("measures a directory that is not a git repository", () => {
    expect.hasAssertions();

    // The fixture tree has no `.git` anywhere, which is the whole point: the
    // old implementation shelled out to `git ls-files` and reported nothing.
    expect(discover().trackedFiles.length).toBeGreaterThan(0);
  });
});
