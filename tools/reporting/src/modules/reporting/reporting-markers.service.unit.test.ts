import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ReportingMarkersService } from "./reporting-markers.service";

import type { ReportMarkers } from "./reporting.types";

const MARKERS: ReportMarkers = {
  end: "<!-- report:end -->",
  start: "<!-- report:start -->",
};

const OTHER_MARKERS: ReportMarkers = {
  end: "<!-- other:end -->",
  start: "<!-- other:start -->",
};

describe(ReportingMarkersService, () => {
  let service: ReportingMarkersService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ReportingMarkersService],
    }).compile();

    service = await module.resolve(ReportingMarkersService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("wrap", () => {
    it("puts the body between the markers", () => {
      expect(service.wrap("body", MARKERS)).toBe(
        "<!-- report:start -->\nbody\n<!-- report:end -->",
      );
    });
  });

  describe("splice", () => {
    const section = "<!-- report:start -->\nbody\n<!-- report:end -->";

    it("appends the section to a document that has none", () => {
      expect(service.splice("## Summary\n\nProse.", section, MARKERS)).toBe(
        `## Summary\n\nProse.\n\n${section}`,
      );
    });

    it("replaces an existing section in place", () => {
      const first = service.splice("## Summary", section, MARKERS);
      const replacement = section.replace("body", "fresher body");

      expect(service.splice(first, replacement, MARKERS)).toBe(
        `## Summary\n\n${replacement}`,
      );
    });

    it("is idempotent", () => {
      const once = service.splice("## Summary", section, MARKERS);

      expect(service.splice(once, section, MARKERS)).toBe(once);
    });

    it("keeps prose written after the section", () => {
      const document = `## Summary\n\n${section}\n\n## Footer`;

      expect(service.splice(document, section, MARKERS)).toContain("## Footer");
    });

    it("handles an empty document", () => {
      expect(service.splice("", section, MARKERS)).toBe(section);
    });

    it("leaves another report's section alone", () => {
      const other = service.wrap("elsewhere", OTHER_MARKERS);
      const document = service.splice(other, section, MARKERS);

      expect(document).toContain("elsewhere");
      expect(document).toContain("body");
    });
  });
});
