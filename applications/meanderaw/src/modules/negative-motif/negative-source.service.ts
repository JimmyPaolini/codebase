// cspell:ignore dvvxxd dvvxxvvxxvvxxd hxxhhx hxxhhxxhhxxhhx dldldld — mosaic
// tile identifiers, one letter per cell of the tile, from
// MOSAIC_MARK_LETTERS in src/modules/mosaic-motif/mosaic-motif.constants.ts.
import { Injectable } from "@nestjs/common";

import { NEGATIVE_SOURCE_ROW_OFFSET } from "./negative-motif.constants";

import type { Modifier } from "../meander-generation/meander-generation.types";
import type {
  MosaicPiece,
  MosaicTile,
} from "../mosaic-motif/mosaic-motif.types";
import type { NegativeSource } from "./negative-motif.types";

/**
 * Builds the `mosaic` tile whose negative the `negative` family draws.
 *
 * The three it builds are the negative-space survey's shortlist, and nothing
 * else — `dvvxxd` → `dvvxxvvxxvvxxd`, `hxxhhx` → `hxxhhxxhhxxhhx`, and
 * `dld` → `dldldld`. Each is built from a rule rather than looked up by
 * identifier, so it keeps working at row counts nobody has enumerated, the
 * same choice {@link MosaicSubFamilyService} made for its sub-families.
 *
 * That the rule really produces the shortlisted tile is not a comment: at
 * every row count the survey covered, `negative-source.service.unit.test.ts`
 * asserts {@link MosaicSymmetryService.identify} of the built tile against
 * the identifier `README.md` publishes, and asserts that identifier is the
 * tile's canonical one — so the tile built here is the very tile
 * `output/permutations/` committed and the survey measured, not a mirror or
 * a re-phasing of it.
 */
@Injectable()
export class NegativeSourceService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * `hxxhhx`'s marks: one horizontal dash per interior level, alternating
   * which of the tile's two columns anchors it. A dash covers its own cell
   * and the one to its right, wrapping into the next repeat tile from the
   * last column, so a single dash covers a whole level either way round and
   * the alternation is what staggers the joints into running bond.
   */
  private brickPieces(rows: number): MosaicPiece[] {
    return Array.from({ length: rows - 1 }, (_value, level) => ({
      column: level % 2,
      kind: "horizontal" as const,
      level,
    }));
  }

  /**
   * `dld`'s marks: a single column alternating dot levels with the
   * continuous rule, starting from a dot. A `line` is the single-column
   * tile's degenerate horizontal dash, which chains with its own copy in
   * every following tile into one rule running the length of the band.
   */
  private ruledPieces(rows: number): MosaicPiece[] {
    return Array.from({ length: rows - 1 }, (_value, level) => ({
      column: 0,
      kind: level % 2 === 0 ? ("dot" as const) : ("line" as const),
      level,
    }));
  }

  /**
   * One column of `dvvxxd`'s marks: vertical dashes stacked two levels at a
   * time, offset by one level between the two columns so the pair reads as a
   * staircase. Column `0` opens with a dot to create that offset, and
   * whichever column runs out of room for a last full dash closes with a dot
   * of its own — which is why the tile is capped by exactly two dots at every
   * row count, one at each end of the stair.
   */
  private stairPieces(column: number, rows: number): MosaicPiece[] {
    const levels = rows - 1;
    const pieces: MosaicPiece[] = [];
    let level = 0;

    if (column === 0) {
      pieces.push({ column, kind: "dot", level });
      level = 1;
    }

    while (level < levels) {
      const fits = level + 1 < levels;

      pieces.push({ column, kind: fits ? "vertical" : "dot", level });
      level += fits ? 2 : 1;
    }

    return pieces;
  }

  // 🌎 Public Methods

  /** Which shortlisted source a drawing's modifier selects; no modifier draws the shortlist's first entry. */
  source(modifier: Modifier | undefined): NegativeSource {
    if (modifier?.name === "brick") {
      return "brick";
    }

    if (modifier?.name === "ruled") {
      return "ruled";
    }

    return "stair";
  }

  /**
   * The source tile a `negative` drawing of `rows` rows inverts, built at
   * `rows + NEGATIVE_SOURCE_ROW_OFFSET` rows — see that constant for why the
   * source is always one row taller than the negative taken from it.
   */
  tile(source: NegativeSource, rows: number): MosaicTile {
    const sourceRows = rows + NEGATIVE_SOURCE_ROW_OFFSET;
    const tilesBySource: Record<NegativeSource, MosaicTile> = {
      brick: {
        columns: 2,
        pieces: this.brickPieces(sourceRows),
        rows: sourceRows,
      },
      ruled: {
        columns: 1,
        pieces: this.ruledPieces(sourceRows),
        rows: sourceRows,
      },
      stair: {
        columns: 2,
        pieces: [
          ...this.stairPieces(0, sourceRows),
          ...this.stairPieces(1, sourceRows),
        ],
        rows: sourceRows,
      },
    };

    return tilesBySource[source];
  }
}
