import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MeanderLatticeService } from "./meander-lattice.service";
import { MeanderTopologyService } from "./meander-topology.service";

import type { MeanderTopology } from "./meander-topology.types";

// 🔧 Configuration

/**
 * The stroke width every constructed document below is drawn at. Invariant
 * 2's arithmetic puts the grid pitch at two stroke widths and the first
 * lattice line half a stroke width in, so 6 puts the lattice on
 * 3, 15, 27, 39 — the coordinates `5 rows` produces for real.
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

/**
 * A three-by-three cell grid with every lattice edge drawn, minus the edges
 * `openings` names. Removing an edge opens a one-stroke-wide corridor
 * between the two cells it separated, which is how the negative-space cases
 * below construct a branch or a crossing in the white rather than the ink.
 * The one cell with all four neighbors inside the document is the middle
 * one, so it is the only cell that can reach degree 4.
 */
const buildFullGrid = (openings: {
  readonly horizontal: readonly string[];
  readonly vertical: readonly string[];
}): string => {
  const lines = [3, 15, 27, 39];
  const paths = [
    ...lines.map((y) =>
      openings.horizontal.includes(`middle-${y}`)
        ? [`M3 ${y}H15`, `M27 ${y}H39`]
        : [`M3 ${y}H39`],
    ),
    ...lines.map((x) =>
      openings.vertical.includes(`middle-${x}`)
        ? [`M${x} 3V15`, `M${x} 27V39`]
        : [`M${x} 3V39`],
    ),
  ].flat();

  return buildDocument({ columns: 3, paths, rows: 3 });
};

/** The five figures `measure` reports, spelled out so a case reads as a whole measurement rather than a list of expectations. */
const topology = (options: {
  readonly channelWidthCompliant?: boolean;
  readonly inkTJunctions?: number;
  readonly inkXJunctions?: number;
  readonly negativeTJunctions?: number;
  readonly negativeXJunctions?: number;
}): MeanderTopology => ({
  channelWidthCompliant: options.channelWidthCompliant ?? true,
  inkTJunctions: options.inkTJunctions ?? 0,
  inkXJunctions: options.inkXJunctions ?? 0,
  negativeTJunctions: options.negativeTJunctions ?? 0,
  negativeXJunctions: options.negativeXJunctions ?? 0,
});

// 🧪 Tests

describe(MeanderTopologyService, () => {
  let service: MeanderTopologyService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MeanderLatticeService, MeanderTopologyService],
    }).compile();

    service = await module.resolve(MeanderTopologyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("measure", () => {
    it.each([
      {
        document: buildDocument({
          columns: 2,
          paths: ["M3 15H27", "M15 3V15"],
          rows: 1,
        }),
        expected: topology({ inkTJunctions: 1 }),
        label: "a three-armed junction in the ink",
      },
      {
        document: buildDocument({
          columns: 2,
          paths: ["M3 15H27", "M15 3V27"],
          rows: 2,
        }),
        expected: topology({ inkXJunctions: 1 }),
        label: "a four-armed crossing in the ink",
      },
      {
        document: buildDocument({
          columns: 2,
          paths: [
            "M3 3H27",
            "M3 15H27",
            "M3 27H27",
            "M3 3V27",
            "M15 3V27",
            "M27 3V27",
          ],
          rows: 2,
        }),
        expected: topology({ inkTJunctions: 4, inkXJunctions: 1 }),
        label: "every junction of a fully drawn lattice",
      },
      {
        document: buildDocument({
          columns: 2,
          paths: ["M3 3H27", "M3 27H27", "M3 3V27", "M27 3V27"],
          rows: 2,
        }),
        expected: topology({ channelWidthCompliant: false }),
        label: "a channel wider than one stroke inside the band",
      },
      {
        document: buildDocument({
          columns: 2,
          paths: ["M3 3H27", "M3 27H27", "M3 3V27", "M27 3V27", "M15 15H15"],
          rows: 2,
        }),
        expected: topology({}),
        label: "a square-cap dot closing that same channel",
      },
      {
        document: buildDocument({
          columns: 2,
          paths: ["M3 3H27", "M3 27H27", "M15 3V27", "M27 3V27"],
          rows: 2,
        }),
        expected: topology({ inkTJunctions: 2 }),
        label: "a gap that sits only where the band terminates",
      },
      {
        document: buildFullGrid({
          horizontal: ["middle-15"],
          vertical: ["middle-15", "middle-27"],
        }),
        expected: topology({ inkTJunctions: 10, negativeTJunctions: 1 }),
        label: "a three-way branch in the negative space",
      },
      {
        document: buildFullGrid({
          horizontal: ["middle-15", "middle-27"],
          vertical: ["middle-15", "middle-27"],
        }),
        expected: topology({ inkTJunctions: 8, negativeXJunctions: 1 }),
        label: "a four-way crossing in the negative space",
      },
    ])("measures $label", ({ document, expected }) => {
      expect(service.measure(document)).toStrictEqual(expected);
    });
  });

  describe("connectivity", () => {
    it.each([
      {
        document: buildDocument({ columns: 2, paths: ["M3 3H27"], rows: 1 }),
        expected: { components: 1, edges: 2, nodes: 3 },
        label: "one simple arc, a tree with no fork",
      },
      {
        document: buildDocument({
          columns: 2,
          paths: ["M3 3H27", "M3 3V15", "M15 3V15", "M27 3V15"],
          rows: 1,
        }),
        expected: { components: 1, edges: 5, nodes: 6 },
        label: "a spine with a tooth per column, a tree that forks",
      },
      {
        document: buildDocument({
          columns: 1,
          paths: ["M3 3H15", "M3 15H15", "M3 3V15", "M15 3V15"],
          rows: 1,
        }),
        expected: { components: 1, edges: 4, nodes: 4 },
        label: "a closed loop, connected but not a tree",
      },
      {
        document: buildDocument({
          columns: 2,
          paths: ["M3 3H27", "M3 15H27"],
          rows: 1,
        }),
        expected: { components: 2, edges: 4, nodes: 6 },
        label: "two disjoint arcs, a forest that is not a tree",
      },
      {
        document: buildDocument({ columns: 2, paths: ["M15 15H15"], rows: 2 }),
        expected: { components: 1, edges: 0, nodes: 1 },
        label: "a square-cap dot, one node joined to nothing",
      },
    ])("counts $label", ({ document, expected }) => {
      expect(service.connectivity(document)).toStrictEqual(expected);
    });

    // 🎯 The two derived predicates the counts above exist to support,
    // spelled out once so the arithmetic that defines a tree is written
    // down beside the numbers rather than only in a family's own test.
    it.each([
      {
        isForest: true,
        isTree: true,
        label: "a spine with a tooth per column",
        paths: ["M3 3H27", "M3 3V15", "M15 3V15", "M27 3V15"],
      },
      {
        isForest: false,
        isTree: false,
        label: "a closed loop",
        paths: ["M3 3H15", "M3 15H15", "M3 3V15", "M15 3V15"],
      },
      {
        isForest: true,
        isTree: false,
        label: "two disjoint arcs",
        paths: ["M3 3H27", "M3 15H27"],
      },
    ])("reports $label as forest $isForest and tree $isTree", (testCase) => {
      const { components, edges, nodes } = service.connectivity(
        buildDocument({ columns: 2, paths: testCase.paths, rows: 1 }),
      );

      expect({
        isForest: edges === nodes - components,
        isTree: components === 1 && edges === nodes - 1,
      }).toStrictEqual({
        isForest: testCase.isForest,
        isTree: testCase.isTree,
      });
    });
  });
});
