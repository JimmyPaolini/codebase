import { AnchorsModule, CODEPENDIX_SECTION_HEADING } from "@codependix/cli";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logger";

import { ExportDeliveryModule } from "../export-delivery/export-delivery.module";

import {
  HAND_WRITTEN_SECTION_README,
  NESTJS_ANCHOR,
  NX_ANCHOR,
  PLAIN_README,
} from "./anchor-placement.constants";
import { AnchorPlacementService } from "./anchor-placement.service";

describe(AnchorPlacementService, () => {
  let service: AnchorPlacementService;

  /** Counts how many times the section heading appears in a file. */
  function countHeadings(content: string): number {
    return content.split(CODEPENDIX_SECTION_HEADING).length - 1;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [LoggerModule, AnchorsModule, ExportDeliveryModule],
      providers: [AnchorPlacementService],
    }).compile();

    service = await module.resolve(AnchorPlacementService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("insert", () => {
    it("appends a whole section to a file that carries none", () => {
      expect.hasAssertions();

      const updated = service.insert({
        anchorName: NX_ANCHOR,
        fileContent: PLAIN_README,
        subheading: "Nx Neighborhood",
      });

      expect(countHeadings(updated)).toBe(1);
      expect(updated).toContain("### Nx Neighborhood");
      expect(updated.indexOf("A fixture project.")).toBeLessThan(
        updated.indexOf(CODEPENDIX_SECTION_HEADING),
      );
    });

    it("adds a second graph type under the section that already exists", () => {
      expect.hasAssertions();

      const updated = service.insert({
        anchorName: NESTJS_ANCHOR,
        fileContent: service.insert({
          anchorName: NX_ANCHOR,
          fileContent: PLAIN_README,
          subheading: "Nx Neighborhood",
        }),
        subheading: "NestJS Module Graph",
      });

      expect(countHeadings(updated)).toBe(1);
      expect(updated).toContain(NX_ANCHOR);
      expect(updated).toContain(NESTJS_ANCHOR);
    });

    it("reuses a heading a human wrote by hand, and keeps what follows it", () => {
      expect.hasAssertions();

      const updated = service.insert({
        anchorName: NX_ANCHOR,
        fileContent: HAND_WRITTEN_SECTION_README,
        subheading: "Nx Neighborhood",
      });

      expect(countHeadings(updated)).toBe(1);
      expect(updated).toContain("## License");
      expect(updated.indexOf(NX_ANCHOR)).toBeLessThan(
        updated.indexOf("## License"),
      );
    });

    it("places a subheading-less anchor directly under the heading", () => {
      expect.hasAssertions();

      const updated = service.insert({
        anchorName: NX_ANCHOR,
        fileContent: PLAIN_README,
        subheading: undefined,
      });

      expect(updated).not.toContain("###");
    });
  });

  describe("describeError", () => {
    it("names the error class when an Error was raised", () => {
      expect.hasAssertions();
      expect(service.describeError(new TypeError("no README"))).toBe(
        "TypeError: no README",
      );
    });

    it("falls back to the raised value itself when it was not an Error", () => {
      expect.hasAssertions();
      expect(service.describeError("no README")).toBe("no README");
    });
  });

  describe("build", () => {
    it("builds the Markdown-mode and auto-creation documents", () => {
      expect.hasAssertions();
      expect(service.build().map((document) => document.id)).toStrictEqual([
        "11-markdown-modes",
        "12-auto-created-sections",
      ]);
    });
  });
});
