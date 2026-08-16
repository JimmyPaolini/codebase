import * as fs from "node:fs";

import { createMock } from "@golevelup/ts-vitest";
import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscoveryService } from "./discovery.service";

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock:
    vi.fn<(file: string, args?: string[], options?: object) => Buffer>(),
}));

vi.mock("node:child_process", () => ({ execFileSync: execFileSyncMock }));
vi.mock("node:fs");

const DEFAULT_EXCLUDE = ["**/node_modules/**", "**/dist/**"];

describe(DiscoveryService, () => {
  let service: DiscoveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DiscoveryService],
    }).compile();
    service = await module.resolve(DiscoveryService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.lstatSync).mockReturnValue(
      createMock<fs.Stats>({ isSymbolicLink: () => false }),
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("categorizes TypeScript, JavaScript, Python, and test files", () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from(
        [
          "src/app.ts",
          "src/app.test.ts",
          "src/utility.js",
          "src/script.py",
          "node_modules/lib/index.ts",
          "dist/bundle.js",
        ].join("\n"),
      ),
    );

    const result = service.discoverFiles({
      exclude: DEFAULT_EXCLUDE,
      excludeFrom: [],
      workingDirectory: "/repo",
    });

    expect(result.tsFiles).toStrictEqual(["src/app.ts", "src/app.test.ts"]);
    expect(result.jsFiles).toStrictEqual(["src/utility.js"]);
    expect(result.testFiles).toStrictEqual(["src/app.test.ts"]);
    expect(result.pyFiles).toStrictEqual(["src/script.py"]);
    expect(result.sourceFiles).toStrictEqual([
      "src/app.ts",
      "src/app.test.ts",
      "src/utility.js",
    ]);
    expect(result.trackedFiles).not.toContain("node_modules/lib/index.ts");
    expect(result.trackedFiles).not.toContain("dist/bundle.js");
  });

  it("categorizes markdown files by extension", () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from(
        ["README.md", "docs/guide.MD", "notes.mdx", "src/app.ts"].join("\n"),
      ),
    );

    const result = service.discoverFiles({
      exclude: [],
      excludeFrom: [],
      workingDirectory: "/repo",
    });

    expect(result.markdownFiles).toStrictEqual([
      "README.md",
      "docs/guide.MD",
      "notes.mdx",
    ]);
  });

  it("categorizes notebooks apart from plain JSON", () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from(
        ["src/explore.ipynb", "package.json", "README.md"].join("\n"),
      ),
    );

    const result = service.discoverFiles({
      exclude: [],
      excludeFrom: [],
      workingDirectory: "/repo",
    });

    expect(result.notebookFiles).toStrictEqual(["src/explore.ipynb"]);
    // A notebook is JSON on disk, but the jupyter analyzer takes it apart
    // instead, so it must not also be counted as a plain JSON document.
    expect(result.jsonFiles).toStrictEqual(["package.json"]);
  });

  it("excludes every category's files with the configured globs", () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from(
        [
          "README.md",
          "applications/lexico-ingestion/data/library/ovid.md",
          "applications/affirmations/output/affirmations/one.md",
          "applications/affirmations/output/affirmations/one.json",
        ].join("\n"),
      ),
    );

    const result = service.discoverFiles({
      exclude: [
        "applications/lexico-ingestion/data/**",
        "applications/affirmations/output/**",
      ],
      excludeFrom: [],
      workingDirectory: "/repo",
    });

    expect(result.markdownFiles).toStrictEqual(["README.md"]);
    expect(result.jsonFiles).toStrictEqual([]);
    expect(result.trackedFiles).toStrictEqual(["README.md"]);
  });

  it("keeps a path that merely contains an excluded name", () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from(["src/redistribute/index.ts", "dist/bundle.js"].join("\n")),
    );

    const result = service.discoverFiles({
      exclude: DEFAULT_EXCLUDE,
      excludeFrom: [],
      workingDirectory: "/repo",
    });

    expect(result.trackedFiles).toStrictEqual(["src/redistribute/index.ts"]);
  });

  it("excludes what a configured ignore file claims", () => {
    execFileSyncMock.mockImplementation((_file: string, args?: string[]) =>
      args?.includes("--ignored") === true
        ? Buffer.from("pnpm-lock.yaml\nCHANGELOG.md")
        : Buffer.from(
            ["src/app.ts", "pnpm-lock.yaml", "CHANGELOG.md"].join("\n"),
          ),
    );

    const result = service.discoverFiles({
      exclude: [],
      excludeFrom: ["configuration/.prettierignore"],
      workingDirectory: "/repo",
    });

    // Arguments as an array, so a path is a path and never shell syntax.
    expect(execFileSyncMock).toHaveBeenCalledWith(
      "git",
      [
        "ls-files",
        "--cached",
        "--ignored",
        "--exclude-from=/repo/configuration/.prettierignore",
      ],
      { cwd: "/repo" },
    );
    expect(result.trackedFiles).toStrictEqual(["src/app.ts"]);
  });

  it("keeps every file when an ignore file matches nothing", () => {
    execFileSyncMock.mockImplementation((_file: string, args?: string[]) =>
      // Git prints nothing when no tracked file matches the ignore patterns.
      args?.includes("--ignored") === true
        ? Buffer.from("")
        : Buffer.from("src/app.ts"),
    );

    const result = service.discoverFiles({
      exclude: [],
      excludeFrom: ["configuration/.codometerignore"],
      workingDirectory: "/repo",
    });

    expect(result.trackedFiles).toStrictEqual(["src/app.ts"]);
  });

  it("warns and continues when an ignore file is missing", () => {
    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);
    execFileSyncMock.mockReturnValue(Buffer.from("src/app.ts"));
    vi.mocked(fs.existsSync).mockImplementation(
      (filePath) => filePath !== "/repo/.nope-ignore",
    );

    const result = service.discoverFiles({
      exclude: [],
      excludeFrom: [".nope-ignore"],
      workingDirectory: "/repo",
    });

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🙈 Skipped missing ignore file",
      undefined,
      { path: ".nope-ignore" },
    );
    expect(result.trackedFiles).toStrictEqual(["src/app.ts"]);
  });

  it("skips symlinks so a mirrored file is not counted twice", () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from(["AGENTS.md", "CLAUDE.md"].join("\n")),
    );
    vi.mocked(fs.lstatSync).mockImplementation((filePath) =>
      createMock<fs.Stats>({
        isSymbolicLink: () => String(filePath).endsWith("CLAUDE.md"),
      }),
    );

    const result = service.discoverFiles({
      exclude: [],
      excludeFrom: [],
      workingDirectory: "/repo",
    });

    // CLAUDE.md is a link to AGENTS.md; following it would report one document
    // as two.
    expect(result.trackedFiles).toStrictEqual(["AGENTS.md"]);
    expect(result.markdownFiles).toStrictEqual(["AGENTS.md"]);
  });

  it("excludes files that do not exist on disk", () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from("src/missing.ts\nsrc/present.ts"),
    );
    vi.mocked(fs.existsSync).mockImplementation(
      (filePath) => filePath === "/repo/src/present.ts",
    );

    const result = service.discoverFiles({
      exclude: [],
      excludeFrom: [],
      workingDirectory: "/repo",
    });

    expect(result.trackedFiles).toStrictEqual(["src/present.ts"]);
  });

  it("passes the working directory to git ls-files", () => {
    execFileSyncMock.mockReturnValue(Buffer.from(""));

    service.discoverFiles({
      exclude: [],
      excludeFrom: [],
      workingDirectory: "/my/project",
    });

    expect(execFileSyncMock).toHaveBeenCalledWith("git", ["ls-files"], {
      cwd: "/my/project",
    });
  });
});
