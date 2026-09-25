import { spawnSync } from "node:child_process";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { TARBALLS_DIRECTORY_MISSING_MESSAGE } from "./publish-set.constants";
import { PublishSetService } from "./publish-set.service";

/** Paths the mocked filesystem says exist. */
const existingPaths = new Set<string>();

/** Readdir mock return values. */
let mockTarballFiles: string[] = [];

/** ExecFileSync mock error trigger. */
let typecheckShouldFail = false;
let tarShouldFail = false;

/** SpawnSync return status. */
let spawnStatus = 0;

/** Mock manifest JSON string. */
let mockManifestJson = JSON.stringify({ bin: { conformetry: "bin/cli" } });

vi.mock("node:fs", () => ({
  existsSync: vi.fn<(target: string) => boolean>((target: string) =>
    existingPaths.has(target),
  ),
  mkdirSync: vi.fn<(path: string, options?: unknown) => void>(),
  readdirSync: vi.fn<() => string[]>(() => mockTarballFiles),
  readFileSync: vi.fn<() => string>(() => mockManifestJson),
  rmSync: vi.fn<(path: string, options?: unknown) => void>(),
  writeFileSync: vi.fn<() => void>(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn<(command: string, args?: string[]) => void>(
    (_command: string, args?: string[]) => {
      if (typecheckShouldFail && args?.includes("--noEmit")) {
        throw new Error("TSC compilation error");
      }
      if (
        tarShouldFail &&
        args?.some((argument) => argument.includes("cli-bin-verify"))
      ) {
        throw new Error("Tar extraction error");
      }
    },
  ),
  spawnSync: vi.fn<
    () => { output: unknown[]; status: number; stderr: string; stdout: string }
  >(() => ({
    output: [],
    status: spawnStatus,
    stderr: spawnStatus === 0 ? "" : "CLI execution error",
    stdout: "CLI output",
  })),
}));

describe(PublishSetService, () => {
  let service: PublishSetService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishSetService,
        {
          provide: LoggerService,
          useValue: {
            log: vi.fn(),
            setContext: vi.fn(),
          },
        },
      ],
    }).compile();

    service = await module.resolve(PublishSetService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    existingPaths.clear();
    mockTarballFiles = [
      "conformetry-cli-0.0.1.tgz",
      "codometer-cli-0.0.1.tgz",
      "callidescope-cli-0.0.1.tgz",
      "codependix-cli-0.0.1.tgz",
    ];
    typecheckShouldFail = false;
    tarShouldFail = false;
    spawnStatus = 0;
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("verifyPublishSet", () => {
    it("fails with an error message when dist/tarballs directory is missing", () => {
      expect.hasAssertions();

      const result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages).toStrictEqual([
        TARBALLS_DIRECTORY_MISSING_MESSAGE,
      ]);
    });

    it("verifies cleanly when dist/tarballs exists and child processes exit with 0", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      existingPaths.add(
        "/mock-workspace/dist/tarballs/conformetry-cli-0.0.1.tgz",
      );
      existingPaths.add(
        "/mock-workspace/dist/tarballs/codometer-cli-0.0.1.tgz",
      );
      existingPaths.add(
        "/mock-workspace/dist/tarballs/callidescope-cli-0.0.1.tgz",
      );
      existingPaths.add(
        "/mock-workspace/dist/tarballs/codependix-cli-0.0.1.tgz",
      );

      const result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);
    });

    it("uses process.cwd when workspaceRoot is passed", () => {
      expect.hasAssertions();

      existingPaths.add(`${process.cwd()}/dist/tarballs`);

      const result = service.verifyPublishSet(process.cwd());

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);
    });

    it("verifies cleanly when bin is missing or an empty object in package.json", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      mockManifestJson = JSON.stringify({});

      let result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);

      mockManifestJson = JSON.stringify({ bin: {} });

      result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);
    });

    it("verifies cleanly when bin is a string in package.json", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      mockManifestJson = JSON.stringify({ bin: "bin/cli" });

      const result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(true);
      expect(result.messages).toStrictEqual([]);
    });

    it("reports failure when CLI binary exits with non-zero status code and empty stderr", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      spawnStatus = 1;

      const result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it("reports failure when typecheck fails for a package", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      typecheckShouldFail = true;

      const result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain("Failed to typecheck");
    });

    it("reports failure when CLI binary extraction fails", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      tarShouldFail = true;

      const result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain("Failed to execute CLI binary");
    });

    it("reports failure when CLI binary execution throws an error", () => {
      expect.hasAssertions();

      existingPaths.add("/mock-workspace/dist/tarballs");
      vi.mocked(spawnSync).mockImplementationOnce(() => {
        throw new Error("Spawn execution failed");
      });

      const result = service.verifyPublishSet("/mock-workspace");

      expect(result.succeeded).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain("Failed to execute CLI binary");
    });
  });
});
