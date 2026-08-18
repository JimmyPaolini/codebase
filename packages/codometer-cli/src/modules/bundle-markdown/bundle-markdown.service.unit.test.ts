import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BundleMarkdownService } from "./bundle-markdown.service";

import type { BundleRow } from "../bundles/bundles.types";

/** Builds a row with only the fields a case cares about. */
function buildRow(overrides: Partial<BundleRow> = {}): BundleRow {
  return {
    baseSize: undefined,
    measured: true,
    missing: false,
    name: "Compiled JavaScript",
    passed: true,
    project: "logger",
    removed: false,
    size: 1000,
    sizeLimit: undefined,
    ...overrides,
  };
}

describe(BundleMarkdownService, () => {
  let service: BundleMarkdownService;

  /** The row line for a bundle, without the surrounding section. */
  function renderRowFor(row: BundleRow): string {
    const section = service.renderSection({
      baselineUrl: undefined,
      rows: [row],
    });
    const line = section
      .split("\n")
      .find(
        (candidate) =>
          candidate.startsWith("| ") &&
          !candidate.startsWith("| `") &&
          candidate.includes(row.name),
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
        rows: [],
      });

      expect(section).toContain("No bundles were measured for this change.");
      expect(section).toContain("## 🎒 Bundles");
    });

    it("wraps the section in markers so it can be replaced later", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        rows: [buildRow()],
      });

      expect(section.startsWith("<!-- bundle-sizes:start -->")).toBe(true);
      expect(section.endsWith("<!-- bundle-sizes:end -->")).toBe(true);
    });

    it("says no baseline exists when nothing carries one", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        rows: [buildRow()],
      });

      expect(section).toContain("no `main` baseline available yet");
      expect(section).toContain("1 new");
    });

    it("links the baseline run when one is given", () => {
      const section = service.renderSection({
        baselineUrl: "https://example.test/runs/1",
        rows: [buildRow({ baseSize: 1000 })],
      });

      expect(section).toContain("[`main`](https://example.test/runs/1)");
    });

    it("reports nothing in common when no bundle overlaps the baseline", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
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
        rows: [
          buildRow({ name: "New name", size: 1000 }),
          buildRow({
            baseSize: 1000,
            measured: false,
            name: "Old name",
            removed: true,
            size: 0,
          }),
          buildRow({
            baseSize: 500,
            name: "Steady",
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
        rows: [
          buildRow({ baseSize: 1000, name: "First" }),
          buildRow({ name: "Second" }),
        ],
      });
      const whole = service.renderSection({
        baselineUrl: undefined,
        rows: [
          buildRow({ baseSize: 1000, name: "First" }),
          buildRow({ baseSize: 1000, name: "Second" }),
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
        rows: [buildRow()],
      });

      expect(section).not.toContain("**1 bundle**");
    });

    it("reports no percentage when the baseline measured zero bytes", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        rows: [buildRow({ baseSize: 0, size: 100 })],
      });

      expect(section).toContain("+0.10 kB (—)");
    });

    it("shows a skipped bundle's limit when it has one", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        rows: [
          buildRow({
            baseSize: 2000,
            measured: false,
            size: 2000,
            sizeLimit: 4000,
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
        rows: [buildRow({ baseSize: 2000, measured: false, size: 2000 })],
      });

      expect(section).toContain("💤 Unchanged by this pull request");
      expect(section).toContain("Size on `main`");
      expect(section).toContain("This change rebuilt no measured project.");
    });

    it("names the bundle that grew most", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        rows: [
          buildRow({ baseSize: 1000, name: "Small growth", size: 1100 }),
          buildRow({
            baseSize: 1000,
            name: "Big growth",
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
        rows: [
          buildRow({ baseSize: 100, name: "Cheap", size: 200 }),
          buildRow({
            baseSize: 10_000,
            name: "Costly",
            project: "other",
            size: 20_000,
          }),
        ],
      });

      expect(section).toContain("**Biggest increase:** `other` Costly");
    });
  });

  describe("status icons", () => {
    it.each([
      { expected: "🆕", row: buildRow() },
      { expected: "✅", row: buildRow({ baseSize: 1000 }) },
      { expected: "✅", row: buildRow({ baseSize: 2000 }) },
      { expected: "⚠️", row: buildRow({ baseSize: 990 }) },
      { expected: "📈", row: buildRow({ baseSize: 500 }) },
      { expected: "❌", row: buildRow({ passed: false }) },
      { expected: "⁉️", row: buildRow({ missing: true, size: 0 }) },
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

    it("fails the whole report when any bundle breached its limit", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        rows: [buildRow({ passed: false })],
      });

      expect(section).toContain("❌ **1.00 kB**");
    });

    it("flags overall growth beyond the significant threshold", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        rows: [buildRow({ baseSize: 500, size: 1000 })],
      });

      expect(section).toContain("📈 **1.00 kB**");
    });

    it("notes overall growth under the significant threshold", () => {
      const section = service.renderSection({
        baselineUrl: undefined,
        rows: [buildRow({ baseSize: 990, size: 1000 })],
      });

      expect(section).toContain("⚠️ **1.00 kB**");
    });
  });

  describe("spliceSection", () => {
    const section =
      "<!-- bundle-sizes:start -->\nbody\n<!-- bundle-sizes:end -->";

    it("appends the section to a description that has none", () => {
      expect(service.spliceSection("## Summary\n\nProse.", section)).toBe(
        `## Summary\n\nProse.\n\n${section}`,
      );
    });

    it("replaces an existing section in place", () => {
      const first = service.spliceSection("## Summary", section);
      const replacement = section.replace("body", "fresher body");

      expect(service.spliceSection(first, replacement)).toBe(
        `## Summary\n\n${replacement}`,
      );
    });

    it("is idempotent", () => {
      const once = service.spliceSection("## Summary", section);

      expect(service.spliceSection(once, section)).toBe(once);
    });

    it("keeps prose written after the section", () => {
      const description = `## Summary\n\n${section}\n\n## Footer`;

      expect(service.spliceSection(description, section)).toContain(
        "## Footer",
      );
    });

    it("handles an empty description", () => {
      expect(service.spliceSection("", section)).toBe(section);
    });
  });
});
