import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { SizeAnalysisService } from "./size-analysis.service";

import type { CodometerCompression } from "@codometer/configuration";

// Reading is mocked down to the one call the measurement makes, so the bytes
// under test come from the compression rather than from a temporary directory.
// Real files are measured in `size-analysis.service.integration.test.ts`.
const { readFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn<(filePath: string) => Buffer>(),
}));

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  readFileSync: readFileSyncMock,
}));

/** The two files every measurement here is made of, keyed by absolute path. */
const FILE_CONTENTS: Readonly<Record<string, string>> = {
  "/repo/dist/alpha.js": "export const alpha = 1;\n",
  "/repo/dist/beta.js": "export const beta = 2;\n",
};

/** Bytes these two files report under each compression, permanently. */
const PINNED_BYTES: Readonly<Record<CodometerCompression, number>> = {
  brotli: 55,
  gzip: 87,
  none: 47,
};

describe(SizeAnalysisService, () => {
  let service: SizeAnalysisService;

  /** Measures both fixture files under one compression. */
  function analyze(compression: CodometerCompression): number {
    return service.analyze({
      compression,
      files: ["dist/alpha.js", "dist/beta.js"],
      workingDirectory: "/repo",
    }).bytes;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SizeAnalysisService],
    }).compile();

    service = await module.resolve(SizeAnalysisService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Logger.prototype, "warn").mockReturnValue(undefined);
    readFileSyncMock.mockImplementation((filePath: string) => {
      const contents = FILE_CONTENTS[filePath];

      if (contents === undefined) {
        throw new Error(`ENOENT: ${filePath}`);
      }

      return Buffer.from(contents);
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each(["brotli", "gzip", "none"] as const)(
    "reports the same %s bytes it always has",
    (compression) => {
      expect(analyze(compression)).toBe(PINNED_BYTES[compression]);
    },
  );

  it("reports which compression the bytes were measured under", () => {
    expect(
      service.analyze({
        compression: "brotli",
        files: ["dist/alpha.js"],
        workingDirectory: "/repo",
      }),
    ).toStrictEqual({ bytes: 28, compression: "brotli", files: 1 });
  });

  it("reads each file once, relative to the measured directory", () => {
    analyze("gzip");

    expect(readFileSyncMock).toHaveBeenCalledTimes(2);
    expect(readFileSyncMock).toHaveBeenCalledWith("/repo/dist/alpha.js");
  });

  it("counts a file it cannot read as no bytes at all", () => {
    const result = service.analyze({
      compression: "gzip",
      files: ["dist/alpha.js", "dist/gone.js"],
      workingDirectory: "/repo",
    });

    // The file is still one of the target's, so it is still counted as one.
    expect(result.bytes).toBe(44);
    expect(result.files).toBe(2);
  });
});
