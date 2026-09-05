import { Inject, Injectable } from "@nestjs/common";

import { STRUCTURAL_MINIMUM_ROWS } from "../meander-generation/meander-generation.constants";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import {
  NEGATIVE_SOURCE_NAMES,
  NEGATIVE_SOURCE_ROW_OFFSET,
} from "../negative-motif/negative-motif.constants";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { NegativeTileGenerationService } from "../negative-motif/negative-tile-generation.service";
import { OutputPathService } from "../svg-rendering/output-path.service";

import {
  NEGATIVE_PERMUTATION_COLUMNS,
  PERMUTATION_REPEAT_COUNT,
  PERMUTATION_ROWS_SWEEP_MAXIMUM,
  PERMUTATIONS_SUBDIRECTORY,
} from "./draw.constants";

import type { MosaicTile } from "../mosaic-motif/mosaic-motif.types";
import type { NegativeSource } from "../negative-motif/negative-motif.types";
import type { RenderedDocument } from "./draw.types";

/**
 * Renders the `negative` family's permutation half: every one-column source
 * it can invert, filed under the row count that produced it.
 *
 * **One column, and that is the whole point of it.** A one-column source
 * carries no vertical mark that a second column could stagger against, so
 * every lattice row of its negative is an unbroken rule broken only where
 * the source opens a two-level window — which is to say a one-column source
 * is exactly a *ruled* pattern, and this half is the `ruled` domain
 * enumerated rather than sampled. The named half draws six members of it by
 * name; there are 375 across the row counts swept here, and 45 of them
 * branch without crossing at 6 rows alone. The two-column space is not
 * enumerated, and the absent `2-columns` directory beside these is that
 * statement: `stair`, `brick-staggered`, and `brick-straight` are the three
 * of it this repository draws, and the survey found only the first two of
 * those avoid crossing at any row count.
 *
 * **The row range is derived rather than chosen.** It runs from the family's
 * own `STRUCTURAL_MINIMUM_ROWS` to one below
 * {@link PERMUTATION_ROWS_SWEEP_MAXIMUM}, so every drawing here inverts a
 * tile the `mosaic` permutation half has already committed — which is what
 * lets the corridor-identity gate cover this half completely rather than
 * sample it. Raising it past that would produce drawings with no committed
 * source to be compared against, and the count roughly two-and-a-half times
 * per row: 513 at 8 rows, 16,850 at 12.
 */
@Injectable()
export class DrawNegativePermutationsService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicSymmetryService)
    private readonly mosaicSymmetryService: MosaicSymmetryService,
    @Inject(MosaicTilesService)
    private readonly mosaicTilesService: MosaicTilesService,
    @Inject(NegativeSourceService)
    private readonly negativeSourceService: NegativeSourceService,
    @Inject(NegativeTileGenerationService)
    private readonly negativeTileGenerationService: NegativeTileGenerationService,
    @Inject(OutputPathService)
    private readonly outputPathService: OutputPathService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Which name this family has for the symmetry class a tile belongs to, or
   * `undefined` where it has none.
   *
   * It compares canonical identifiers rather than tiles, because
   * {@link MosaicTilesService.enumerate} keeps whichever cover its search
   * reaches first and files it under its class's canonical identifier — so
   * the tile in hand is some member of the class rather than the
   * representative the name was built as. Comparing the tiles themselves
   * would label a class or not depending on the order a search happened to
   * run in, which is exactly the kind of thing that works until it quietly
   * stops.
   *
   * A label therefore names a class, and one class carries two names: at an
   * even row count `ruled` and `ruled-raised` is the same class re-phased.
   * {@link NEGATIVE_SOURCE_NAMES} puts `ruled` first, and the test beside
   * this service asserts that pair is the only collision at any swept row
   * count.
   *
   * It lives here rather than on `NegativeSourceService` because naming a
   * class needs `MosaicSymmetryService`, and the `negative` module
   * deliberately depends on no `mosaic` module at run time — a source tile is
   * a value there, not a drawing. This half is where the two families
   * already meet.
   */
  private classify(tile: MosaicTile, rows: number): NegativeSource | undefined {
    const identifier = this.mosaicSymmetryService.canonicalIdentifier(tile);

    return NEGATIVE_SOURCE_NAMES.find(
      (source) =>
        this.mosaicSymmetryService.canonicalIdentifier(
          this.negativeSourceService.tile(source, rows),
        ) === identifier,
    );
  }

  // 🌎 Public Methods

  /**
   * Enumerates and renders every one-column negative at one row count.
   *
   * A drawing whose source is one this family names carries that name after
   * the source's identifier, exactly as a `mosaic` tile belonging to a
   * sub-family does — so the six a reader already has a word for are legible
   * in the directory listing rather than lost among the hundreds that have
   * none.
   */
  render(rows: number): RenderedDocument[] {
    const sourceRows = rows + NEGATIVE_SOURCE_ROW_OFFSET;
    const directory = `${this.outputPathService.familyDirectory(
      "negative",
      rows,
    )}/${PERMUTATIONS_SUBDIRECTORY}/${NEGATIVE_PERMUTATION_COLUMNS}-columns`;

    return this.mosaicTilesService
      .enumerate(sourceRows, NEGATIVE_PERMUTATION_COLUMNS)
      .map((tile) => {
        const identifier = this.mosaicSymmetryService.canonicalIdentifier(tile);
        const source = this.classify(tile, rows);

        return {
          directory,
          fileName: `${source ? `${identifier}-${source}` : identifier}.svg`,
          svg: this.negativeTileGenerationService.generate(
            tile,
            PERMUTATION_REPEAT_COUNT,
          ),
        };
      });
  }

  /** Every row count this half covers: the family's structural minimum through the deepest negative a committed `mosaic` tile can yield. */
  rowsSweep(): number[] {
    const minimum = STRUCTURAL_MINIMUM_ROWS.negative;
    const maximum = PERMUTATION_ROWS_SWEEP_MAXIMUM - NEGATIVE_SOURCE_ROW_OFFSET;

    return Array.from(
      { length: maximum - minimum + 1 },
      (_value, index) => minimum + index,
    );
  }
}
