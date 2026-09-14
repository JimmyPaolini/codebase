import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { MeanderRenderingService } from "./meander-rendering.service";

import type { MeanderPointGrid } from "../meander-decoding/meander-decoding.types";

// 🧪 Tests

// 🎯 Every fixture below is drawn at 6 rows, the same row count
// `mosaic-tile-motif.service.unit.test.ts` computes its own geometry
// fixtures at — `GridGeometryService.compute(6)` gives a unit of 10, an
// offset of 2.5, and a stroke width of 5 — so a reader can check one
// against the other rather than trusting a fresh set of numbers.
describe(MeanderRenderingService, () => {
  let service: MeanderRenderingService;

  const bare = { east: false, north: false, south: false, west: false };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
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
      const grid: MeanderPointGrid = [[bare]];

      expect(service.render(grid, 6, 1)).toContain("M2.5 12.5H2.5");
    });

    it("draws an owned eastward edge as a one-unit horizontal segment", () => {
      const grid: MeanderPointGrid = [
        [{ east: true, north: false, south: false, west: false }],
      ];

      expect(service.render(grid, 6, 1)).toContain("M2.5 12.5H12.5");
    });

    it("draws an owned southward edge as a one-unit vertical segment", () => {
      const grid: MeanderPointGrid = [
        [{ east: false, north: false, south: true, west: false }],
      ];

      expect(service.render(grid, 6, 1)).toContain("M2.5 12.5V22.5");
    });

    it("draws both of a point's owned edges where it owns both, with no case of its own", () => {
      const grid: MeanderPointGrid = [
        [{ east: true, north: false, south: true, west: false }],
      ];
      const svg = service.render(grid, 6, 1);

      expect(svg).toContain("M2.5 12.5H12.5");
      expect(svg).toContain("M2.5 12.5V22.5");
    });

    it("draws nothing of its own for a point reached only by a neighbor's north or west bit — that segment is the neighbor's own", () => {
      const grid: MeanderPointGrid = [
        [{ east: false, north: true, south: false, west: true }],
      ];

      // 🎯 Not a dot either: a dot is a point neither owning nor reached by
      // any direction bit at all, and this one carries two.
      expect(service.render(grid, 6, 1)).toContain('<path d="" stroke="black"');
    });

    it("draws every point of a multi-column grid, each at its own column's offset", () => {
      const grid: MeanderPointGrid = [
        [{ east: true, north: false, south: false, west: false }, bare],
      ];

      const svg = service.render(grid, 6, 2);

      expect(svg).toContain("M2.5 12.5H12.5");
      expect(svg).toContain("M12.5 12.5H12.5");
    });

    it("draws every level of a multi-row grid, each one grid unit further down", () => {
      const grid: MeanderPointGrid = [
        [{ east: false, north: false, south: true, west: false }],
        [bare],
      ];

      const svg = service.render(grid, 6, 1);

      expect(svg).toContain("M2.5 12.5V22.5");
      expect(svg).toContain("M2.5 22.5H2.5");
    });

    it("closes the drawing with a border rule along the top and bottom of the grid", () => {
      const grid: MeanderPointGrid = [[bare]];

      const svg = service.render(grid, 6, 1);

      expect(svg).toContain('<path d="M12.5 62.5H2.5M12.5 2.5H2.5"');
    });

    it("widens the border rule to match a wider grid", () => {
      const grid: MeanderPointGrid = [[bare, bare]];

      const svg = service.render(grid, 6, 2);

      expect(svg).toContain('<path d="M22.5 62.5H2.5M22.5 2.5H2.5"');
    });

    it("wraps the drawn ink in a complete SVG document sized to the grid", () => {
      const grid: MeanderPointGrid = [[bare]];

      const svg = service.render(grid, 6, 1);

      expect(svg).toContain('width="15"');
      expect(svg).toContain('height="65"');
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });
  });
});
