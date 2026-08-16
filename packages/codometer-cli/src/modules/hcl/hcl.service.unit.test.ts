import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { HclService } from "./hcl.service";

import type * as NodeFileSystem from "node:fs";

// Reads stay real except for one sentinel path, which throws a bare string:
// a rejected promise or a thrown literal is not an Error, and the analyzer
// still has to report which file it gave up on.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFileSystem>();

  return {
    ...actual,
    readFileSync: (filePath: string, encoding: "utf8") => {
      if (filePath.endsWith("throws-a-string.tf")) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "not an Error";
      }

      return actual.readFileSync(filePath, encoding);
    },
  };
});

describe(HclService, () => {
  let service: HclService;
  const temporaryDirectories: string[] = [];

  /** Writes sources into a fresh directory and returns it with their names. */
  function writeSources(files: Record<string, string>): {
    hclFiles: string[];
    workingDirectory: string;
  } {
    const workingDirectory = mkdtempSync(path.join(tmpdir(), "codometer-hcl-"));
    temporaryDirectories.push(workingDirectory);

    for (const [fileName, content] of Object.entries(files)) {
      writeFileSync(path.join(workingDirectory, fileName), content, "utf8");
    }

    return { hclFiles: Object.keys(files), workingDirectory };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [HclService],
    }).compile();

    service = await module.resolve(HclService);
  });

  afterEach(() => {
    vi.restoreAllMocks();

    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts blocks by the kind each one opens", () => {
    const { hclFiles, workingDirectory } = writeSources({
      "main.tf": [
        "# Cluster definition",
        'resource "kubernetes_namespace" "app" {',
        '  name = "app-${var.environment}"',
        "}",
        'variable "environment" {',
        "  type = string",
        "}",
        'output "namespace" {',
        "  value = kubernetes_namespace.app.id",
        "}",
      ].join("\n"),
    });

    const result = service.analyze({ hclFiles, workingDirectory });

    expect(result.files).toBe(1);
    expect(result.blocks).toBe(3);
    expect(result.resources).toBe(1);
    expect(result.variables).toBe(1);
    expect(result.outputs).toBe(1);
    // `name`, `type`, and `value` — one per block.
    expect(result.attributes).toBe(3);
    expect(result.interpolations).toBe(1);
    expect(result.comments).toBe(1);
  });

  it("counts data blocks as resources and leaves other kinds unlabelled", () => {
    const { hclFiles, workingDirectory } = writeSources({
      "data.tf": [
        "terraform {",
        '  required_version = ">= 1.0"',
        "}",
        'data "kubernetes_namespace" "existing" {',
        "  metadata = {}",
        "}",
      ].join("\n"),
    });

    const result = service.analyze({ hclFiles, workingDirectory });

    expect(result.blocks).toBe(2);
    // A `data` block reads a resource; a `terraform` block configures the tool
    // and belongs to none of the named kinds.
    expect(result.resources).toBe(1);
    expect(result.variables).toBe(0);
    expect(result.outputs).toBe(0);
  });

  it("counts a double slash comment as a comment", () => {
    const { hclFiles, workingDirectory } = writeSources({
      "vars.tf": "// alternative comment syntax\n",
    });

    const result = service.analyze({ hclFiles, workingDirectory });

    expect(result.comments).toBe(1);
  });

  it("reports a thrown value that is not an Error", () => {
    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);
    const { hclFiles, workingDirectory } = writeSources({
      "throws-a-string.tf": "",
    });

    const result = service.analyze({ hclFiles, workingDirectory });

    expect(result.files).toBe(0);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🏗️ Skipped HCL analysis for throws-a-string.tf",
      undefined,
      { reason: "not an Error" },
    );
  });

  it("skips an unreadable file and warns", () => {
    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);

    const result = service.analyze({
      hclFiles: ["missing.tf"],
      workingDirectory: "/repo",
    });

    expect(result.files).toBe(0);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🏗️ Skipped HCL analysis for missing.tf",
      undefined,
      expect.any(Object),
    );
  });
});
