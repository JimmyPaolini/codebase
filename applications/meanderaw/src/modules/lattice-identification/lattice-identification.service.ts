import { Inject, Injectable } from "@nestjs/common";

import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";

import {
  InvalidSpanError,
  TERMINATION_MARGIN_PITCHES,
} from "./lattice-identification.constants";

import type { LatticeGraph } from "../meander-lattice/meander-lattice.types";
import type {
  MosaicTile,
  MosaicTileShape,
} from "../mosaic-tile/mosaic-tile.types";
import type {
  LatticeAddress,
  LatticeUnit,
} from "./lattice-identification.types";

/**
 * Names a reading of the lattice: which repeat unit of a rendered document
 * holds which edges, and the hexadecimal string that spells them out.
 *
 * The lattice is the substrate every family is drawn on, so the encoding
 * belongs to it rather than to any one region of it — `mosaic` is the region
 * whose filenames happen to have needed a name first. Reading a unit back
 * out of a finished document and writing that unit down are the same act
 * seen from either end, which is why they sit together here.
 *
 * {@link identifyDocument} reads the **rendered document** rather than
 * asking whatever produced it, so a renderer that draws the wrong thing
 * cannot be handed a name it did not earn. Everything `MeanderLatticeService`
 * refuses is refused here too, unaltered.
 *
 * The folding is a `mosaic` concern and stays one: `MosaicSymmetryService`
 * owns the symmetry group and every tile-shaped operation over it, and
 * {@link canonicalIdentifier} is this service asking it which member of a
 * class to name before naming it. The dependency runs one way — a name
 * needs the group, and the group needs no name.
 */
