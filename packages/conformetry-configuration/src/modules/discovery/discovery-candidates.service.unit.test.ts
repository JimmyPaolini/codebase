import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryCandidatesService } from "./discovery-candidates.service";

/**
 * Builds a workspace holding two module directories, so directory globs and
 * file globs can be exercised against the same tree.
 */
async function createWorkspace(): Promise<string> {
  const workingDirectory = await mkdtemp(
    path.join(tmpdir(), "conformetry-workspace-"),
  );

  for (const stem of ["errors", "logger"]) {
    const instancePath = path.join(
      workingDirectory,
      "packages/widgets/src/modules",
      stem,
    );

    await mkdir(instancePath, { recursive: true });

    for (const suffix of [
      ".module.ts",
      ".service.ts",
      ".service.unit.test.ts",
    ]) {
      await writeFile(path.join(instancePath, `${stem}${suffix}`), "", "utf8");
    }
  }

  return workingDirectory;
}

describe(DiscoveryCandidatesService, () => {
  let service: DiscoveryCandidatesService;
  let workingDirectory: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DiscoveryCandidatesService],
    }).compile();

    service = await module.resolve(DiscoveryCandidatesService);
    workingDirectory = await createWorkspace();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveCandidates", () => {
    it("names a directory candidate by its basename and leaves the scope open", () => {
      const candidates = service.resolveCandidates({
        patterns: ["packages/*/src/modules/*"],
        workingDirectory,
      });

      expect(candidates.map((candidate) => candidate.nameStem)).toStrictEqual([
        "errors",
        "logger",
      ]);
      expect(candidates[0]?.fileScope).toBeUndefined();
    });

    it("collapses file matches sharing a name into one scoped candidate", () => {
      const candidates = service.resolveCandidates({
        patterns: [
          "packages/*/src/modules/*/*.service.ts",
          "packages/*/src/modules/*/*.service.unit.test.ts",
        ],
        workingDirectory,
      });

      expect(candidates).toHaveLength(2);
      expect(candidates[0]?.nameStem).toBe("errors");
      expect(
        candidates[0]?.fileScope?.map((filePath) => path.basename(filePath)),
      ).toStrictEqual(["errors.service.ts", "errors.service.unit.test.ts"]);
    });

    it("keeps a directory candidate separate from a file candidate", () => {
      const candidates = service.resolveCandidates({
        patterns: [
          "packages/*/src/modules/errors",
          "packages/*/src/modules/errors/*.service.ts",
        ],
        workingDirectory,
      });

      expect(candidates).toHaveLength(2);
      expect(
        candidates.filter((candidate) => candidate.fileScope === undefined),
      ).toHaveLength(1);
    });

    it("falls back to the filename extension when a pattern names a file exactly", () => {
      const candidates = service.resolveCandidates({
        patterns: ["packages/*/src/modules/*/errors.module.ts"],
        workingDirectory,
      });

      expect(candidates[0]?.nameStem).toBe("errors.module");
    });

    it("applies caller substitutions to every candidate", () => {
      const candidates = service.resolveCandidates({
        patterns: ["packages/*/src/modules/*"],
        substitutions: { type: "packages" },
        workingDirectory,
      });

      expect(
        candidates.every((candidate) => {
          return candidate.substitutions?.["type"] === "packages";
        }),
      ).toBe(true);
    });

    it("returns nothing when a pattern matches nothing", () => {
      expect(
        service.resolveCandidates({
          patterns: ["nowhere/*"],
          workingDirectory,
        }),
      ).toStrictEqual([]);
    });
  });
});
