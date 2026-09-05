import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import { COLUMNS_PER_SERPENTINE_UNIT } from "./parallel-motif.constants";
import { ParallelSerpentineService } from "./parallel-serpentine.service";

// 🔧 Configuration

/** Every row count the sweep draws this family at, sampled through its middle. */
const SWEPT_ROWS: readonly number[] = [4, 6, 8, 12];

/** Every `(rows, strands)` pair the validator admits at those row counts: a ply of one through the row count itself. */
const PLIES: readonly { readonly rows: number; readonly strands: number }[] =
  SWEPT_ROWS.flatMap((rows) =>
    Array.from({ length: rows }, (_value, index) => ({
      rows,
      strands: index + 1,
    })),
  );

// 🧪 Tests

describe(ParallelSerpentineService, () => {
  let geometryService: GridGeometryService;
  let service: ParallelSerpentineService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [GridGeometryService, ParallelSerpentineService],
    }).compile();

    geometryService = await module.resolve(GridGeometryService);
    service = await module.resolve(ParallelSerpentineService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("strips", () => {
    // 🎯 The partition the whole construction rests on: every lattice row in
    // exactly one strip, none in two and none in none. Swept over every ply
    // the validator admits at each row count, because this is an arithmetic
    // claim and arithmetic is where an off-by-one hides. A strip that
    // overlapped its neighbor would put two ribbons on one lattice point and
    // break invariant 3; one that fell short would leave a row unpainted and
    // break invariant 2.
    it.each(PLIES)(
      "cuts $rows rows into $strands strips that partition the band",
      ({ rows, strands }) => {
        const strips = service.strips(rows, strands);
        const covered = strips.flatMap(({ bottomRow, topRow }) =>
          Array.from(
            { length: bottomRow - topRow + 1 },
            (_value, index) => topRow + index,
          ),
        );

        expect(strips).toHaveLength(strands);
        expect(covered.toSorted((left, right) => left - right)).toStrictEqual(
          Array.from({ length: rows + 1 }, (_value, index) => index),
        );
      },
    );

    // 🎯 Why floor division rather than banking the remainder on one strip.
    // The family's claim is that its strands run alongside one another, and
    // a ribbon given every spare row would read as one wave with hangers-on.
    it.each(PLIES)(
      "leaves no two of $strands strips more than one row apart in depth at $rows rows",
      ({ rows, strands }) => {
        const depths = service
          .strips(rows, strands)
          .map(({ bottomRow, topRow }) => bottomRow - topRow);

        expect(Math.max(...depths) - Math.min(...depths)).toBeLessThanOrEqual(
          1,
        );
      },
    );

    // 🎯 The direction the deeper strips fall, pinned so that reading the
    // output does not raise the question. `floor` pushes them to the bottom.
    it("pushes the deeper strips to the bottom of the band", () => {
      expect(service.strips(6, 3)).toStrictEqual([
        { bottomRow: 1, topRow: 0 },
        { bottomRow: 3, topRow: 2 },
        { bottomRow: 6, topRow: 4 },
      ]);
    });

    // 🎯 The honest degenerate case: a ply as deep as the band has rows
    // leaves strips with no room to wave, and a one-row strip flattens to a
    // straight rule. It still covers its row, which is why it is admitted
    // rather than refused.
    it("flattens every strip to a single row at the deepest ply", () => {
      const strips = service.strips(4, 4);

      expect(
        strips.filter(({ bottomRow, topRow }) => bottomRow === topRow),
      ).toHaveLength(3);
    });
  });

  describe("path", () => {
    // 🎯 The wave in one string. Two columns, one strip: the first column
    // runs top to bottom and hands the ribbon right along the band's bottom,
    // the second runs bottom to top and hands it right along the top — so
    // every two columns close one ⊔⊓ pair joined at both turns, which is the
    // sideways S this shape is named for.
    it("turns at the bottom out of an even column and the top out of an odd one", () => {
      expect(
        service.path(
          geometryService.compute(2),
          { isLastUnit: false, rows: 2, unitIndex: 0 },
          1,
        ),
      ).toBe("M7.5 7.5V67.5H37.5M37.5 67.5V7.5H67.5");
    });

    // 🎯 `isLastUnit` is what stops the final column trailing a connector
    // into a column the band does not have. Without it the drawing would end
    // in a one-step stub past its own right edge, and the last lattice
    // column would carry a single point of ink instead of a full run.
    it("stops the final column rather than handing the ribbon on", () => {
      expect(
        service.path(
          geometryService.compute(2),
          { isLastUnit: true, rows: 2, unitIndex: 0 },
          1,
        ),
      ).toBe("M7.5 7.5V67.5H37.5M37.5 67.5V7.5");
    });

    // 🎯 A unit hands the next one a ribbon already turned: unit 0's last
    // column exits along the top into a column unit 1 then runs down. So
    // unit 1 opens exactly as unit 0 did, one unit to the right, and the
    // wave has no seam at the boundary.
    it("hands the wave to the next unit already turned", () => {
      const geometry = geometryService.compute(2);
      const unit = { isLastUnit: false, rows: 2 };

      expect(service.path(geometry, { ...unit, unitIndex: 0 }, 1)).toBe(
        "M7.5 7.5V67.5H37.5M37.5 67.5V7.5H67.5",
      );
      expect(service.path(geometry, { ...unit, unitIndex: 1 }, 1)).toBe(
        "M67.5 7.5V67.5H97.5M97.5 67.5V7.5H127.5",
      );
    });

    // 🎯 Every strip draws its own run in every column, which is the half of
    // the exact cover this service is responsible for — the other half is
    // that the strips partition the band, asserted above. A ply of `N` puts
    // `N` runs in each of the unit's columns.
    it.each(PLIES)(
      "draws one run per strip in each column at $strands strands and $rows rows",
      ({ rows, strands }) => {
        const path = service.path(
          geometryService.compute(rows),
          { isLastUnit: false, rows, unitIndex: 0 },
          strands,
        );

        expect(path.match(/M/gu)).toHaveLength(
          COLUMNS_PER_SERPENTINE_UNIT * strands,
        );
      },
    );
  });
});
