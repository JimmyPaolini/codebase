import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BundlesService } from "./bundles.service";

/**
 * A report entry as size-limit writes it, before the service normalizes it. It
 * omits `size` when a `path` glob matched nothing.
 */
interface RawSizeLimitEntry {
  name: string;
  passed?: boolean;
  size?: number;
  sizeLimit?: number;
}

describe(BundlesService, () => {
  let service: BundlesService;
  const temporaryDirectories: string[] = [];

  /** Lays out size-limit reports inside a throwaway workspace. */
  function writeWorkspace(
    reports: Record<string, RawSizeLimitEntry[] | string>,
  ): string {
    const workingDirectory = mkdtempSync(
      path.join(tmpdir(), "codometer-bundles-"),
    );
    temporaryDirectories.push(workingDirectory);

    for (const [reportPath, entries] of Object.entries(reports)) {
      const absolute = path.join(workingDirectory, reportPath);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(
        absolute,
        typeof entries === "string" ? entries : JSON.stringify(entries),
        "utf8",
      );
    }

    return workingDirectory;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BundlesService],
    }).compile();

    service = await module.resolve(BundlesService);
  });

  afterAll(() => {
    for (const directory of temporaryDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a report from every workspace directory", () => {
    const workingDirectory = writeWorkspace({
      "applications/lexico/size-limit-report.json": [
        { name: "Client JS", passed: true, size: 100, sizeLimit: 200 },
      ],
      "packages/logger/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: true, size: 50 },
      ],
      "tools/synchronization/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: true, size: 25 },
      ],
    });

    const rows = service.collectRows({
      baselineDirectory: undefined,
      workingDirectory,
    });

    expect(rows.map((row) => row.project)).toStrictEqual([
      "lexico",
      "logger",
      "synchronization",
    ]);
    expect(rows.every((row) => row.measured)).toBe(true);
    expect(rows.every((row) => row.baseSize === undefined)).toBe(true);
  });

  it("joins a measured bundle to its baseline by name", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: true, size: 40 },
      ],
      "packages/logger/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: true, size: 50 },
      ],
    });

    const [row] = service.collectRows({
      baselineDirectory: ".baseline",
      workingDirectory,
    });

    expect(row?.baseSize).toBe(40);
    expect(row?.size).toBe(50);
    expect(row?.measured).toBe(true);
  });

  it("marks a baseline bundle the rebuild dropped as removed", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: true, size: 40 },
        { name: "Retired", passed: true, size: 10 },
      ],
      "packages/logger/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: true, size: 50 },
      ],
    });

    const rows = service.collectRows({
      baselineDirectory: ".baseline",
      workingDirectory,
    });
    const retired = rows.find((row) => row.name === "Retired");

    expect(retired?.removed).toBe(true);
    expect(retired?.size).toBe(0);
    expect(retired?.baseSize).toBe(10);
  });

  it("carries the baseline size for a project this run never rebuilt", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: true, size: 40 },
      ],
    });

    const [row] = service.collectRows({
      baselineDirectory: ".baseline",
      workingDirectory,
    });

    expect(row?.measured).toBe(false);
    expect(row?.removed).toBe(false);
    expect(row?.size).toBe(40);
  });

  it("treats a bundle that matched no files as missing", () => {
    const workingDirectory = writeWorkspace({
      "packages/logger/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: true, size: 0 },
      ],
    });

    const [row] = service.collectRows({
      baselineDirectory: undefined,
      workingDirectory,
    });

    expect(row?.missing).toBe(true);
  });

  it.each([
    { label: "malformed", report: "{ not json" },
    { label: "not an array", report: '{"name":"x"}' },
  ])("tolerates a $label report", ({ report }) => {
    const workingDirectory = writeWorkspace({
      "packages/logger/size-limit-report.json": report,
    });

    expect(
      service.collectRows({ baselineDirectory: undefined, workingDirectory }),
    ).toStrictEqual([]);
  });

  it("treats an entry with no size as zero bytes on both sides", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/size-limit-report.json": [{ name: "Ghost" }],
      "packages/logger/size-limit-report.json": [{ name: "Compiled" }],
    });

    const rows = service.collectRows({
      baselineDirectory: ".baseline",
      workingDirectory,
    });

    expect(
      rows.map((row) => [row.name, row.size, row.sizeLimit]),
    ).toStrictEqual([
      ["Compiled", 0, undefined],
      ["Ghost", 0, undefined],
    ]);
  });

  it("reports a breached limit as not passed", () => {
    const workingDirectory = writeWorkspace({
      "packages/logger/size-limit-report.json": [
        { name: "Compiled JavaScript", passed: false, size: 90, sizeLimit: 50 },
      ],
    });

    const [row] = service.collectRows({
      baselineDirectory: undefined,
      workingDirectory,
    });

    expect(row?.passed).toBe(false);
    expect(row?.sizeLimit).toBe(50);
  });
});
