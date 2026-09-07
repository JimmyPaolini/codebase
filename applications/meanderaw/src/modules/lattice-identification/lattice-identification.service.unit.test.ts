import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { mosaicTile } from "../../../testing/mosaic-tiles";
import {
  OffLatticeCoordinateError,
  UnmeasurableDocumentError,
  UnsupportedPathCommandError,
} from "../meander-lattice/meander-lattice.constants";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";

import { InvalidSpanError } from "./lattice-identification.constants";
import { LatticeIdentificationService } from "./lattice-identification.service";

import type { LatticeAddress } from "./lattice-identification.types";

// 🔧 Configuration

/**
 * The stroke width every document below declares, and so the lattice they
 * all sit on: the pitch is two stroke widths, the first lattice line sits
 * half a stroke width in, and the canvas is measured from a whole one. Those
 * three are `MeanderLatticeService`'s own arithmetic, and writing a document
 * by hand means writing coordinates that satisfy it.
 */
const STROKE_WIDTH = 10;

/** The canvas coordinate of lattice line `index`, across or down. */
const at = (index: number): number =>
  STROKE_WIDTH / 2 + 2 * STROKE_WIDTH * index;

/** A rendered document `columns` lattice columns wide and `rows` deep, drawing `paths`. */
const drawing = (options: {
  readonly columns: number;
  readonly paths: readonly string[];
  readonly rows: number;
}): string =>
  [
    `<svg width="${STROKE_WIDTH + 2 * STROKE_WIDTH * options.columns}" height="${STROKE_WIDTH + 2 * STROKE_WIDTH * options.rows}">`,
    ...options.paths.map(
      (data) => `<path d="${data}" stroke-width="${STROKE_WIDTH}"/>`,
    ),
    "</svg>",
  ].join("\n");

/** One run of ink along grid row `row`, from lattice column `from` to lattice column `to`. */
const across = (row: number, from: number, to: number): string =>
  `M${at(from)} ${at(row)}H${at(to)}`;

/** One run of ink down lattice column `column`, from grid row `from` to grid row `to`. */
const down = (column: number, from: number, to: number): string =>
  `M${at(column)} ${at(from)}V${at(to)}`;

/** A zero-length stroke at one lattice point, which is how a bare point is painted as a dot. */
const dot = (column: number, row: number): string => down(column, row, row);

// 🧪 Tests

