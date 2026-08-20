import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createTargetTree,
  removeTargetTree,
} from "../../../testing/target-tree";

import { TargetsService } from "./targets.service";

import type { ResolvedCodometerTarget } from "@codometer/configuration";

/** Builds a resolved target over the fixture tree's build directory. */
function buildTarget(
  overrides: Partial<ResolvedCodometerTarget> = {},
): ResolvedCodometerTarget {
  return {
    analyses: ["size"],
    compression: "gzip",
    exclude: [],
    include: ["dist/**/*.js"],
    name: "compiled",
    ...overrides,
  };
}

describe(`${TargetsService.name} over a real directory`, () => {
  let service: TargetsService;
  let workingDirectory: string;

  /** Lists the files the given target holds in the fixture tree. */
  function matchFiles(target: ResolvedCodometerTarget): string[] {
    return service.matchFiles({ target, workingDirectory });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TargetsService],
    }).compile();

    service = await module.resolve(TargetsService);
    workingDirectory = createTargetTree();
  });

  afterAll(() => {
    removeTargetTree(workingDirectory);
  });

  it("holds every file its globs claim, sorted", () => {
    expect.hasAssertions();
    // `dist/link.js` is a link to a file and counts; `dist/loop` is a link to
    // an ancestor directory and is never entered.
    expect(matchFiles(buildTarget())).toStrictEqual([
      "dist/index.js",
      "dist/link.js",
      "dist/nested/deep.js",
      "dist/nested/deep.min.js",
      "dist/vendor/bundled.js",
    ]);
  });

  it("leaves out what an exclude glob claims", () => {
    expect.hasAssertions();
    expect(
      matchFiles(buildTarget({ exclude: ["dist/vendor/**"] })),
    ).not.toContain("dist/vendor/bundled.js");
  });

  // The tool this replaced applied negations in the order they were written,
  // so the same patterns rearranged could hold a different set of files.
  it.each([
    ["last", ["dist/**/*.js", "dist/nested/**/*.js", "!dist/**/*.min.js"]],
    ["first", ["!dist/**/*.min.js", "dist/**/*.js", "dist/nested/**/*.js"]],
    ["between", ["dist/**/*.js", "!dist/**/*.min.js", "dist/nested/**/*.js"]],
  ])("holds the same files with the negation written %s", (_, patterns) => {
    expect.hasAssertions();

    const target = buildTarget({
      exclude: patterns
        .filter((pattern) => pattern.startsWith("!"))
        .map((pattern) => pattern.slice(1)),
      include: patterns.filter((pattern) => !pattern.startsWith("!")),
    });

    expect(matchFiles(target)).toStrictEqual([
      "dist/index.js",
      "dist/link.js",
      "dist/nested/deep.js",
      "dist/vendor/bundled.js",
    ]);
  });

  it("leaves hidden directories alone unless a glob spells one out", () => {
    expect.hasAssertions();
    // Every glob library excludes dot files from `**`, and it is also what
    // keeps a target over the whole tree out of the git database.
    expect(matchFiles(buildTarget({ include: ["**/*.js"] }))).toStrictEqual([
      "dist/index.js",
      "dist/link.js",
      "dist/nested/deep.js",
      "dist/nested/deep.min.js",
      "dist/vendor/bundled.js",
      "other/index.js",
    ]);
    expect(
      matchFiles(buildTarget({ include: [".hidden/**/*.js"] })),
    ).toStrictEqual([".hidden/secret.js"]);
  });

  it("holds nothing when the directory it names was never built", () => {
    expect.hasAssertions();
    // Not an error here: whether an empty target matters is decided by
    // whoever asked for the measurement, not by the walk.
    expect(
      matchFiles(buildTarget({ include: ["build/**/*.js"] })),
    ).toStrictEqual([]);
  });

  it("holds nothing from a link pointing at a file that is gone", () => {
    expect.hasAssertions();
    expect(matchFiles(buildTarget())).not.toContain("dist/broken.js");
  });

  it("holds nothing when the directory it names cannot be read", () => {
    expect.hasAssertions();
    expect(
      service.matchFiles({
        target: buildTarget(),
        workingDirectory: `${workingDirectory}/never-created`,
      }),
    ).toStrictEqual([]);
  });

  it("holds a file a glob names outright", () => {
    expect.hasAssertions();
    expect(
      matchFiles(buildTarget({ include: ["dist/nested/deep.js"] })),
    ).toStrictEqual(["dist/nested/deep.js"]);
  });
});
