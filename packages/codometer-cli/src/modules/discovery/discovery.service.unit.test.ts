import * as fs from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscoveryService } from "./discovery.service";

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn<(command: string, options?: object) => Buffer>(),
}));

vi.mock("node:child_process", () => ({ execSync: execSyncMock }));
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
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("categorizes TypeScript, JavaScript, Python, and test files", () => {
    execSyncMock.mockReturnValue(
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
    execSyncMock.mockReturnValue(
      Buffer.from(
        ["README.md", "docs/guide.MD", "notes.mdx", "src/app.ts"].join("\n"),
      ),
    );

    const result = service.discoverFiles({
      exclude: [],
      workingDirectory: "/repo",
    });

    expect(result.markdownFiles).toStrictEqual([
      "README.md",
      "docs/guide.MD",
      "notes.mdx",
    ]);
  });

  it("excludes every category's files with the configured globs", () => {
    execSyncMock.mockReturnValue(
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
      workingDirectory: "/repo",
    });

    expect(result.markdownFiles).toStrictEqual(["README.md"]);
    expect(result.jsonFiles).toStrictEqual([]);
    expect(result.trackedFiles).toStrictEqual(["README.md"]);
  });

  it("keeps a path that merely contains an excluded name", () => {
    execSyncMock.mockReturnValue(
      Buffer.from(["src/redistribute/index.ts", "dist/bundle.js"].join("\n")),
    );

    const result = service.discoverFiles({
      exclude: DEFAULT_EXCLUDE,
      workingDirectory: "/repo",
    });

    expect(result.trackedFiles).toStrictEqual(["src/redistribute/index.ts"]);
  });

  it("excludes files that do not exist on disk", () => {
    execSyncMock.mockReturnValue(Buffer.from("src/missing.ts\nsrc/present.ts"));
    vi.mocked(fs.existsSync).mockImplementation(
      (filePath) => filePath === "/repo/src/present.ts",
    );

    const result = service.discoverFiles({
      exclude: [],
      workingDirectory: "/repo",
    });

    expect(result.trackedFiles).toStrictEqual(["src/present.ts"]);
  });

  it("passes the working directory to git ls-files", () => {
    execSyncMock.mockReturnValue(Buffer.from(""));

    service.discoverFiles({ exclude: [], workingDirectory: "/my/project" });

    expect(execSyncMock).toHaveBeenCalledWith("git ls-files", {
      cwd: "/my/project",
    });
  });
});
