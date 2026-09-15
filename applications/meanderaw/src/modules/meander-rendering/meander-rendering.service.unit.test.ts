import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { MeanderRenderingService } from "./meander-rendering.service";

import type { ParsedCode } from "../code/code.types";

// 🧪 Tests

// 🎯 Every fixture below is drawn at 6 rows, the same row count
// `mosaic-tile-motif.service.unit.test.ts` computes its own geometry
// fixtures at — `GridGeometryService.compute(6)` gives a unit of 10, an
// offset of 2.5, and a stroke width of 5 — so a reader can check one
// against the other rather than trusting a fresh set of numbers.
describe(MeanderRenderingService, () => {
  let service: MeanderRenderingService;

  /**
   * The Code `digits` spells, at the shape the fixtures are drawn at.
   *
   * Built directly rather than through `CodeService.parse`, because these
   * fixtures deliberately carry fewer levels than a 6-row meander really has:
   * the renderer draws what it is given level by level, and one level is
   * enough to assert where a segment lands.
   */
  const code = (digits: string, columns: number): ParsedCode => ({
    columns,
    digits,
    levels: digits.length / columns,
    rows: 6,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodeService,
        MosaicSymmetryService,
        MosaicTileService,
        GridGeometryService,
        MeanderRenderingService,
        SvgRenderingService,
      ],
    }).compile();

    service = await module.resolve(MeanderRenderingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("draws a bare point as a zero-length mark", () => {
      expect(service.render(code("0", 1))).toContain("M2.5 12.5H2.5");
    });

    it("draws an owned eastward edge as a one-unit horizontal segment", () => {
      expect(service.render(code("2", 1))).toContain("M2.5 12.5H12.5");
    });

    it("draws an owned southward edge as a one-unit vertical segment", () => {
      expect(service.render(code("4", 1))).toContain("M2.5 12.5V22.5");
    });

    it("draws both of a point's owned edges where it owns both, with no case of its own", () => {
      const svg = service.render(code("6", 1));

      expect(svg).toContain("M2.5 12.5H12.5");
      expect(svg).toContain("M2.5 12.5V22.5");
    });

    it("draws nothing of its own for a point reached only by a neighbor's north or west bit — that segment is the neighbor's own", () => {
      // 🎯 Not a dot either: a dot is a point neither owning nor reached by
      // any direction bit at all, and this one carries two.
      expect(service.render(code("9", 1))).toContain(
        '<path d="" stroke="black"',
      );
    });

    it("draws every point of a multi-column Code, each at its own column's offset", () => {
      const svg = service.render(code("20", 2));

      expect(svg).toContain("M2.5 12.5H12.5");
      expect(svg).toContain("M12.5 12.5H12.5");
    });

    it("draws every level of a multi-row Code, each one grid unit further down", () => {
      const svg = service.render(code("40", 1));

      expect(svg).toContain("M2.5 12.5V22.5");
      expect(svg).toContain("M2.5 22.5H2.5");
    });

    it("closes the drawing with a border rule along the top and bottom of the grid", () => {
      const svg = service.render(code("0", 1));

      expect(svg).toContain('<path d="M12.5 62.5H2.5M12.5 2.5H2.5"');
    });

    it("widens the border rule to match a wider grid", () => {
      const svg = service.render(code("00", 2));

      expect(svg).toContain('<path d="M22.5 62.5H2.5M22.5 2.5H2.5"');
    });

    it("wraps the drawn ink in a complete SVG document sized to the grid", () => {
      const svg = service.render(code("0", 1));

      expect(svg).toContain('width="15"');
      expect(svg).toContain('height="65"');
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });
  });
});
