import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  OffLatticeCoordinateError,
  UnmeasurableDocumentError,
  UnsupportedPathCommandError,
} from "./meander-lattice.constants";
import { MeanderLatticeService } from "./meander-lattice.service";

// 🔧 Configuration

/**
 * The stroke width every constructed document below is drawn at, and the
 * grid it implies: a grid pitch of two stroke widths and a first lattice
 * line half a stroke width in from the canvas edge. Those are invariant 2's
 * own arithmetic, so a document drawn at 6 puts its lattice lines on
 * 3, 15, 27, 39 — the same coordinates `5 rows` produces for real.
 */
const STROKE_WIDTH = 6;

/** Wraps path data in a document whose canvas is exactly `columns` by `rows` grid pitches, plus the half stroke width each edge carries. */
const buildDocument = (options: {
  readonly columns: number;
  readonly paths: readonly string[];
  readonly rows: number;
}): string => {
  const width = options.columns * STROKE_WIDTH * 2 + STROKE_WIDTH;
  const height = options.rows * STROKE_WIDTH * 2 + STROKE_WIDTH;
  const paths = options.paths
    .map(
      (pathData) =>
        `<path d="${pathData}" stroke="black" stroke-width="${STROKE_WIDTH}" stroke-linecap="square"/>\n`,
    )
    .join("");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${paths}</svg>\n`;
};

// 🧪 Tests

describe(MeanderLatticeService, () => {
  let service: MeanderLatticeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MeanderLatticeService],
    }).compile();

    service = await module.resolve(MeanderLatticeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("build", () => {
    it("derives the lattice extent from the canvas and the stroke width", () => {
      const graph = service.build(
        buildDocument({ columns: 4, paths: ["M3 3H51"], rows: 2 }),
      );

      expect(graph.columns).toBe(4);
      expect(graph.rows).toBe(2);
    });

    it("splits a horizontal run into one edge per grid step", () => {
      const graph = service.build(
        buildDocument({ columns: 3, paths: ["M3 3H39"], rows: 1 }),
      );

      expect([...graph.horizontalEdges].toSorted()).toStrictEqual([
        "0,0",
        "1,0",
        "2,0",
      ]);
      expect([...graph.verticalEdges]).toStrictEqual([]);
      expect([...graph.nodes].toSorted()).toStrictEqual([
        "0,0",
        "1,0",
        "2,0",
        "3,0",
      ]);
    });

    it("splits a vertical run into one edge per grid step, whichever way it is drawn", () => {
      const graph = service.build(
        buildDocument({ columns: 1, paths: ["M3 39V3"], rows: 3 }),
      );

      expect([...graph.verticalEdges].toSorted()).toStrictEqual([
        "0,0",
        "0,1",
        "0,2",
      ]);
      expect([...graph.horizontalEdges]).toStrictEqual([]);
    });

    it("records a zero-length stroke as an inked lattice point with no edge", () => {
      const graph = service.build(
        buildDocument({ columns: 1, paths: ["M15 3H15"], rows: 1 }),
      );

      expect([...graph.nodes]).toStrictEqual(["1,0"]);
      expect([...graph.horizontalEdges]).toStrictEqual([]);
    });

    it("draws nothing for a move that is never followed by a stroke", () => {
      const graph = service.build(
        buildDocument({ columns: 1, paths: ["M3 3", "M15 15H15"], rows: 1 }),
      );

      expect([...graph.nodes]).toStrictEqual(["1,1"]);
    });

    it("counts an edge two paths both draw once", () => {
      const graph = service.build(
        buildDocument({ columns: 2, paths: ["M3 3H27", "M3 3H27"], rows: 1 }),
      );

      expect(graph.horizontalEdges.size).toBe(2);
    });

    it.each([
      {
        document: `<svg width="30" height="18"><path d="M3 3H27"/>\n</svg>\n`,
        error: UnmeasurableDocumentError,
        label: "a document that declares no stroke width",
      },
      {
        document: `<svg width="30" height="18"><path d="M3 3H27" stroke-width="6"/><path d="M3 15H27" stroke-width="4"/></svg>`,
        error: UnmeasurableDocumentError,
        label: "a document drawn at two different stroke widths",
      },
      {
        document: `<svg height="18"><path d="M3 3H27" stroke-width="6"/></svg>`,
        error: UnmeasurableDocumentError,
        label: "a document that declares no width",
      },
      {
        document: buildDocument({
          columns: 2,
          paths: ["M3 3 15 15"],
          rows: 1,
        }),
        error: UnmeasurableDocumentError,
        label: "a path command carrying more coordinates than it takes",
      },
      {
        document: buildDocument({ columns: 2, paths: ["M"], rows: 1 }),
        error: UnmeasurableDocumentError,
        label: "a path command carrying no coordinate at all",
      },
      {
        document: buildDocument({ columns: 2, paths: ["M3"], rows: 1 }),
        error: UnmeasurableDocumentError,
        label: "a move carrying only one coordinate",
      },
      {
        document: buildDocument({ columns: 2, paths: ["M3 3H15 3"], rows: 1 }),
        error: UnmeasurableDocumentError,
        label: "a horizontal run carrying two coordinates",
      },
      {
        document: buildDocument({ columns: 2, paths: ["3 15H27"], rows: 1 }),
        error: UnmeasurableDocumentError,
        label: "path data that opens with a coordinate instead of a command",
      },
      {
        document: buildDocument({ columns: 2, paths: ["M3 3L27 15"], rows: 1 }),
        error: UnsupportedPathCommandError,
        label: "a path command that is not a move, a horizontal, or a vertical",
      },
      {
        document: buildDocument({ columns: 2, paths: ["M4 3H27"], rows: 1 }),
        error: OffLatticeCoordinateError,
        label: "a coordinate that does not sit on the grid",
      },
      {
        document: `<svg width="31" height="18"><path d="M3 3H27" stroke-width="6"/></svg>`,
        error: OffLatticeCoordinateError,
        label: "a canvas that is not a whole number of grid pitches",
      },
    ])("refuses $label", ({ document, error }) => {
      expect(() => service.build(document)).toThrow(error);
    });
  });
});
