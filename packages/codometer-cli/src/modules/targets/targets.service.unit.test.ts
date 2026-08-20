import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TargetsService } from "./targets.service";

import type { ResolvedCodometerTarget } from "@codometer/configuration";
import type { Dirent } from "node:fs";

// The walk is mocked down to the one filesystem call it makes for an ordinary
// tree, which is what lets these assertions read which directories it entered.
// Real trees, links, and unreadable directories are walked in
// `targets.service.integration.test.ts`.
const { readdirSyncMock } = vi.hoisted(() => ({
  readdirSyncMock: vi.fn<(directory: string) => Dirent[]>(),
}));

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  readdirSync: readdirSyncMock,
}));

/** An in-memory tree, keyed by absolute directory path. */
const TREE: Readonly<Record<string, readonly (readonly [string, boolean])[]>> =
  {
    "/repo": [
      [".hidden", false],
      ["dist", false],
      ["node_modules", false],
      ["readme.md", true],
    ],
    "/repo/.hidden": [["secret.js", true]],
    "/repo/dist": [
      ["bundle.js", true],
      ["bundle.min.js", true],
      ["nested", false],
      ["styles.css", true],
    ],
    "/repo/dist/nested": [["deep.js", true]],
    "/repo/node_modules": [["library", false]],
    "/repo/node_modules/library": [["index.js", true]],
  };

/** Builds a resolved target over the mocked tree's build directory. */
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

/** Builds the directory entry the mocked `readdirSync` hands back. */
function createEntry(name: string, isFile: boolean): Dirent {
  return createMock<Dirent>({
    isDirectory: () => !isFile,
    isFile: () => isFile,
    isSymbolicLink: () => false,
    name,
  });
}

describe(TargetsService, () => {
  let service: TargetsService;

  /** Lists the files the given target holds in the mocked tree. */
  function matchFiles(
    overrides: Partial<ResolvedCodometerTarget> = {},
  ): string[] {
    return service.matchFiles({
      target: buildTarget(overrides),
      workingDirectory: "/repo",
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TargetsService],
    }).compile();

    service = await module.resolve(TargetsService);
  });

  beforeEach(() => {
    readdirSyncMock.mockReset();
    readdirSyncMock.mockImplementation((directory: string) =>
      (TREE[directory] ?? []).map(([name, isFile]) =>
        createEntry(name, isFile),
      ),
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("holds every file its globs claim, sorted", () => {
    expect(matchFiles()).toStrictEqual([
      "dist/bundle.js",
      "dist/bundle.min.js",
      "dist/nested/deep.js",
    ]);
  });

  it("leaves out a file no include glob claims", () => {
    expect(matchFiles()).not.toContain("dist/styles.css");
  });

  it("leaves out what an exclude glob claims", () => {
    expect(matchFiles({ exclude: ["dist/**/*.min.js"] })).toStrictEqual([
      "dist/bundle.js",
      "dist/nested/deep.js",
    ]);
  });

  it("never reads a directory no glob could match inside", () => {
    matchFiles();

    // The whole reason a glob's literal prefix is worked out at all: a target
    // over one build directory must not enumerate every dependency to find it.
    expect(readdirSyncMock).toHaveBeenCalledWith("/repo/dist", {
      withFileTypes: true,
    });
    expect(readdirSyncMock).not.toHaveBeenCalledWith("/repo/node_modules", {
      withFileTypes: true,
    });
  });

  it("never reads a hidden directory a glob did not spell out", () => {
    matchFiles({ include: ["**/*.js"] });

    expect(readdirSyncMock).not.toHaveBeenCalledWith("/repo/.hidden", {
      withFileTypes: true,
    });
  });

  it("reads a hidden directory a glob does spell out", () => {
    expect(matchFiles({ include: [".hidden/**/*.js"] })).toStrictEqual([
      ".hidden/secret.js",
    ]);
  });

  it("holds files from every include glob at once", () => {
    expect(
      matchFiles({ include: ["dist/*.css", "dist/nested/*.js"] }),
    ).toStrictEqual(["dist/nested/deep.js", "dist/styles.css"]);
  });
});
