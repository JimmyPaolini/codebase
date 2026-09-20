import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";
import { DatabaseService } from "../database/database.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";

import { DrawIndexService } from "./draw-index.service";

import type { Meander } from "../database/entities/Meander.entity";

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
    componentCount: 0,
    components: 1,
    cornerCount: 0,

    cycleCount: 0,
    cycles: 0,
    density: 0,
    dotCount: 0,
    edgeCount: 0,
    embeddedOCount: 0,
    embeddedUCount: 0,
    // cspell:ignore Neighbours

    families: [],
    freeEnds: 0,

    horizontalDashCount: 0,
    horizontalPointCount: 0,
    inkPointCount: 0,
    inkTJunctions: 0,
    inkXJunctions: 0,

    lCount: 0,
    longestHorizontalRun: 0,
    longestVerticalRun: 0,

    oCount: 0,
    pitch: 1,
    plusCount: 0,
    provenance: "hardcoded",

    characteristics: [],
    drawingHash: "hash",
    rows: 2,
    seamComponents: 0,
    seamCycles: 0,
    seamTJunctions: 0,
    seamXJunctions: 0,
    shapeICount: 0,
    tCount: 0,

    uCount: 0,
    verticalDashCount: 0,
    verticalPointCount: 0,
    xCount: 0,
    ...overrides,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawIndexService,
        GeometryService,
        {
          provide: DatabaseService,
          useValue: createMock<DatabaseService>(),
        },
        {
          provide: CodeService,
          useValue: {
            parse: (c: string) => ({
              columns: 3,
              digits: c,
              levels: 4,
              rows: 4,
            }),
          },
        },
        {
          provide: DrawingService,
          useValue: { render: () => '<path d="M1 1"/>' },
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
      const pages = service.render([
        meander({ code: "a", drawingHash: "hash", families: ["snake"], id: 1 }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain('<path d="M1 1"/>');
      expect(page).not.toContain("<img");
    });

    it("captions each figure with its lattice address", () => {
      const pages = service.render([
        meander({
          code: "abc",
          columns: 2,
          families: ["snake"],
          id: 1,
          rows: 3,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain("<figcaption>3×2 · abc</figcaption>");
    });

    it("appends a subFamily to the caption where the row earned one", () => {
      const pages = service.render([
        meander({
          characteristics: ["dots"],
          code: "abc",
          columns: 1,
          families: ["mosaic"],
          id: 1,
          rows: 3,
        }),
      ]);
      const page = pages["families/mosaic.html"] ?? "";

      expect(page).toContain("<figcaption>3×1 · abc (dots)</figcaption>");
    });

    it("lays the families out according to their declared sort key", () => {
      const pages = service.render([
        meander({ code: "a", families: ["parallel"], id: 1 }),
        meander({ code: "b", families: ["boxes"], id: 2 }),
        meander({ code: "c", families: ["snake"], id: 3 }),
      ]);

      const indexPage = pages["index.html"] ?? "";

      expect(indexPage.indexOf("boxes.html")).toBeLessThan(
        indexPage.indexOf("parallel.html"),
      );
      expect(indexPage.indexOf("parallel.html")).toBeLessThan(
        indexPage.indexOf("snake.html"),
      );
    });

    it("groups a null-family row into a dedicated unclassified section, sorted after every named family", () => {
      const pages = service.render([
        meander({ code: "a", families: [], id: 1 }),
        meander({ code: "b", families: ["snake"], id: 2 }),
      ]);

      expect(pages["families/unclassified.html"]).toContain(
        '<section id="unclassified">',
      );

      const indexPage = pages["index.html"] ?? "";

      expect(indexPage.indexOf("snake.html")).toBeLessThan(
        indexPage.indexOf("unclassified.html"),
      );
    });

    it("orders rows within a family by rows, then columns, then code", () => {
      const pages = service.render([
        meander({ code: "z", columns: 5, families: ["snake"], id: 1, rows: 3 }),
        meander({ code: "b", columns: 2, families: ["snake"], id: 2, rows: 4 }),
        meander({ code: "a", columns: 1, families: ["snake"], id: 3, rows: 4 }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      const shallow = page.indexOf("3×5 · z");
      const narrow = page.indexOf("4×1 · a");
      const wide = page.indexOf("4×2 · b");

      expect(shallow).toBeLessThan(narrow);
      expect(narrow).toBeLessThan(wide);
    });

    it("counts meanders in a section's own heading and in the page summary", () => {
      const pages = service.render([
        meander({ code: "a", families: ["snake"], id: 1 }),
        meander({ code: "b", families: ["snake"], id: 2 }),
        meander({ code: "c", families: ["boxes"], id: 3 }),
      ]);

      expect(pages["families/snake.html"]).toContain("2 meanders");
      expect(pages["families/boxes.html"]).toContain("1 meander<");
      expect(pages["index.html"]).toContain("3 meanders across 2 families.");
    });

    it("links each family section from a jump list", () => {
      const pages = service.render([
        meander({ code: "a", families: ["snake"], id: 1 }),
      ]);

      expect(pages["index.html"]).toContain(
        '<a href="families/snake.html">snake</a>',
      );
    });

    it("escapes a lattice address that would otherwise close a tag or an attribute", () => {
      const pages = service.render([
        meander({ code: '<script>&"', families: ["snake"], id: 1 }),
      ]);

      expect(pages["families/snake.html"]).toContain(
        "&lt;script&gt;&amp;&quot;",
      );
      expect(pages["families/snake.html"]).not.toContain("<script>");
    });

    it("defines each meander's own tile once and places it six times along a band", () => {
      const pages = service.render([
        meander({
          code: "a",
          columns: 3,
          drawingHash: "hash",
          families: ["snake"],
          id: 7,
          pitch: 3,
          rows: 4,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page.split('<path d="M1 1"/>')).toHaveLength(2);
      expect(page).toContain('<defs><g id="meander-7">');
      expect(page.split('<use href="#meander-7"')).toHaveLength(7);
    });

    it("steps each repeat one pitch further along the band, so the tiles meet rather than overlap or gap", () => {
      const pages = service.render([
        meander({
          code: "a",
          columns: 3,
          families: ["snake"],
          id: 1,
          pitch: 3,
          rows: 4,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain('<use href="#meander-1" x="0"/>');
      expect(page).toContain('<use href="#meander-1" x="45"/>');
      expect(page).toContain('<use href="#meander-1" x="225"/>');
      expect(page).not.toContain('<use href="#meander-1" x="270"/>');
    });

    it("sizes the band to hold every repeat at the tile's own height", () => {
      const pages = service.render([
        meander({
          code: "a",
          columns: 3,
          families: ["snake"],
          id: 1,
          pitch: 3,
          rows: 4,
        }),
      ]);
      const page = pages["families/snake.html"] ?? "";

      expect(page).toContain(
        '<svg width="277.5" height="67.5" viewBox="0 0 277.5 67.5" fill="none"',
      );
    });
  });
});
