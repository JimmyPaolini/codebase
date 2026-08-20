import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createFixtureTree,
  removeFixtureTree,
} from "../../../testing/fixture-tree";

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

describe(`${FileDiscoveryService.name} over a real directory`, () => {
  let result: FileDiscoveryResult;
  let workingDirectory: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [FileDiscoveryService, IgnoreRulesService],
    }).compile();
    const service = await module.resolve(FileDiscoveryService);

    workingDirectory = createFixtureTree();
    result = service.discoverFiles({
      exclude: DEFAULT_EXCLUDE,
      excludeFrom: [".codometerignore"],
      workingDirectory,
    });
  });

  afterAll(() => {
    removeFixtureTree(workingDirectory);
  });

  it("discovers every measurable file in the tree, sorted", () => {
    expect.hasAssertions();
    // The fixture tree is not a git repository and never becomes one, which is
    // what the implementation this replaced could not measure at all.
    expect(result.trackedFiles).toStrictEqual([
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

  it("categorizes every language it discovered", () => {
    expect.hasAssertions();
    expect(result.cssFiles).toStrictEqual(["src/styles.css"]);
    expect(result.hclFiles).toStrictEqual(["src/main.tf"]);
    expect(result.shellFiles).toStrictEqual(["src/script.sh"]);
    expect(result.sqlFiles).toStrictEqual(["src/query.sql"]);
    expect(result.tomlFiles).toStrictEqual(["src/settings.toml"]);
    expect(result.yamlFiles).toStrictEqual(["src/values.yaml"]);
  });

  it("categorizes notebooks apart from plain JSON", () => {
    expect.hasAssertions();
    // A notebook is JSON on disk, but the jupyter analyzer takes it apart
    // instead, so it must not also be counted as a plain JSON document.
    expect(result.notebookFiles).toStrictEqual(["src/notebook.ipynb"]);
    expect(result.jsonFiles).toStrictEqual(["src/data.json"]);
  });

  it("applies the gitignore files it passes on the way down", () => {
    expect.hasAssertions();
    // `build/`, `*.log`, and `nested/generated/` from the root ignore file.
    expect(result.trackedFiles).not.toContain("build/output.js");
    expect(result.trackedFiles).not.toContain("debug.log");
    expect(result.trackedFiles).not.toContain("nested/generated/thing.ts");
  });

  it("lets a nested gitignore file overrule the one above it", () => {
    expect.hasAssertions();
    // `nested/.gitignore` claims `*.md` and then re-includes `keep.md`.
    expect(result.trackedFiles).toContain("nested/keep.md");
    expect(result.trackedFiles).not.toContain("nested/drop.md");
  });

  it("excludes what the configured ignore file claims", () => {
    expect.hasAssertions();
    // `/README.md` is anchored, `vendor/` is a whole directory.
    expect(result.trackedFiles).not.toContain("README.md");
    expect(result.trackedFiles).not.toContain("vendor/vendored.ts");
  });

  it("skips a real symlink so a mirrored file is not counted twice", () => {
    expect.hasAssertions();
    // CLAUDE.md is a link to AGENTS.md; following it would report one document
    // as two.
    expect(result.markdownFiles).toStrictEqual(["AGENTS.md", "nested/keep.md"]);
  });
});