@Injectable()
export class LatticeIdentificationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MeanderLatticeService)
    private readonly meanderLatticeService: MeanderLatticeService,
    @Inject(MosaicNamingService)
    private readonly mosaicNamingService: MosaicNamingService,
    @Inject(MosaicSymmetryService)
    private readonly mosaicSymmetryService: MosaicSymmetryService,
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Refuses a unit the drawing cannot be addressed at: a pitch or a span
   * that is not a whole number of columns, a span that is not a whole number
   * of pitches, or a drawing too narrow to hold that span with
   * {@link TERMINATION_MARGIN_PITCHES} clear at either end.
   *
   * Every bound is counted in pitches rather than in spans, which is what
   * keeps a drawing whose span is several pitches wide addressable at all:
   * the band's terminations are one unit wide however many units a repeat
   * takes, so demanding a whole span of margin would refuse drawings that
   * are perfectly readable.
   *
   * It says nothing about whether the drawing really repeats at that span.
   * A tile's `north` and `west` are the neighboring point's `south` and
   * `east` with wrap-around, so an address means what it says only for a
   * document that is periodic there — and that is a question about the ink
   * rather than about the canvas, which nothing in this shape check could
   * answer.
   */
  private assertAddressable(graph: LatticeGraph, unit: LatticeUnit): void {
    const { pitch, span } = unit;

    if (!Number.isInteger(pitch) || pitch < 1) {
      throw new InvalidSpanError(
        span,
        `a pitch of ${pitch} is no whole number of columns`,
      );
    }

    if (!Number.isInteger(span) || span < 1) {
      throw new InvalidSpanError(span, "no whole number of columns");
    }

    if (span % pitch !== 0) {
      throw new InvalidSpanError(
        span,
        `no whole number of ${pitch}-column repeat units`,
      );
    }

    const pitches = Math.floor(graph.columns / pitch);
    const required = span / pitch + 2 * TERMINATION_MARGIN_PITCHES;

    if (pitches < required) {
      throw new InvalidSpanError(
        span,
        `a ${graph.columns}-column drawing holds ${pitches} repeat units of ${pitch} columns, too few for the ${required} a span clear of both band terminations needs`,
      );
    }
  }

  // 🌎 Public Methods

  /**
   * The identifier every tile in a symmetry class shares: {@link identify}
   * of the one member `MosaicSymmetryService.canonicalTile` picks. Two tiles
   * draw the same pattern exactly when their canonical identifiers match, so
   * a committed drawing's filename is a complete description of the tile
   * that drew it.
   *
   * It is not the deduplication key the enumeration folds on. That key has
   * to be readable by `MosaicTilesService`, which sits upstream of this
   * service, and `MosaicSymmetryService.edgeKey` separates two classes of
   * one shape exactly as this does — so how a filename is spelled stays a
   * question this module answers alone.
   */
  canonicalIdentifier(tile: MosaicTile): string {
    return this.identify(this.mosaicSymmetryService.canonicalTile(tile));
  }

  /**
   * Names a tile by its own points: one hexadecimal character each, in
   * reading order, worth `8` for `north`, `4` for `south`, `2` for `east`
   * and `1` for `west`.
   *
   * So `0` is a dot, `3` a point on a horizontal run, `c` one on a vertical
   * run, `6` a corner turning south and east, `e` a T-junction, and `f` a
   * crossing. A reader can decode a filename point by point without a table,
   * which is the whole reason the identifier exists.
   *
   * It names a tile completely — the points determine every edge, since each
   * one owns its `east` and its `south` — so two tiles of one shape share a
   * string only when they are the same tile. It does *not* name the shape:
   * the directory a drawing is filed under carries the row count and the
   * column span, so two tiles of different shapes may share a string.
   *
   * The string is deliberately redundant. Four bits per point describes
   * `4 * columns * (rows - 1)` bits where the tile has only
   * `columns * (2 * rows - 3)` degrees of freedom, because every edge is
   * written twice — once at each end. That is the same redundancy
   * `MosaicTileService.assertWellFormed` checks, and paying it here buys a
   * filename whose characters are the tile's own points rather than a packed
   * edge list nobody can read.
   */
  identify(tile: MosaicTile): string {
    return tile.points
      .flatMap((row) =>
        row.map((point) =>
          (
            (point.north ? 8 : 0) +
            (point.south ? 4 : 0) +
            (point.east ? 2 : 0) +
            (point.west ? 1 : 0)
          ).toString(16),
        ),
      )
      .join("");
  }

  /**
   * What a rendered document is, on the lattice: its band's row count, the
   * column span its true repeat was read at, the literal address, the
   * canonical symmetry class beside it, and the sub-family name the ink
   * earns where it earns one.
   *
   * The {@link LatticeUnit} is a parameter rather than something recovered
   * here. How wide one repeat unit is, and how many of them a true repeat
   * takes, are facts about the family that drew the document —
   * `MotifPitchService` derives both — while what the ink *does* over that
   * span is a fact about the document, and only the last of those can be
   * read off the drawing.
   *
   * The addressed window opens one pitch in and closes one pitch short of
   * the end, so a family whose span runs to several pitches is still
   * addressable at the widths the corpus is drawn at.
   *
   * The band's row count is not a parameter, because the document declares
   * it: the canvas height over the grid pitch is the number of grid rows,
   * and the repeat unit is the `rows - 1` interior levels between the two
   * border rules. Those rules are not addressed, exactly as a `mosaic` tile
   * does not address them.
   */
  identifyDocument(document: string, unit: LatticeUnit): LatticeAddress {
    const graph = this.meanderLatticeService.build(document);

    this.assertAddressable(graph, unit);

    const span = unit.span;
    const shape: MosaicTileShape = { columns: span, rows: graph.rows };
    const tile = this.readTile(
      graph,
      shape,
      TERMINATION_MARGIN_PITCHES * unit.pitch,
    );
    const identifier = this.identify(tile);
    const earned = this.mosaicNamingService.name(tile);

    return {
      address: `${graph.rows}r${span}c-${identifier}`,
      canonicalIdentifier: this.canonicalIdentifier(tile),
      identifier,
      rows: graph.rows,
      span,
      ...(earned ? { subFamily: earned } : {}),
    };
  }

  /**
   * The tile the window of a rendered document beginning at `startColumn`
   * draws.
   *
   * A tile point `(level, column)` is the lattice point at column
   * `startColumn + column` and row `level + 1` — the `+ 1` being the top
   * cap tick, which sits on grid level `0` and is not a tile point. An
   * eastward edge is the one-pitch step right from there, a southward edge
   * the step down.
   *
   * The window is placed by a lattice column rather than by a repeat-unit
   * index, because the two stopped agreeing once a span could be several
   * pitches wide: a drawing is addressed one *pitch* in, which is a fraction
   * of a unit when its span is four of them.
   */
  readTile(
    graph: LatticeGraph,
    shape: MosaicTileShape,
    startColumn: number,
  ): MosaicTile {
    const edges = this.mosaicTileService.blankEdges(shape);

    for (const [level, row] of edges.horizontal.entries()) {
      for (const [column] of row.entries()) {
        if (graph.horizontalEdges.has(`${startColumn + column},${level + 1}`)) {
          this.mosaicTileService.mark(edges.horizontal, level, column);
        }
      }
    }

    for (const [level, row] of edges.vertical.entries()) {
      for (const [column] of row.entries()) {
        if (graph.verticalEdges.has(`${startColumn + column},${level + 1}`)) {
          this.mosaicTileService.mark(edges.vertical, level, column);
        }
      }
    }

    return this.mosaicTileService.build(shape, edges);
  }
}
