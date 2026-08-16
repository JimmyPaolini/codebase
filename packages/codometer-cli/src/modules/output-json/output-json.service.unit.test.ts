import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { buildCodeStatistics } from "../../../testing/mocks";

import { OutputJsonService } from "./output-json.service";

const sampleStatistics = buildCodeStatistics({
  folders: 13,
  linesOfCode: 31,
  repoSizeMiB: 2,
  sourceFiles: 41,
});

describe(OutputJsonService, () => {
  let service: OutputJsonService;
  const temporaryDirectories: string[] = [];

  /** Creates a temp directory that is removed after the test. */
  function createTemporaryDirectory(): string {
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "codometer-"));
    temporaryDirectories.push(temporaryDirectory);

    return temporaryDirectory;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [OutputJsonService],
    }).compile();

    service = await module.resolve(OutputJsonService);
  });

  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0)) {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("renders the statistics with the configured indentation", () => {
    const report = service.buildReport({
      destination: { indentation: 4, path: "statistics.json" },
      statistics: sampleStatistics,
    });

    expect(report).toBe(`${JSON.stringify(sampleStatistics, null, 4)}\n`);
    expect(report.endsWith("\n")).toBe(true);
  });

  it("writes the report, creating missing parent directories", () => {
    const reportPath = path.join(
      createTemporaryDirectory(),
      "output/reports/codometer.json",
    );

    expect(
      service.sync({
        check: false,
        destination: { indentation: 2, path: reportPath },
        statistics: sampleStatistics,
      }),
    ).toBe(true);
    expect(existsSync(reportPath)).toBe(true);
    expect(JSON.parse(readFileSync(reportPath, "utf8"))).toStrictEqual(
      sampleStatistics,
    );
  });

  it("returns true in check mode when the report is current", () => {
    const reportPath = path.join(createTemporaryDirectory(), "codometer.json");
    const destination = { indentation: 2, path: reportPath };

    service.sync({ check: false, destination, statistics: sampleStatistics });

    expect(
      service.sync({ check: true, destination, statistics: sampleStatistics }),
    ).toBe(true);
  });

  it("returns false in check mode when the report is stale", () => {
    const reportPath = path.join(createTemporaryDirectory(), "codometer.json");

    writeFileSync(reportPath, "{}\n", "utf8");

    expect(
      service.sync({
        check: true,
        destination: { indentation: 2, path: reportPath },
        statistics: sampleStatistics,
      }),
    ).toBe(false);
  });

  it("returns false in check mode when the report is missing", () => {
    const reportPath = path.join(createTemporaryDirectory(), "codometer.json");

    expect(
      service.sync({
        check: true,
        destination: { indentation: 2, path: reportPath },
        statistics: sampleStatistics,
      }),
    ).toBe(false);
  });
});
