import * as fs from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DiscoverFilesService } from "./discover-files.service";

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn<(command: string, options?: object) => Buffer>(),
}));

vi.mock("node:child_process", () => ({ execSync: execSyncMock }));
vi.mock("node:fs");

describe(DiscoverFilesService, () => {
  let service: DiscoverFilesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DiscoverFilesService],
    }).compile();
    service = await module.resolve(DiscoverFilesService);
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
          "src/util.js",
          "src/script.py",
          "node_modules/lib/index.ts",
          "dist/bundle.js",
        ].join("\n"),
      ),
    );

    const result = service.discoverFiles("/repo");

    expect(result.tsFiles).toStrictEqual(["src/app.ts", "src/app.test.ts"]);
    expect(result.jsFiles).toStrictEqual(["src/util.js"]);
    expect(result.testFiles).toStrictEqual(["src/app.test.ts"]);
    expect(result.pyFiles).toStrictEqual(["src/script.py"]);
    expect(result.sourceFiles).toStrictEqual([
      "src/app.ts",
      "src/app.test.ts",
      "src/util.js",
    ]);
    expect(result.trackedFiles).not.toContain("node_modules/lib/index.ts");
    expect(result.trackedFiles).not.toContain("dist/bundle.js");
  });

  it("excludes files that do not exist on disk", () => {
    execSyncMock.mockReturnValue(Buffer.from("src/missing.ts\nsrc/present.ts"));
    vi.mocked(fs.existsSync).mockImplementation(
      (filePath) => filePath === "src/present.ts",
    );

    const result = service.discoverFiles("/repo");

    expect(result.trackedFiles).toStrictEqual(["src/present.ts"]);
  });

  it("passes the working directory to git ls-files", () => {
    execSyncMock.mockReturnValue(Buffer.from(""));

    service.discoverFiles("/my/project");

    expect(execSyncMock).toHaveBeenCalledWith("git ls-files", {
      cwd: "/my/project",
    });
  });
});
