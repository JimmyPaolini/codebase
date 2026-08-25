import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { DocumentationReportService } from "./documentation-report.service";

import type { DocumentationMeasurement } from "./documentation-measurement.types";

/** Builds a documented declaration whose comment exceeded its kind's limit. */
function buildBreach(
  severity: DocumentationMeasurement["severity"],
): DocumentationMeasurement {
  return {
    breached: true,
    declaration: "Foo",
    file: "src/foo.ts",
    kind: "class",
    limit: 6,
    line: 3,
    measured: 9,
    severity,
    target: "codebase",
    unit: "lines",
  };
}

describe(DocumentationReportService, () => {
  let service: DocumentationReportService;
  let loggerService: LoggerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentationReportService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(DocumentationReportService);
    loggerService = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("renderSection", () => {
    it("renders nothing for zero breaches", () => {
      expect(service.renderSection({ breaches: [] })).toBe("");
    });

    it("renders a heading and one bullet per breach", () => {
      const section = service.renderSection({
        breaches: [buildBreach("fail")],
      });

      expect(section).toBe(
        [
          "### 📝 Documentation",
          "- `src/foo.ts:3` — `Foo` (class): 9/6 lines",
        ].join("\n\n"),
      );
    });
  });

  describe("reportBreaches", () => {
    it("fails a gating run on a failing breach", () => {
      const result = service.reportBreaches({
        checksLimits: true,
        documentation: [buildBreach("fail")],
      });

      expect(result).toBe(true);
      expect(loggerService.error).toHaveBeenCalledWith(
        "📊 Breached a documentation length limit",
        undefined,
        { documentation: [buildBreach("fail")] },
      );
    });

    it("never fails on a warning breach", () => {
      const result = service.reportBreaches({
        checksLimits: true,
        documentation: [buildBreach("warn")],
      });

      expect(result).toBe(false);
      expect(loggerService.warn).toHaveBeenCalledWith(
        "📊 Breached a documentation length limit",
        undefined,
        { documentation: [buildBreach("warn")] },
      );
    });

    it("does not fail a failing breach without --check limits", () => {
      const result = service.reportBreaches({
        checksLimits: false,
        documentation: [buildBreach("fail")],
      });

      expect(result).toBe(false);
    });

    it("does nothing for a measurement that did not breach", () => {
      const result = service.reportBreaches({
        checksLimits: true,
        documentation: [{ ...buildBreach("fail"), breached: false }],
      });

      expect(result).toBe(false);
      expect(loggerService.error).not.toHaveBeenCalled();
      expect(loggerService.warn).not.toHaveBeenCalled();
    });
  });
});
