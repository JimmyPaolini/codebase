import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ReportingService } from "./reporting.service";

import type { ValidationFileResult } from "../language/language.types";
import type { InstanceScore } from "../scoring/scoring.types";

const WORKING_DIRECTORY = "/workspace";

function createFileResult(
  errors: ValidationFileResult["errors"],
): ValidationFileResult {
  return {
    errors,
    filename: "example.ts",
    instanceFilePath: "/workspace/packages/example/src/example.ts",
    templateFilePath: "/workspace/templates/example/src/example.ts",
    totalWeight: 1,
  };
}

describe(ReportingService, () => {
  let service: ReportingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ReportingService],
    }).compile();

    service = await module.resolve(ReportingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns a success message when nothing failed", () => {
    const report = service.formatReport({
      fileResults: [],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toBe("All checked files conform.");
  });

  it("relativizes instance and template paths against the working directory", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          { errorType: "code", fix: "Add it.", message: "Missing thing" },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain("Instance: packages/example/src/example.ts");
    expect(report).toContain("Template: templates/example/src/example.ts");
    expect(report).not.toContain("/workspace/");
  });

  it("prints the message and fix for every error", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          { errorType: "code", fix: "Add the import.", message: "Missing A" },
          { errorType: "comment", fix: "Add the comment.", message: "No B" },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain("1. Missing A");
    expect(report).toContain("Fix     : Add the import.");
    expect(report).toContain("2. No B");
    expect(report).toContain("Fix     : Add the comment.");
  });

  it("prefers line and column over a JSON path", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          {
            errorType: "code",
            fix: "Fix it.",
            instanceColumn: 3,
            instanceLine: 12,
            instancePath: "scripts.build",
            message: "Missing thing",
            templateLine: 8,
          },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain("Instance: Line 12, Column 3");
    expect(report).toContain("Template: Line 8");
    expect(report).not.toContain("JSON path");
  });

  it("falls back to a JSON path when no line is known", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          {
            errorType: "code",
            fix: "Fix it.",
            instancePath: "scripts.build[0]",
            message: "Missing key",
          },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain('Instance: JSON path "scripts.build[0]"');
  });

  it("prints expected and actual values when the error carries them", () => {
    const report = service.formatReport({
      fileResults: [
        createFileResult([
          {
            actual: "esnext",
            errorType: "code",
            expected: "es2023",
            fix: "Change it.",
            message: "Wrong target",
          },
        ]),
      ],
      workingDirectory: WORKING_DIRECTORY,
    });

    expect(report).toContain("Expected: `es2023`");
    expect(report).toContain("Actual  : `esnext`");
  });

  describe("score summary", () => {
    function createScore(overrides: Partial<InstanceScore>): InstanceScore {
      return {
        failedWeight: 4,
        instancePath: "/workspace/packages/example/src/modules/billing",
        ok: false,
        score: 0.8,
        templateName: "nestjs-service-module",
        threshold: 1,
        totalWeight: 20,
        ...overrides,
      };
    }

    it("prints a score below its threshold with both numbers", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [createScore({})],
        workingDirectory: WORKING_DIRECTORY,
      });

      expect(report).toContain("Conformance scores:");
      expect(report).toContain("80.0%");
      expect(report).toContain("threshold 100.0%");
      expect(report).toContain("below threshold");
    });

    it("prints a score that cleared a lowered threshold as within it", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [createScore({ ok: true, threshold: 0.75 })],
        workingDirectory: WORKING_DIRECTORY,
      });

      expect(report).toContain("within threshold");
      expect(report).toContain("threshold 75.0%");
    });

    it("leaves perfect instances out of the summary", () => {
      const report = service.formatReport({
        fileResults: [],
        scores: [createScore({ failedWeight: 0, ok: true, score: 1 })],
        workingDirectory: WORKING_DIRECTORY,
      });

      // A line per conforming instance would bury the ones that drifted.
      expect(report).not.toContain("Conformance scores:");
      expect(report).toBe("All checked files conform.");
    });

    it("still prints findings for an instance within its threshold", () => {
      const report = service.formatReport({
        fileResults: [
          createFileResult([
            { errorType: "code", fix: "Add it.", message: "Missing thing" },
          ]),
        ],
        scores: [createScore({ ok: true, threshold: 0.75 })],
        workingDirectory: WORKING_DIRECTORY,
      });

      // A lowered threshold is permission to ship the drift, not a reason to
      // stop showing it.
      expect(report).toContain("within threshold");
      expect(report).toContain("Missing thing");
    });

    it("renders a report with no scores at all", () => {
      const report = service.formatReport({
        fileResults: [],
        workingDirectory: WORKING_DIRECTORY,
      });

      expect(report).toBe("All checked files conform.");
    });
  });
});
