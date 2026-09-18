import { Inject, Injectable } from "@nestjs/common";

import { SubFamilyService } from "../classification/sub-family.service";
import { CodeService } from "../code/code.service";
import { TileService } from "../tile/tile.service";

import {
  InvalidSpanError,
  TERMINATION_MARGIN_PITCHES,
} from "./address.constants";
import { LatticeService } from "./lattice.service";

import type { Tile, TileShape } from "../tile/tile.types";
import type { LatticeAddress, LatticeUnit } from "./address.types";
import type { LatticeGraph } from "./lattice.types";

/**
 * Names a reading of the lattice: which repeat unit of a rendered document
 * holds which edges, and the Code that spells them out.
 *
 * The spelling itself is `CodeService`'s — a Code and the tile it names are
 * two ends of one conversion, and both ends belong to the module that owns
 * the string. What is left here is the reading that comes before it: which
 * window of a finished document to address, and which of its lattice edges
 * fall inside that window.
 *
 * {@link identifyDocument} reads the **rendered document** rather than
 * asking whatever produced it, so a renderer that draws the wrong thing
 * cannot be handed a name it did not earn. Everything `LatticeService`
 * refuses is refused here too, unaltered.
 *
 * Where a canonical name is wanted, `CodeService.spellCanonical` is asked
 * for it, and that service asks the symmetry group which member of a class
 * to spell. The dependency runs one way at every link — a name needs the
 * group, and the group needs no name.
 */
@Injectable()
export class AddressService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(LatticeService)
    private readonly latticeService: LatticeService,
    @Inject(SubFamilyService)
    private readonly subFamilyService: SubFamilyService,
    @Inject(TileService)
    private readonly tileService: TileService,
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
   * What a rendered document is, on the lattice: its band's row count, the
   * column span its true repeat was read at, the literal address, the
   * canonical symmetry class beside it, and the sub-family name the ink
   * earns where it earns one.
   *
   * The {@link LatticeUnit} is a parameter rather than something recovered
   * here. How wide one repeat unit is, and how many of them a true repeat
   * takes, are facts about the family that drew the document — the retired
   * per-family pipeline derived both, and a caller now supplies them —
   * while what the ink *does* over that span is a fact about the document,
   * and only the last of those can be read off the drawing.
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
    const graph = this.latticeService.build(document);

    this.assertAddressable(graph, unit);

    const span = unit.span;
    const shape: TileShape = { columns: span, rows: graph.rows };
    const tile = this.readTile(
      graph,
      shape,
      TERMINATION_MARGIN_PITCHES * unit.pitch,
    );
    const identifier = this.codeService.spell(tile);
    const earned = this.subFamilyService.name(tile);

    return {
      address: `${graph.rows}r${span}c-${identifier}`,
      canonicalIdentifier: this.codeService.spellCanonical(tile),
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
  readTile(graph: LatticeGraph, shape: TileShape, startColumn: number): Tile {
    const edges = this.tileService.blankEdges(shape);

    for (const [level, row] of edges.horizontal.entries()) {
      for (const [column] of row.entries()) {
        if (graph.horizontalEdges.has(`${startColumn + column},${level + 1}`)) {
          this.tileService.mark(edges.horizontal, level, column);
        }
      }
    }

    for (const [level, row] of edges.vertical.entries()) {
      for (const [column] of row.entries()) {
        if (graph.verticalEdges.has(`${startColumn + column},${level + 1}`)) {
          this.tileService.mark(edges.vertical, level, column);
        }
      }
    }

    return this.tileService.build(shape, edges);
  }
}
