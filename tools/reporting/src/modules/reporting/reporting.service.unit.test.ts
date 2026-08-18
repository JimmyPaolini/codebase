import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ReportingMarkersService } from "./reporting-markers.service";
import { ReportingService } from "./reporting.service";

import type { ReportableCommand } from "./reporting.types";

/** A stand-in report that records what it was asked for. */
function buildReport(body = "## Heading\n\ncontent"): ReportableCommand {
  return {
    renderReport: vi.fn<ReportableCommand["renderReport"]>(() => body),
    reportLabel: "stand-in",
    reportMarkers: {
      end: "<!-- stand-in:end -->",
      start: "<!-- stand-in:start -->",
    },
  };
}

describe(ReportingService, () => {
  let service: ReportingService;
  const temporaryDirectories: string[] = [];

  /** A throwaway directory that cleans itself up after the suite. */
  function makeDirectory(): string {
    const directory = mkdtempSync(path.join(tmpdir(), "reporting-"));
    temporaryDirectories.push(directory);
    return directory;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportingService,
        ReportingMarkersService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(ReportingService);
  });

  afterAll(() => {
    for (const directory of temporaryDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readOptionalText", () => {
    it.each([
      { expected: "value", label: "text", value: "value" },
      { expected: undefined, label: "an empty string", value: "" },
      { expected: undefined, label: "undefined", value: undefined },
      { expected: undefined, label: "a valueless flag", value: true },
      { expected: undefined, label: "a number", value: 7 },
    ])("reads $label", ({ expected, value }) => {
      expect(service.readOptionalText(value)).toBe(expected);
    });
  });

  describe("emit", () => {
    it("prints the wrapped section when given no destination", async () => {
      const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

      await service.emit(
        buildReport(),
        { baseline: undefined, baselineUrl: undefined },
        { markdown: undefined, output: undefined },
      );
      const printed = String(write.mock.calls[0]?.[0]);
      write.mockRestore();

      expect(printed).toContain("<!-- stand-in:start -->");
      expect(printed).toContain("## Heading");
    });

    it("writes the section on its own to an output file", async () => {
      const output = path.join(makeDirectory(), "section.md");

      await service.emit(
        buildReport(),
        { baseline: undefined, baselineUrl: undefined },
        { markdown: undefined, output },
      );

      expect(readFileSync(output, "utf8")).toContain("<!-- stand-in:end -->");
    });

    it("splices into a document, keeping the prose around it", async () => {
      const markdown = path.join(makeDirectory(), "document.md");
      writeFileSync(markdown, "## Summary\n\nProse.\n", "utf8");

      await service.emit(
        buildReport(),
        { baseline: undefined, baselineUrl: undefined },
        { markdown, output: undefined },
      );

      const written = readFileSync(markdown, "utf8");

      expect(written).toContain("## Summary");
      expect(written.indexOf("## Summary")).toBeLessThan(
        written.indexOf("## Heading"),
      );
    });

    it("replaces rather than appends on a second run", async () => {
      const markdown = path.join(makeDirectory(), "document.md");
      writeFileSync(markdown, "## Summary\n", "utf8");

      await service.emit(
        buildReport(),
        { baseline: undefined, baselineUrl: undefined },
        { markdown, output: undefined },
      );
      await service.emit(
        buildReport("## Heading\n\nfresher"),
        { baseline: undefined, baselineUrl: undefined },
        { markdown, output: undefined },
      );

      const written = readFileSync(markdown, "utf8");

      expect(written.split("<!-- stand-in:start -->")).toHaveLength(2);
      expect(written).toContain("fresher");
    });

    it("creates a document that does not exist yet", async () => {
      const markdown = path.join(makeDirectory(), "document.md");

      await service.emit(
        buildReport(),
        { baseline: undefined, baselineUrl: undefined },
        { markdown, output: undefined },
      );

      expect(readFileSync(markdown, "utf8")).toContain("## Heading");
    });

    it("hands the baseline options to the report", async () => {
      const report = buildReport();

      await service.emit(
        report,
        { baseline: ".baseline", baselineUrl: "https://example.test/1" },
        { markdown: undefined, output: path.join(makeDirectory(), "s.md") },
      );

      expect(report.renderReport).toHaveBeenCalledWith({
        baseline: ".baseline",
        baselineUrl: "https://example.test/1",
      });
    });

    it("writes both destinations when both are given", async () => {
      const directory = makeDirectory();
      const markdown = path.join(directory, "document.md");
      const output = path.join(directory, "section.md");

      await service.emit(
        buildReport(),
        { baseline: undefined, baselineUrl: undefined },
        { markdown, output },
      );

      expect(readFileSync(markdown, "utf8")).toContain("## Heading");
      expect(readFileSync(output, "utf8")).toContain("## Heading");
    });
  });
});
