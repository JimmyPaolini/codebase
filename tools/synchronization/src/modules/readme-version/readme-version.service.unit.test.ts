import { writeFileSync } from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PACKAGE_JSON_PATH,
  ROOT_README_PATH,
} from "./readme-version.constants";
import { ReadmeVersionService } from "./readme-version.service";

const fileContents = new Map<string, string>();

vi.mock("node:fs", () => {
  return {
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
    writeFileSync: vi.fn<(filePath: string, content: string) => void>(
      (filePath: string, content: string) => {
        fileContents.set(filePath, content);
      },
    ),
  };
});

describe(ReadmeVersionService, () => {
  let service: ReadmeVersionService;

  const workspaceRoot = process.cwd();
  const packageJsonPath = path.join(workspaceRoot, PACKAGE_JSON_PATH);
  const readmePath = path.join(workspaceRoot, ROOT_README_PATH);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ReadmeVersionService],
    }).compile();

    service = await module.resolve(ReadmeVersionService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("formatTitle", () => {
    it("formats the title with the given version", () => {
      expect(service.formatTitle("1.2.3")).toBe("# Codebase v1.2.3");
    });
  });

  describe("readPackageVersion", () => {
    it("reads and parses the version from package.json", () => {
      fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));

      expect(service.readPackageVersion(workspaceRoot)).toBe("2.10.6");
    });

    it("throws when package.json is invalid JSON", () => {
      fileContents.set(packageJsonPath, "invalid-json");

      expect(() => service.readPackageVersion(workspaceRoot)).toThrow(
        "Unexpected token",
      );
    });

    it("throws when package.json is missing version", () => {
      fileContents.set(packageJsonPath, JSON.stringify({}));

      expect(() => service.readPackageVersion(workspaceRoot)).toThrow(
        "expected string, received undefined",
      );
    });
  });

  describe("readReadme", () => {
    it("reads the content of ROOT_README_PATH", () => {
      fileContents.set(readmePath, "# Codebase v2.10.6\n");

      expect(service.readReadme(workspaceRoot)).toBe("# Codebase v2.10.6\n");
    });
  });

  describe("isSynchronized", () => {
    it("returns true when README title matches package.json version", () => {
      fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
      fileContents.set(readmePath, "# Codebase v2.10.6\n\nIntroduction...");

      expect(service.isSynchronized(workspaceRoot)).toBe(true);
    });

    it("returns false when README title does not have version", () => {
      fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
      fileContents.set(readmePath, "# Codebase\n\nIntroduction...");

      expect(service.isSynchronized(workspaceRoot)).toBe(false);
    });

    it("returns false when README title has a different version", () => {
      fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
      fileContents.set(readmePath, "# Codebase v2.10.5\n\nIntroduction...");

      expect(service.isSynchronized(workspaceRoot)).toBe(false);
    });
  });

  describe("writeReadmeVersion", () => {
    it("updates the README title with the new version when out of sync", () => {
      fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
      fileContents.set(readmePath, "# Codebase\n\nIntroduction...");

      service.writeReadmeVersion(workspaceRoot);

      expect(writeFileSync).toHaveBeenCalledWith(
        readmePath,
        "# Codebase v2.10.6\n\nIntroduction...",
        "utf8",
      );
    });

    it("updates previous version title with the new version", () => {
      fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
      fileContents.set(readmePath, "# Codebase v2.10.5\n\nIntroduction...");

      service.writeReadmeVersion(workspaceRoot);

      expect(writeFileSync).toHaveBeenCalledWith(
        readmePath,
        "# Codebase v2.10.6\n\nIntroduction...",
        "utf8",
      );
    });

    it("does not write if already synchronized", () => {
      fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
      fileContents.set(readmePath, "# Codebase v2.10.6\n\nIntroduction...");

      service.writeReadmeVersion(workspaceRoot);

      expect(writeFileSync).not.toHaveBeenCalled();
    });
  });
});
