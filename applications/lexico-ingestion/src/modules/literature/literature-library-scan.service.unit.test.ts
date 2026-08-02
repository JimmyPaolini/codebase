import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LiteratureLibraryScanService } from "./literature-library-scan.service";

import type { Dirent } from "node:fs";

vi.mock("node:fs/promises", () => ({
  readdir: vi.fn<() => Promise<Dirent[]>>(),
}));

function createDirectoryEntry(name: string): Dirent {
  return {
    isDirectory: (): boolean => true,
    isFile: (): boolean => false,
    name,
  } as Dirent;
}

function createFileEntry(name: string): Dirent {
  return {
    isDirectory: (): boolean => false,
    isFile: (): boolean => true,
    name,
  } as Dirent;
}

describe(LiteratureLibraryScanService, () => {
  let service: LiteratureLibraryScanService;
  let readdirMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LiteratureLibraryScanService],
    }).compile();

    service = await module.resolve(LiteratureLibraryScanService);
  });

  beforeEach(async () => {
    vi.resetModules();
    const module = await import("node:fs/promises");
    readdirMock = vi.mocked(module.readdir);
    readdirMock.mockReset();

    service = new LiteratureLibraryScanService();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("scanLibrary", () => {
    it("returns empty list when data directory is missing", async () => {
      readdirMock.mockRejectedValueOnce(new Error("missing"));

      const entries = await service.scanLibrary();

      expect(entries).toStrictEqual([]);
    });

    it("recursively collects markdown files and ignores non-markdown files", async () => {
      readdirMock
        // providers in data/library
        .mockResolvedValueOnce([
          createDirectoryEntry("perseus"),
          createFileEntry("README.md"),
        ])
        // authors in data/library/perseus
        .mockResolvedValueOnce([
          createDirectoryEntry("virgil"),
          createFileEntry("ignore.txt"),
        ])
        // files in data/library/perseus/virgil
        .mockResolvedValueOnce([
          createDirectoryEntry("book-1"),
          createFileEntry("aeneid.md"),
          createFileEntry("metadata.json"),
        ])
        // files in nested data/library/perseus/virgil/book-1
        .mockResolvedValueOnce([
          createFileEntry("line-1.md"),
          createFileEntry("line-1.txt"),
        ]);

      const entries = await service.scanLibrary();

      expect(entries).toHaveLength(2);
      expect(entries).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            authorSlug: "virgil",
            pathParts: [],
            provider: "perseus",
            textSlug: "aeneid",
            title: "Aeneid",
          }),
          expect.objectContaining({
            authorSlug: "virgil",
            pathParts: ["book-1"],
            provider: "perseus",
            textSlug: "line-1",
            title: "Line 1",
          }),
        ]),
      );
      expect(entries.every((entry) => entry.fullPath.endsWith(".md"))).toBe(
        true,
      );
    });

    it("ignores non-directory provider and author entries", async () => {
      readdirMock
        .mockResolvedValueOnce([
          createFileEntry("not-a-provider.md"),
          createDirectoryEntry("latin-library"),
        ])
        .mockResolvedValueOnce([
          createFileEntry("not-an-author.md"),
          createDirectoryEntry("cicero"),
        ])
        .mockResolvedValueOnce([createFileEntry("de-work.md")]);

      const entries = await service.scanLibrary();

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        authorSlug: "cicero",
        provider: "latin-library",
        textSlug: "de-work",
      });
    });
  });
});
