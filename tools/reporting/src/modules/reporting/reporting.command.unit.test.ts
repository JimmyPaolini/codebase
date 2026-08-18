import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { BundlesCommand } from "../bundles/bundles.command";

import { ReportingMarkersService } from "./reporting-markers.service";
import { ReportingCommand } from "./reporting.command";
import { ReportingService } from "./reporting.service";

describe(ReportingCommand, () => {
  let command: ReportingCommand;
  const renderReport = vi.fn<() => string>(() => "## 🎒 Bundles\n\nmeasured");
  const temporaryDirectories: string[] = [];

  /** A throwaway directory that cleans itself up after the suite. */
  function makeDirectory(): string {
    const directory = mkdtempSync(path.join(tmpdir(), "reporting-command-"));
    temporaryDirectories.push(directory);
    return directory;
  }

  const bundlesCommandMock = {
    renderReport,
    reportLabel: "bundle sizes",
    reportMarkers: {
      end: "<!-- bundle-sizes:end -->",
      start: "<!-- bundle-sizes:start -->",
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportingCommand,
        ReportingMarkersService,
        ReportingService,
        { provide: BundlesCommand, useValue: bundlesCommandMock },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(ReportingCommand);
  });

  afterAll(() => {
    for (const directory of temporaryDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportingCommand,
        ReportingMarkersService,
        ReportingService,
        { provide: BundlesCommand, useValue: bundlesCommandMock },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ReportingCommand");
  });

  it.each([
    { flag: "--baseline", parse: "parseBaseline" },
    { flag: "--baseline-url", parse: "parseBaselineUrl" },
    { flag: "--markdown", parse: "parseMarkdown" },
  ] as const)("reads $flag, treating an empty value as absent", ({ parse }) => {
    expect(command[parse]("value")).toBe("value");
    expect(command[parse]("")).toBeUndefined();
    expect(command[parse](true)).toBeUndefined();
  });

  it("splices every registered report into one document", async () => {
    const markdown = path.join(makeDirectory(), "document.md");

    await command.run([], { markdown });

    const written = readFileSync(markdown, "utf8");

    expect(written).toContain("<!-- bundle-sizes:start -->");
    expect(written).toContain("measured");
  });

  it("passes the baseline options down to each report", async () => {
    renderReport.mockClear();

    await command.run([], {
      baseline: ".baseline",
      baselineUrl: "https://example.test/1",
      markdown: path.join(makeDirectory(), "document.md"),
    });

    expect(renderReport).toHaveBeenCalledWith({
      baseline: ".baseline",
      baselineUrl: "https://example.test/1",
    });
  });

  it("prints to standard output when given no document", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await command.run([], {});
    const printed = String(write.mock.calls[0]?.[0]);
    write.mockRestore();

    expect(printed).toContain("## 🎒 Bundles");
  });
});
