import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BundleMarkdownService } from "./bundle-markdown.service";

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

describe(BundleMarkdownService, () => {
  let service: BundleMarkdownService;

  /** The row line for a bundle, without the surrounding section. */
  function renderRowFor(row: MetricRow): string {
    const section = service.renderSection({
      baselineUrl: undefined,
      failures: [],
      rows: [row],
    });
    const line = section
      .split("\n")
      .find(
        (candidate) =>
          candidate.startsWith("| ") &&
          !candidate.startsWith("| `") &&
          candidate.includes(row.label),
      );

    return line ?? "";
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BundleMarkdownService],
    }).compile();

    service = await module.resolve(BundleMarkdownService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("renderSection", () => {
    it("says so when nothing was measured", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [],
      });

      expect(section).toContain("No bundles were measured for this change.");
      expect(section).toContain("## 🎒 Bundles");
    });

    it("leads with its heading and carries no markers of its own", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow()],
      });

      expect(section.startsWith("## 🎒 Bundles")).toBe(true);
      expect(section).not.toContain("bundle-sizes:start");
    });

    it("says no baseline exists when nothing carries one", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow()],
      });

      expect(section).toContain("no `main` baseline available yet");
      expect(section).toContain("1 new");
    });

    it("links the baseline run when one is given", () => {
      const section = service.renderSection({
        baselineUrl: "https://example.test/runs/1",
        failures: [],
        rows: [buildRow({ baseSize: 1000 })],
      });

      expect(section).toContain("[`main`](https://example.test/runs/1)");
    });

    it("reports nothing in common when no bundle overlaps the baseline", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow(),
          buildRow({ baseSize: 500, measured: false, removed: true, size: 0 }),
        ],
      });

      expect(section).toContain("nothing in common with `main` to compare");
      expect(section).toContain("1 new, 1 removed");
    });

    it("counts a rename as an addition and a removal, not a saving", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({ label: "New name", size: 1000 }),
          buildRow({
            baseSize: 1000,
            label: "Old name",
            measured: false,
            removed: true,
            size: 0,
          }),
          buildRow({
            baseSize: 500,
            label: "Steady",
            project: "other",
            size: 500,
          }),
        ],
      });

      // The steady bundle is the only comparable one, so the headline must
      // report no change rather than the removed bundle's whole size.
      expect(section).toContain("+0.00 kB (+0.0%)");
      expect(section).toContain("1 new, 1 removed");
    });

    it("totals a project only when every bundle is comparable", () => {
      const partial = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({ baseSize: 1000, label: "First" }),
          buildRow({ label: "Second" }),
        ],
      });
      const whole = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({ baseSize: 1000, label: "First" }),
          buildRow({ baseSize: 1000, label: "Second" }),
        ],
      });

      expect(partial).toContain("| **2 bundles** | **2.00 kB** | — | — | — |");
      expect(whole).toContain(
        "| **2 bundles** | **2.00 kB** | 2.00 kB | +0.00 kB | +0.0% |",
      );
    });

    it("omits a subtotal for a project with one live bundle", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow()],
      });

      expect(section).not.toContain("**1 bundle**");
    });

    it("reports no percentage when the baseline measured zero bytes", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseSize: 0, size: 100 })],
      });

      expect(section).toContain("+0.10 kB (—)");
    });

    it("shows a skipped bundle's limit when it has one", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({
            baseSize: 2000,
            limit: 4000,
            measured: false,
            size: 2000,
          }),
        ],
      });

      expect(section).toContain(
        "| `logger` | Compiled JavaScript | 2.00 kB | 4.00 kB |",
      );
    });

    it("lists bundles this run did not rebuild in their own section", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseSize: 2000, measured: false, size: 2000 })],
      });

      expect(section).toContain("💤 Unchanged by this pull request");
      expect(section).toContain("Size on `main`");
      expect(section).toContain("This change rebuilt no measured project.");
    });

    it("names the bundle that grew most", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({ baseSize: 1000, label: "Small growth", size: 1100 }),
          buildRow({
            baseSize: 1000,
            label: "Big growth",
            project: "other",
            size: 2000,
          }),
        ],
      });

      expect(section).toContain("**Biggest increase:** `other` Big growth");
    });

    it("breaks a tie in proportional growth on absolute bytes", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({ baseSize: 100, label: "Cheap", size: 200 }),
          buildRow({
            baseSize: 10_000,
            label: "Costly",
            project: "other",
            size: 20_000,
          }),
        ],
      });

      expect(section).toContain("**Biggest increase:** `other` Costly");
    });
  });

  describe("failures", () => {
    const failure = {
      kind: "target" as const,
      project: "logger",
      reason: "the build output is missing",
      subject: "Compiled JavaScript",
    };

    it("names a failed target above the table rather than dropping it", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [failure],
        rows: [buildRow()],
      });

      expect(section).toContain("1 target could not be measured");
      expect(section).toContain(
        "| 🚫 | `logger` | Compiled JavaScript | the build output is missing |",
      );
    });

    it("fails the whole report when anything could not be measured", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [failure],
        rows: [buildRow({ baseSize: 1000 })],
      });

      expect(section).toContain("❌ **1.00 kB**");
    });

    it("still names failures when nothing was measured at all", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [failure],
        rows: [],
      });

      expect(section).toContain("1 target could not be measured");
      expect(section).toContain("No bundles were measured for this change.");
    });

    it("says nothing about failures on an ordinary run", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow()],
      });

      expect(section).not.toContain("could not be measured");
      expect(section).not.toContain("🚫 |");
    });

    it("pluralizes the count across several failures", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [failure, { ...failure, project: "lexico" }],
        rows: [],
      });

      expect(section).toContain("2 targets could not be measured");
    });
  });

  describe("status icons", () => {
    it.each([
      { expected: "🆕", row: buildRow() },
      { expected: "✅", row: buildRow({ baseSize: 1000 }) },
      { expected: "✅", row: buildRow({ baseSize: 2000 }) },
      { expected: "⚠️", row: buildRow({ baseSize: 990 }) },
      { expected: "📈", row: buildRow({ baseSize: 500 }) },
      {
        expected: "❌",
        row: buildRow({ breach: "fail", limit: 500 }),
      },
      {
        expected: "❗",
        row: buildRow({ breach: "warn", limit: 500 }),
      },
      { expected: "⁉️", row: buildRow({ empty: true, size: 0 }) },
      {
        expected: "🗑️",
        row: buildRow({
          baseSize: 1000,
          measured: false,
          removed: true,
          size: 0,
        }),
      },
    ])("marks a row $expected", ({ expected, row }) => {
      expect(renderRowFor(row).startsWith(`| ${expected} |`)).toBe(true);
    });

    it("fails the whole report when a metric breached a failing limit", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ breach: "fail", limit: 500 })],
      });

      expect(section).toContain("❌ **1.00 kB**");
    });

    it("advises rather than fails when only a warning limit breached", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [
          buildRow({
            baseSize: 1000,
            breach: "warn",
            limit: 500,
          }),
        ],
      });

      expect(section).toContain("❗ **1.00 kB**");
    });

    it("fails the whole report when a target matched no files", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ empty: true, size: 0 })],
      });

      expect(section).toContain("❌ **0.00 kB**");
    });

    it("flags overall growth beyond the significant threshold", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseSize: 500, size: 1000 })],
      });

      expect(section).toContain("📈 **1.00 kB**");
    });

    it("notes overall growth under the significant threshold", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        failures: [],
        rows: [buildRow({ baseSize: 990, size: 1000 })],
      });

      expect(section).toContain("⚠️ **1.00 kB**");
    });
  });
});
