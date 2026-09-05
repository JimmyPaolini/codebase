// cspell:ignore dvvxxd dvvxxvvxxvvxxd hxxhhx hxxhhxxhhxxhhx dldldld — mosaic
// tile identifiers, one letter per cell of the tile, from
// MOSAIC_MARK_LETTERS in src/modules/mosaic-motif/mosaic-motif.constants.ts.
import { Injectable } from "@nestjs/common";

import {
  DEFAULT_NEGATIVE_SOURCE,
  NEGATIVE_COLUMN_MOTIFS,
  NEGATIVE_SOURCE_ROW_OFFSET,
  NEGATIVE_SOURCES_BY_MODIFIER_NAME,
  UnknownNegativeSourceError,
} from "./negative-motif.constants";

import type { Modifier } from "../meander-generation/meander-generation.types";
import type {
  MosaicPiece,
  MosaicTile,
} from "../mosaic-motif/mosaic-motif.types";
import type {
  NegativeColumnMark,
  NegativeColumnSource,
  NegativeModifierName,
  NegativeSource,
  NegativeTileSource,
} from "./negative-motif.types";

/**
 * Builds the `mosaic` tile whose negative the `negative` family draws.
 *
 * Ten of them, and they arrive two ways. Seven are one-column repeating
 * motifs read off {@link NEGATIVE_COLUMN_MOTIFS} and walked by
 * {@link columnPieces}; three are two-column tiles with a rule apiece —
 * `dvvxxd` → `dvvxxvvxxvvxxd`, `hxxhhx` → `hxxhhxxhhxxhhx`, and that same
 * running bond laid straight. Neither kind is looked up by identifier, so
 * every one keeps working at row counts nobody has enumerated, the same
 * choice {@link MosaicSubFamilyService} made for its sub-families.
 *
 * That the rules really produce the tiles they claim to is not a comment. At
 * every row count the survey covered, `negative-source.service.unit.test.ts`
 * asserts {@link MosaicSymmetryService.identify} of the built tile against
 * the identifier `README.md` publishes, and asserts that identifier is the
 * tile's canonical one — so a tile built here is the very tile the
 * permutation sweep committed under `output/mosaic/<rows>-rows/permutations/`
 * and the survey measured, not a mirror or a re-phasing of it. The four
 * sources that invert a `MosaicSubFamily` are asserted against
 * {@link MosaicSubFamilyService.tile} directly, which is a stronger check
 * than an identifier: it is the sub-family's own builder, not a name for its
 * output.
 */
@Injectable()
export class NegativeSourceService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * A `brick` source's marks: one horizontal dash per interior level, each
   * covering its own cell and the one to its right and wrapping into the
   * next repeat tile from the last column — so a single dash covers a whole
   * level either way round, and only the column it is *anchored* on is
   * walled.
   *
   * That is the whole difference between the two bonds. `staggered`
   * alternates the anchor by level, so the open column alternates with it
   * and no two corridors ever stack — running bond, which branches without
   * crossing. Straight anchors every course in the same column, so the open
   * column is the same one at every level and the corridors stack into an
   * unbroken vertical line — stack bond, whose mortar is a grid and
   * therefore crosses.
   */
  private brickPieces(rows: number, staggered: boolean): MosaicPiece[] {
    return Array.from({ length: rows - 1 }, (_value, level) => ({
      column: staggered ? level % 2 : 0,
      kind: "horizontal" as const,
      level,
    }));
  }

  /**
   * A one-column source's marks: its motif repeated down the interior and
   * truncated wherever it runs out of room.
   *
   * A `vertical` opening spans two levels, so the last level of an interior
   * that cannot fit one closes with a `dot` instead — the same one-level
   * opening, and the same rule {@link stairPieces} uses to cap its stair.
   * Without it a motif carrying a `vertical` would simply be undefined at
   * half the row counts, which is what makes `diamond` unavailable at an odd
   * interior in the `mosaic` family and is not a limitation worth inheriting
   * here.
   *
   * The motif is a non-empty tuple, which is what makes the outer loop
   * terminate: every pass of the inner loop advances `level` by at least
   * one.
   */
  private columnPieces(
    motif: readonly [NegativeColumnMark, ...NegativeColumnMark[]],
    rows: number,
  ): MosaicPiece[] {
    const levels = rows - 1;
    const pieces: MosaicPiece[] = [];
    let level = 0;

    while (level < levels) {
      for (const mark of motif) {
        if (level >= levels) {
          break;
        }

        const fits = level + 1 < levels;
        const kind = mark === "vertical" && !fits ? "dot" : mark;

        pieces.push({ column: 0, kind, level });
        level += kind === "vertical" ? 2 : 1;
      }
    }

    return pieces;
  }

  /** Narrows a source to one built from a one-column motif, without an unchecked assertion. */
  private isColumnSource(
    source: NegativeSource,
  ): source is NegativeColumnSource {
    return Object.hasOwn(NEGATIVE_COLUMN_MOTIFS, source);
  }

  /** Narrows a modifier name to one this family draws a source for, without an unchecked assertion. */
  private isNegativeModifierName(
    name: Modifier["name"],
  ): name is NegativeModifierName {
    return Object.hasOwn(NEGATIVE_SOURCES_BY_MODIFIER_NAME, name);
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

  /** The two-column tile a source names, built at the source's own row count. */
  private tileSource(source: NegativeTileSource, rows: number): MosaicTile {
    const tilesBySource: Record<NegativeTileSource, MosaicTile> = {
      "brick-staggered": {
        columns: 2,
        pieces: this.brickPieces(rows, true),
        rows,
      },
      "brick-straight": {
        columns: 2,
        pieces: this.brickPieces(rows, false),
        rows,
      },
      stair: {
        columns: 2,
        pieces: [...this.stairPieces(0, rows), ...this.stairPieces(1, rows)],
        rows,
      },
    };

    return tilesBySource[source];
  }

  // 🌎 Public Methods

  /**
   * Which source a drawing's modifier selects; no modifier draws
   * {@link DEFAULT_NEGATIVE_SOURCE}, the shortlist's first entry.
   *
   * The dispatch is total rather than defaulted: every name this family
   * declares compatible has an entry in
   * {@link NEGATIVE_SOURCES_BY_MODIFIER_NAME}, a missing one is a type error,
   * and any name outside it is refused. Nothing can reach that refusal
   * through `MeanderGenerationService.generate`, which validates
   * compatibility first — but a family that answered "no modifier" to a
   * modifier it did not recognize would draw the wrong source silently, and
   * this one says so instead.
   */
  source(modifier: Modifier | undefined): NegativeSource {
    if (modifier === undefined) {
      return DEFAULT_NEGATIVE_SOURCE;
    }

    if (!this.isNegativeModifierName(modifier.name)) {
      throw new UnknownNegativeSourceError(modifier.name);
    }

    return NEGATIVE_SOURCES_BY_MODIFIER_NAME[modifier.name];
  }

  /**
   * The source tile a `negative` drawing of `rows` rows inverts, built at
   * `rows + NEGATIVE_SOURCE_ROW_OFFSET` rows — see that constant for why the
   * source is always one row taller than the negative taken from it.
   */
  tile(source: NegativeSource, rows: number): MosaicTile {
    const sourceRows = rows + NEGATIVE_SOURCE_ROW_OFFSET;

    if (this.isColumnSource(source)) {
      return {
        columns: 1,
        pieces: this.columnPieces(NEGATIVE_COLUMN_MOTIFS[source], sourceRows),
        rows: sourceRows,
      };
    }

    return this.tileSource(source, sourceRows);
  }
}