describe(LatticeIdentificationService, () => {
  let service: LatticeIdentificationService;
  let mosaicSymmetryService: MosaicSymmetryService;

  // Six rows, one column: five interior levels whose top point sends a
  // southward edge, then a bare point, then the wrapped east-west rule,
  // then another bare point.
  const singleColumn = mosaicTile(["s", ".", ".", "e", "."]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LatticeIdentificationService,
        MeanderLatticeService,
        MosaicNamingService,
        MosaicSymmetryService,
        MosaicTileService,
      ],
    }).compile();

    service = await module.resolve(LatticeIdentificationService);
    mosaicSymmetryService = await module.resolve(MosaicSymmetryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("identify", () => {
    it("writes one hexadecimal character per point, worth 8 north, 4 south, 2 east and 1 west", () => {
      // A point sending a southward edge, the point below it receiving one,
      // two bare points, and one carrying the wrapped east-west rule.
      expect(service.identify(singleColumn)).toBe("48030");
    });

    it("reads row-major, so a two-column tile interleaves its columns", () => {
      expect(service.identify(mosaicTile(["e.", ".."]))).toBe("2100");
      expect(service.identify(mosaicTile([".e", ".."]))).toBe("1200");
    });

    it("writes a single column's wrapped edge as both east and west, which is what its ink does", () => {
      expect(service.identify(mosaicTile(["e"]))).toBe("3");
      expect(service.identify(mosaicTile(["e."]))).toBe("21");
    });

    it("writes a point owning both its edges as one character, which a per-mark letter had none for", () => {
      expect(service.identify(mosaicTile(["b.", "..", ".."]))).toBe("618000");
    });

    it("names a tile completely, so two tiles of one shape share it only when they are the same tile", () => {
      expect(service.identify(mosaicTile(["e.", "e.", ".."]))).not.toBe(
        service.identify(mosaicTile(["e.", ".e", ".."])),
      );
    });
  });

  describe("canonicalIdentifier", () => {
    it("gives a tile and its own top-to-bottom mirror the same name", () => {
      const flipped = mosaicTile([".", "e", ".", "s", "."]);

      expect(service.canonicalIdentifier(flipped)).toBe(
        service.canonicalIdentifier(singleColumn),
      );
    });

    it("gives a tile and its own column shift the same name, since shifting only re-phases the pattern", () => {
      expect(service.canonicalIdentifier(mosaicTile([".e", ".."]))).toBe(
        service.canonicalIdentifier(mosaicTile(["e.", ".."])),
      );
    });

    it("is the representative's own bit string, so a filename describes the tile that drew it", () => {
      expect(service.canonicalIdentifier(singleColumn)).toBe(
        service.identify(mosaicSymmetryService.canonicalTile(singleColumn)),
      );
      expect(service.canonicalIdentifier(singleColumn)).toBe("03048");
    });

    it("keeps two genuinely different tiles apart", () => {
      expect(
        service.canonicalIdentifier(mosaicTile(["e.", "e.", ".."])),
      ).not.toBe(service.canonicalIdentifier(mosaicTile(["e.", ".e", ".."])));
    });
  });

  describe("identifyDocument", () => {
    it("reads the row count off the canvas and spells the address as rows, span, then the bits", () => {
      // Three grid rows, one column of ink per repeat: a southward edge from
      // the first interior level to the second, drawn four times across. The
      // upper point of the pair sends south and the lower receives north, so
      // the two levels of a one-column tile read `4` then `8`.
      const document = drawing({
        columns: 4,
        paths: [0, 1, 2, 3].map((column) => down(column, 1, 2)),
        rows: 3,
      });

      expect(
        service.identifyDocument(document, { pitch: 1, span: 1 }),
      ).toStrictEqual({
        address: "3r1c-48",
        canonicalIdentifier: "48",
        columns: 1,
        identifier: "48",
        rows: 3,
        subFamily: "bars",
      });
    });

    it("names the sub-family a reading's own structure earns, whatever family drew it", () => {
      const document = drawing({
        columns: 6,
        paths: [across(1, 0, 6)],
        rows: 2,
      });

      expect(
        service.identifyDocument(document, { pitch: 1, span: 1 }),
      ).toMatchObject({
        address: "2r1c-3",
        subFamily: "lines",
      });
    });

    it("addresses a point on no edge as 0, and leaves a reading no rule matches unnamed", () => {
      // A dash and a dot alternating every three columns: the addressed unit
      // holds the dash's two ends and then a bare point.
      const document = drawing({
        columns: 9,
        paths: [0, 3, 6].flatMap((column) => [
          across(1, column, column + 1),
          dot(column + 2, 1),
        ]),
        rows: 2,
      });
      const address = service.identifyDocument(document, { pitch: 3, span: 3 });

      expect(address.identifier).toBe("210");
      expect(address).not.toHaveProperty("subFamily");
    });

    it("reads a unit clear of both band terminations rather than the first or the last", () => {
      // Five units of one column. The first and the last carry a dot where
      // every unit between them carries the wrapped east-west rule, so an
      // address read at either end would be `0` rather than `3`.
      const document = drawing({
        columns: 5,
        paths: [dot(0, 1), across(1, 1, 4), dot(4, 1)],
        rows: 2,
      });

      expect(
        service.identifyDocument(document, { pitch: 1, span: 1 }).identifier,
      ).toBe("3");
    });

    it("reports the canonical class beside the literal address rather than in place of it", () => {
      // The same dashes half a repeat apart: one document breaks its runs on
      // even lattice columns and the other on odd ones.
      const dashesFrom = (phase: number): LatticeAddress =>
        service.identifyDocument(
          drawing({
            columns: 8,
            paths: [0, 2, 4, 6].map((column) =>
              across(1, column + phase, column + phase + 1),
            ),
            rows: 2,
          }),
          { pitch: 2, span: 2 },
        );
      const aligned = dashesFrom(0);
      const shifted = dashesFrom(1);

      expect(aligned.identifier).toBe("21");
      expect(shifted.identifier).toBe("12");
      expect(aligned.canonicalIdentifier).toBe(shifted.canonicalIdentifier);

      for (const phase of [aligned, shifted]) {
        expect(phase.address).toBe(`2r2c-${phase.identifier}`);
      }
    });

    it("refuses a drawing too narrow to hold a unit clear of both terminations", () => {
      const document = drawing({
        columns: 4,
        paths: [across(1, 0, 4)],
        rows: 2,
      });

      expect(() =>
        service.identifyDocument(document, { pitch: 2, span: 2 }),
      ).toThrow(InvalidSpanError);
    });

    it.each([0, -1, 1.5])(
      "refuses a span of %s, which is no whole number of columns",
      (span) => {
        const document = drawing({
          columns: 8,
          paths: [across(1, 0, 8)],
          rows: 2,
        });

        expect(() =>
          service.identifyDocument(document, { pitch: 1, span }),
        ).toThrow(InvalidSpanError);
      },
    );

    it.each([0, -1, 1.5])(
      "refuses a pitch of %s, which is no whole number of columns",
      (pitch) => {
        const document = drawing({
          columns: 8,
          paths: [across(1, 0, 8)],
          rows: 2,
        });

        expect(() =>
          service.identifyDocument(document, { pitch, span: 2 }),
        ).toThrow(InvalidSpanError);
      },
    );

    it("refuses a span that is no whole number of repeat units", () => {
      const document = drawing({
        columns: 12,
        paths: [across(1, 0, 12)],
        rows: 2,
      });

      expect(() =>
        service.identifyDocument(document, { pitch: 2, span: 3 }),
      ).toThrow(InvalidSpanError);
    });

    it("opens the addressed window one pitch in rather than one span in", () => {
      // One dash between lattice columns 1 and 2 of a four-column band. The
      // window that starts a pitch in holds it; the window that starts a span
      // in — which is where a reader measuring its margin in spans would
      // look — holds two bare points.
      const document = drawing({
        columns: 4,
        paths: [across(1, 1, 2)],
        rows: 2,
      });

      expect(
        service.identifyDocument(document, { pitch: 1, span: 2 }).identifier,
      ).toBe("21");
    });

    it("addresses a span several pitches wide in a drawing only two pitches wider than it", () => {
      // Six pitches of drawing and a span of four of them. Clearing a pitch
      // at each end fits; clearing a span at each end would need twelve, and
      // would leave a `boxes spin` drawing — four pitches to a span, eight
      // units to a drawing — impossible to address rather than addressed once.
      const document = drawing({
        columns: 6,
        paths: [across(1, 0, 6)],
        rows: 2,
      });

      expect(
        service.identifyDocument(document, { pitch: 1, span: 4 }),
      ).toMatchObject({
        address: "2r4c-3333",
        columns: 4,
      });
    });

    it.each([
      {
        error: UnsupportedPathCommandError,
        paths: [
          `M${at(0)} ${at(1)}C${at(1)} ${at(1)} ${at(2)} ${at(1)} ${at(3)} ${at(1)}`,
        ],
        refused: "a curve",
      },
      {
        error: UnsupportedPathCommandError,
        paths: [`M${at(0)} ${at(1)}L${at(3)} ${at(2)}`],
        refused: "a diagonal",
      },
      {
        error: OffLatticeCoordinateError,
        paths: [`M${at(0) + 2} ${at(1)}H${at(3)}`],
        refused: "an off-lattice coordinate",
      },
    ])(
      "refuses $refused rather than addressing it wrongly",
      ({ error, paths }) => {
        expect(() =>
          service.identifyDocument(drawing({ columns: 4, paths, rows: 2 }), {
            pitch: 1,
            span: 1,
          }),
        ).toThrow(error);
      },
    );

    it("refuses a second stroke width rather than addressing it wrongly", () => {
      const document = [
        `<svg width="90" height="50">`,
        `<path d="${across(1, 0, 4)}" stroke-width="${STROKE_WIDTH}"/>`,
        `<path d="${across(1, 0, 4)}" stroke-width="${STROKE_WIDTH + 1}"/>`,
        "</svg>",
      ].join("\n");

      expect(() =>
        service.identifyDocument(document, { pitch: 1, span: 1 }),
      ).toThrow(UnmeasurableDocumentError);
    });
  });
});
