import { describe, expect, it } from "vitest";

import {
  formatBytes,
  formatCount,
  formatDelta,
  formatPercent,
  formatUsage,
  groupByProject,
} from "./bundle-markdown.utilities";

import type { MetricRow } from "../bundles/bundles.types";

/** Builds a row with only the fields a case cares about. */
function buildRow(overrides: Partial<MetricRow> = {}): MetricRow {
  return {
    baseSize: undefined,
    breach: undefined,
    empty: false,
    label: "Compiled JavaScript",
    limit: undefined,
    measured: true,
    name: "Compiled JavaScript.size",
    project: "logger",
    removed: false,
    size: 1000,
    ...overrides,
  };
}

describe("bundle markdown utilities", () => {
  describe(formatBytes, () => {
    it.each([
      { bytes: 0, expected: "0.00 kB" },
      { bytes: 1000, expected: "1.00 kB" },
      { bytes: -2500, expected: "-2.50 kB" },
      { bytes: 1_000_000, expected: "1.00 MB" },
      { bytes: -1_500_000, expected: "-1.50 MB" },
    ])("formats $bytes as $expected", ({ bytes, expected }) => {
      expect(formatBytes(bytes)).toBe(expected);
    });

    it("uses decimal kilobytes, matching what codometer parses", () => {
      // `"8 KB"` in a config is 8000 bytes, so 8000 must print as 8.00 kB.
      expect(formatBytes(8000)).toBe("8.00 kB");
    });
  });

  describe(formatCount, () => {
    it.each([
      { count: 1, expected: "1 bundle" },
      { count: 0, expected: "0 bundles" },
      { count: 2, expected: "2 bundles" },
    ])("formats $count as $expected", ({ count, expected }) => {
      expect(formatCount(count, "bundle")).toBe(expected);
    });
  });

  describe(formatDelta, () => {
    it.each([
      { delta: undefined, expected: "—" },
      { delta: 0, expected: "+0.00 kB" },
      { delta: 1500, expected: "+1.50 kB" },
      { delta: -1500, expected: "-1.50 kB" },
    ])("formats $delta as $expected", ({ delta, expected }) => {
      expect(formatDelta(delta)).toBe(expected);
    });
  });

  describe(formatPercent, () => {
    it.each([
      { expected: "—", fraction: undefined },
      { expected: "+0.0%", fraction: 0 },
      { expected: "+12.3%", fraction: 0.1234 },
      { expected: "-5.0%", fraction: -0.05 },
    ])("formats $fraction as $expected", ({ expected, fraction }) => {
      expect(formatPercent(fraction)).toBe(expected);
    });
  });

  describe(formatUsage, () => {
    it("reports an em dash without a limit", () => {
      expect(formatUsage(buildRow())).toBe("—");
    });

    it("reports an em dash for a zero limit rather than dividing by it", () => {
      expect(formatUsage(buildRow({ limit: 0 }))).toBe("—");
    });

    it("reports the share of the limit consumed", () => {
      expect(formatUsage(buildRow({ limit: 1000, size: 500 }))).toBe("50%");
    });

    it("appends nothing to a nearly full metric, which a `warn` limit says", () => {
      expect(formatUsage(buildRow({ limit: 1000, size: 950 }))).toBe("95%");
    });

    it("reports a breach as the share it consumed, above one hundred", () => {
      expect(
        formatUsage(buildRow({ breach: "fail", limit: 1000, size: 1100 })),
      ).toBe("110%");
    });
  });

  describe(groupByProject, () => {
    it("keeps each project's bundles in the order they were declared", () => {
      const groups = groupByProject([
        buildRow({ label: "Client entry", project: "lexico" }),
        buildRow({ label: "Client route", project: "lexico" }),
        buildRow({ project: "logger" }),
      ]);

      expect(groups.map((group) => group.project)).toStrictEqual([
        "lexico",
        "logger",
      ]);
      expect(groups[0]?.rows.map((row) => row.label)).toStrictEqual([
        "Client entry",
        "Client route",
      ]);
    });

    it("returns nothing for no rows", () => {
      expect(groupByProject([])).toStrictEqual([]);
    });
  });
});
