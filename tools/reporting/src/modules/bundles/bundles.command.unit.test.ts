import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "@codebase/logger";

import { BundleMarkdownService } from "../bundle-markdown/bundle-markdown.service";
import { ReportingMarkersService } from "../reporting/reporting-markers.service";
import { ReportingService } from "../reporting/reporting.service";

import { BundlesCommand } from "./bundles.command";
import { BundlesService } from "./bundles.service";

import type { BundleRow } from "./bundles.types";

const row: BundleRow = {
  baseSize: undefined,
  measured: true,
  missing: false,
  name: "Compiled JavaScript",
  passed: true,
  project: "logger",
  removed: false,
  size: 1000,
  sizeLimit: 2000,
};

describe(BundlesCommand, () => {
  let command: BundlesCommand;
  const collectRows = vi.fn<() => BundleRow[]>(() => [row]);
  const temporaryDirectories: string[] = [];

  /** A throwaway directory that cleans itself up after the suite. */
  function makeDirectory(): string {
    const directory = mkdtempSync(path.join(tmpdir(), "codometer-command-"));
    temporaryDirectories.push(directory);
    return directory;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BundlesCommand,
        BundleMarkdownService,
        ReportingMarkersService,
        ReportingService,
        { provide: BundlesService, useValue: { collectRows } },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(BundlesCommand);
  });

  afterEach(() => {
    collectRows.mockClear();
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
        BundlesCommand,
        BundleMarkdownService,
        ReportingMarkersService,
        ReportingService,
        { provide: BundlesService, useValue: { collectRows } },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("BundlesCommand");
  });

  it.each([
    { flag: "--baseline", parse: "parseBaseline" },
    { flag: "--baseline-url", parse: "parseBaselineUrl" },
    { flag: "--markdown", parse: "parseMarkdown" },
    { flag: "--output", parse: "parseOutput" },
  ] as const)("reads $flag, treating an empty value as absent", ({ parse }) => {
    expect(command[parse]("value")).toBe("value");
    expect(command[parse]("")).toBeUndefined();
    expect(command[parse](undefined)).toBeUndefined();
    // An empty shell variable reaches commander as a valueless flag, which it
    // reports as `true`; rendering that would link to the word "true".
    expect(command[parse](true)).toBeUndefined();
  });

  it("prints the section when given no destination", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await command.run([], {});
    const printed = String(write.mock.calls[0]?.[0]);
    write.mockRestore();

    expect(printed).toContain("## 🎒 Bundles");
  });

  it("ignores a valueless flag rather than rendering it as text", async () => {
    const output = path.join(makeDirectory(), "section.md");

    // Commander reports `--baseline-url` with no value as `true`, without
    // calling the option's parser.
    await command.run([], { baselineUrl: true, output });

    const written = readFileSync(output, "utf8");

    expect(written).not.toContain("(true)");
    expect(written).toContain("no `main` baseline available yet");
  });

  it("declares the block it claims in a shared document", () => {
    expect(command.reportLabel).toBe("bundle sizes");
    expect(command.reportMarkers.start).toBe("<!-- bundle-sizes:start -->");
  });

  it("renders a body with no markers of its own", () => {
    const body = command.renderReport({
      baseline: undefined,
      baselineUrl: undefined,
    });

    expect(body.startsWith("## 🎒 Bundles")).toBe(true);
    expect(body).not.toContain("bundle-sizes:start");
  });

  it("writes the section alone to an output file", async () => {
    const output = path.join(makeDirectory(), "section.md");

    await command.run([], { output });

    const written = readFileSync(output, "utf8");

    expect(written).toContain("<!-- bundle-sizes:start -->");
    expect(written).toContain("`logger`");
  });

  it("splices the section into a markdown file, keeping its prose", async () => {
    const markdown = path.join(makeDirectory(), "description.md");
    writeFileSync(markdown, "## 🌰 Summary\n\nProse.\n", "utf8");

    await command.run([], { markdown });

    const written = readFileSync(markdown, "utf8");

    expect(written).toContain("## 🌰 Summary");
    expect(written.indexOf("## 🌰 Summary")).toBeLessThan(
      written.indexOf("## 🎒 Bundles"),
    );
  });

  it("replaces the section rather than appending on a second run", async () => {
    const markdown = path.join(makeDirectory(), "description.md");
    writeFileSync(markdown, "## 🌰 Summary\n", "utf8");

    await command.run([], { markdown });
    await command.run([], { markdown });

    const written = readFileSync(markdown, "utf8");

    expect(written.split("<!-- bundle-sizes:start -->")).toHaveLength(2);
  });

  it("creates the markdown file when it does not exist yet", async () => {
    const markdown = path.join(makeDirectory(), "description.md");

    await command.run([], { markdown });

    expect(readFileSync(markdown, "utf8")).toContain("## 🎒 Bundles");
  });

  it("passes the baseline through to collection", async () => {
    await command.run([], {
      baseline: ".baseline",
      output: path.join(makeDirectory(), "section.md"),
    });

    expect(collectRows).toHaveBeenCalledWith({
      baselineDirectory: ".baseline",
      workingDirectory: process.cwd(),
    });
  });
});
