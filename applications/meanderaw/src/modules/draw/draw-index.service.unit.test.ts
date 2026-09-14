import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MeanderDatabaseService } from "../meander-database/meander-database.service";

import { DrawIndexService } from "./draw-index.service";

import type { Meander } from "../meander-database/entities/Meander.entity";

/**
 * Covers `DrawIndexService.render` in isolation, against a small, hand-built
 * set of rows rather than a real database round trip — the pure half of
 * spec #813's Testing Decisions for this seam. `draw-index.service.integration.test.ts`
 * covers `build`, which adds nothing over `render` beyond the query itself.
 */
describe(DrawIndexService, () => {
  let service: DrawIndexService;

  /** Every field a fixture row does not care about, defaulted so a case only spells out what it means to test. */
  const meander = (
    overrides: Partial<Meander> & Pick<Meander, "code" | "id">,
  ): Meander => ({
    columns: 1,
    components: 1,
    cycles: 0,
    family: null,
    freeEnds: 0,
    hasBranching: false,
    hasCrossing: false,
    inkTJunctions: 0,
    inkXJunctions: 0,
    negativeTJunctions: 0,
    negativeXJunctions: 0,
    pitch: 1,
    provenance: "hardcoded",
    rows: 2,
    subFamily: null,
    svg: '<svg width="1" height="1"><path d="M0 0"/></svg>',
    ...overrides,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawIndexService,
        {
          provide: MeanderDatabaseService,
          useValue: createMock<MeanderDatabaseService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawIndexService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("embeds every meander's own SVG rather than linking to a file", () => {
      const page = service.render([
        meander({ code: "a", id: 1, svg: '<svg><path d="M1 1"/></svg>' }),
      ]);

      expect(page).toContain('<path d="M1 1"/>');
      expect(page).not.toContain("<img");
    });

    it("captions each figure with its lattice address", () => {
      const page = service.render([
        meander({ code: "abc", columns: 2, id: 1, rows: 3 }),
      ]);

      expect(page).toContain("<figcaption>3×2 · abc</figcaption>");
    });

    it("appends a subFamily to the caption where the row earned one", () => {
      const page = service.render([
        meander({
          code: "abc",
          columns: 1,
          family: "mosaic",
          id: 1,
          rows: 3,
          subFamily: "dots",
        }),
      ]);

      expect(page).toContain("<figcaption>3×1 · abc (dots)</figcaption>");
    });

    it("lays the families out in the order they are declared rather than alphabetically", () => {
      const page = service.render([
        meander({ code: "a", family: "mosaic", id: 1 }),
        meander({ code: "b", family: "boxes", id: 2 }),
        meander({ code: "c", family: "snake", id: 3 }),
      ]);

      expect(page.indexOf("<h2>snake</h2>")).toBeLessThan(
        page.indexOf("<h2>boxes</h2>"),
      );
      expect(page.indexOf("<h2>boxes</h2>")).toBeLessThan(
        page.indexOf("<h2>mosaic</h2>"),
      );
    });

    it("groups a null-family row into a dedicated unclassified section, sorted after every named family", () => {
      const page = service.render([
        meander({ code: "a", family: null, id: 1 }),
        meander({ code: "b", family: "snake", id: 2 }),
      ]);

      expect(page).toContain('<section id="unclassified">');
      expect(page.indexOf("<h2>snake</h2>")).toBeLessThan(
        page.indexOf("<h2>unclassified</h2>"),
      );
    });

    it("orders rows within a family by rows, then columns, then code", () => {
      const page = service.render([
        meander({ code: "z", columns: 5, family: "snake", id: 1, rows: 3 }),
        meander({ code: "b", columns: 2, family: "snake", id: 2, rows: 4 }),
        meander({ code: "a", columns: 1, family: "snake", id: 3, rows: 4 }),
      ]);

      const shallow = page.indexOf("3×5 · z");
      const narrow = page.indexOf("4×1 · a");
      const wide = page.indexOf("4×2 · b");

      expect(shallow).toBeLessThan(narrow);
      expect(narrow).toBeLessThan(wide);
    });

    it("counts meanders in a section's own heading and in the page summary", () => {
      const page = service.render([
        meander({ code: "a", family: "snake", id: 1 }),
        meander({ code: "b", family: "snake", id: 2 }),
        meander({ code: "c", family: "boxes", id: 3 }),
      ]);

      expect(page).toContain("2 meanders");
      expect(page).toContain("1 meander<");
      expect(page).toContain("3 meanders across 2 families.");
    });

    it("links each family section from a jump list", () => {
      const page = service.render([
        meander({ code: "a", family: "snake", id: 1 }),
      ]);

      expect(page).toContain('<a href="#snake">snake</a>');
    });

    it("escapes a lattice address that would otherwise close a tag or an attribute", () => {
      const page = service.render([meander({ code: '<script>&"', id: 1 })]);

      expect(page).toContain("&lt;script&gt;&amp;&quot;");
      expect(page).not.toContain("<script>");
    });

    it("refuses a row whose svg field is not a well-formed inline SVG document, rather than emitting broken markup", () => {
      expect(() =>
        service.render([
          meander({ code: "broken", id: 1, svg: "<div>not an svg</div>" }),
        ]),
      ).toThrow(/well-formed inline <svg>/);
    });
  });
});
