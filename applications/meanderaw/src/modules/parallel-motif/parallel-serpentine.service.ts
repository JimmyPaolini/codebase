import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import {
  COLUMNS_PER_SERPENTINE_UNIT,
  SERPENTINE_FLIPS,
} from "./parallel-motif.constants";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  MotifUnit,
  SerpentineFlip,
} from "../meander-generation/meander-generation.types";
import type {
  SerpentineRibbon,
  SerpentineStrip,
  SerpentineUnitPlacement,
  SerpentineVariant,
} from "./parallel-motif.types";

/**
 * Draws the `parallel` family's `serpentine` ply: `N` continuous ribbons
 * stacked one above another, each running the whole width of the band as a
 * square wave.
 *
 * **This is the family's second shape, and it nests on the other axis.**
 * `plied` and `aligned` nest brackets *across* the band — a bundle of `N`
 * of them is `2N` lattice columns wide, so asking for more strands widens
 * every repeat unit. `serpentine` stacks its strands *down* the band
 * instead: the repeat unit is {@link COLUMNS_PER_SERPENTINE_UNIT} columns
 * wide whatever the ply, and a deeper ply divides the same band into more,
 * shallower ribbons. That is why one strand of this shape is a drawing and
 * not a degenerate case — it is the whole band as a single ribbon.
 *
 * **Why it reads as an S rather than a U.** A bracket turns once and stops,
 * so a `plied` band is a row of separate ⊔ and ⊓ pieces with free ends at
 * the border. A ribbon here never stops: it runs down one column, along the
 * bottom of its own strip, up the next column, along the top, and on — so
 * every two columns it completes one ⊔⊓ pair *joined at both turns*, which
 * is a square-cornered S lying on its side. The charter admits no curves
 * (invariant 1 takes `M`, `H`, and `V` and nothing else), so the S is drawn
 * with square corners, which is what every Greek key is anyway.
 *
 * **Why it is exactly space-filling, for any ply the validator admits.**
 * The `R + 1` lattice rows are cut into `N` strips by {@link strips}, with
 * no row in two strips and no row in none. Inside its own strip a ribbon
 * puts a full-height vertical run in *every* column, so every lattice point
 * of that strip carries ink; taken together the strips are the whole band.
 * The strands are node-disjoint because their strips are row-disjoint, so
 * nothing here can branch or cross by construction rather than by luck:
 * a lattice point carries the two arms of a run it sits inside, or one arm
 * and one connector at a turn, and never a third. The family declares no
 * charter relaxation and this shape needs none.
 *
 * **Why the connectors cannot collide.** A connector joins column `c` to
 * column `c + 1` at the bottom of the strip when `c` is even and at the top
 * when it is odd, so the two connectors touching any one column sit at
 * opposite ends of it. Were they to share an end, that lattice point would
 * carry two connectors and a vertical run — a three-armed junction, and the
 * one way this construction could have broken invariant 3.
 *
 * A one-row strip is the honest degenerate case: its vertical runs have
 * zero length and its connectors all fall on the same row, so the ribbon
 * flattens to a straight rule. It still covers its row, still carries two
 * arms at every interior point, and still tiles with the ribbons either
 * side of it — it has simply run out of room to wave, which is what a ply
 * as deep as the row count means.
 */
@Injectable()
export class ParallelSerpentineService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The row a connector out of `column` to its right sits on: the bottom of
   * the strip from an even column and the top from an odd one.
   *
   * That alternation is the wave. It is keyed on the column's absolute
   * lattice index rather than its position inside the repeat unit, so the
   * phase carries across a unit boundary and the ribbon drawn by one unit
   * meets the ribbon drawn by the next without a seam.
   */
  private connectorRow(
    strip: SerpentineStrip,
    column: number,
    isFlipped: boolean,
  ): number {
    const turnsAtBottom = column % 2 === 0;

    return turnsAtBottom === isFlipped ? strip.topRow : strip.bottomRow;
  }

  /** One grid level as a formatted pixel coordinate; the grid is square, so a row and a column convert the same way. */
  private coordinate(geometry: GridGeometry, level: number): string {
    return this.gridGeometryService.formatCoordinate(
      geometry.offset + level * geometry.unit,
    );
  }

  /**
   * Whether ribbon `index` is turned upside down.
   *
   * Flipping a ribbon inverts nothing but its phase — it still runs a
   * full-height vertical in every column of its own strip, so it covers
   * exactly what it covered before. That is why no flip can cost the family
   * a charter invariant: the exact cover is an argument about the strip, and
   * the phase is an argument about the order the ribbon visits it in.
   */
  private isFlipped(
    flip: SerpentineFlip | undefined,
    index: number,
    strands: number,
  ): boolean {
    if (flip === undefined) {
      return false;
    }

    if (flip === "alternating") {
      return index % 2 === 1;
    }

    return index === strands - 1;
  }

  /**
   * One strand's run through one repeat unit: a full-height vertical in each
   * of the unit's columns, joined by the connector that turns the wave into
   * the column after it.
   *
   * The band's very last column draws its vertical and stops. Every other
   * column hands the ribbon on, including the last column of every
   * non-final unit — which is what makes one unit's wave continuous with
   * the next one's rather than a row of separate pieces.
   */
  private ribbonPath(
    geometry: GridGeometry,
    ribbon: SerpentineRibbon,
    placement: SerpentineUnitPlacement,
  ): string {
    const { isFlipped, strip } = ribbon;
    const { firstColumn, isLastUnit } = placement;

    const segments = Array.from(
      { length: COLUMNS_PER_SERPENTINE_UNIT },
      (_value, offset) => {
        const column = firstColumn + offset;
        const entryRow = this.connectorRow(strip, column - 1, isFlipped);
        const exitRow = this.connectorRow(strip, column, isFlipped);
        const isLastColumn =
          isLastUnit && offset === COLUMNS_PER_SERPENTINE_UNIT - 1;
        const connector = isLastColumn
          ? ""
          : `H${this.coordinate(geometry, column + 1)}`;

        return `M${this.coordinate(geometry, column)} ${this.coordinate(
          geometry,
          entryRow,
        )}V${this.coordinate(geometry, exitRow)}${connector}`;
      },
    );

    return segments.join("");
  }

  // 🌎 Public Methods

  /**
   * The depths of `strands` strips over a `rows` band, rotated `offset`
   * places.
   *
   * Floor division gives depths differing by at most one row, and it always
   * puts the deeper strips last — so the shallow ones, including any strip
   * with no room to wave at all, are pinned to the top of every drawing.
   * Rotating the sequence is what unpins them: at the row and strand counts
   * where exactly one strip is flat, the `strands` rotations are exactly the
   * `strands` positions that flat rule can sit at.
   *
   * Rotation rather than an arbitrary rearrangement, because the depths are
   * a cyclic sequence and their rotations are a bounded family — `strands`
   * of them, and fewer once duplicates are dropped. Every arrangement of the
   * multiset would be a combinatorial explosion: a ten-strand bundle over
   * twelve rows has 120 of them, against ten rotations.
   */
  private stripDepths(rows: number, strands: number, offset: number): number[] {
    const latticeRows = rows + 1;
    const depths = Array.from(
      { length: strands },
      (_value, index) =>
        Math.floor(((index + 1) * latticeRows) / strands) -
        Math.floor((index * latticeRows) / strands),
    );
    const places = ((offset % strands) + strands) % strands;

    return [...depths.slice(places), ...depths.slice(0, places)];
  }

  /**
   * Draws one repeat unit of every ribbon in the stack.
   *
   * Each column is drawn as one run — down (or up) its own strip, then one
   * step right along the connector — so the unit hands the next unit a
   * ribbon already turned. `isLastUnit` is what stops the final column
   * trailing a connector into a column the band does not have.
   */
  path(geometry: GridGeometry, unit: MotifUnit, strands: number): string {
    const placement: SerpentineUnitPlacement = {
      firstColumn: COLUMNS_PER_SERPENTINE_UNIT * unit.unitIndex,
      isLastUnit: unit.isLastUnit,
    };

    const flip =
      unit.modifier?.name === "serpentine" ? unit.modifier.flip : undefined;
    const offset =
      unit.modifier?.name === "serpentine" ? unit.modifier.offset : undefined;

    return this.strips(unit.rows, strands, offset)
      .map((strip, index) =>
        this.ribbonPath(
          geometry,
          { isFlipped: this.isFlipped(flip, index, strands), strip },
          placement,
        ),
      )
      .join("");
  }

  /**
   * Cuts the band's `rows + 1` lattice rows into `strands` strips, each at
   * least one row deep.
   *
   * Floor-division boundaries are what keep the cut even: no two strips
   * differ in depth by more than a single row, which is as even as an
   * integer partition of an indivisible height gets. That matters because
   * the family's claim is that its strands run *alongside* one another — a
   * remainder banked on one ribbon would leave it conspicuously deeper than
   * the rest and the band would read as one wave with hangers-on.
   *
   * Where the deeper strips fall is a consequence rather than a choice:
   * `floor` pushes them to the bottom of the band, so 7 lattice rows over 3
   * strands come out 2, 2, 3 rather than 3, 2, 2. Nothing depends on the
   * direction, and it is written down here only so that reading the output
   * does not raise the question.
   */
  strips(rows: number, strands: number, offset = 0): SerpentineStrip[] {
    const rotated = this.stripDepths(rows, strands, offset);
    const result: SerpentineStrip[] = [];
    let topRow = 0;

    for (const depth of rotated) {
      result.push({ bottomRow: topRow + depth - 1, topRow });
      topRow += depth;
    }

    return result;
  }

  /**
   * Every distinct drawing this shape has at `rows` and `strands`, as the
   * variant each one is asked for by.
   *
   * Distinct is measured rather than reasoned about, and the thing measured
   * is what the drawing actually depends on: the strips, and which ribbons
   * are flipped *among those with room to be*. Three separate collapses hide
   * in that sentence, and no two of them happen in the same place:
   *
   * - **Rotating equal depths changes nothing.** A ply that divides the band
   *   evenly has one rotation rather than `strands`.
   * - **`"alternating"` and `"one"` name the same ribbon below three
   *   strands**, and different ribbons from three on.
   * - **Flipping a flat ribbon is a no-op.** A strip one row deep turns at
   *   the top and the bottom of the same row, so inverting its phase leaves
   *   the path byte-identical — which is why the key masks a flip on a strip
   *   with no depth rather than recording it.
   *
   * That last one is the reason the key is not simply the flip mode: it is a
   * property of the partition, so it bites at exactly the row and strand
   * counts where a strip runs out of room to wave, and nowhere else.
   * Enumerating the cross product and committing it would put the same bytes
   * on disk under several filenames.
   *
   * The variant that rotates nothing and turns nothing over is emitted
   * first and carries neither field, so it keeps the bare
   * `serpentine-strands-N` name it had before either axis existed.
   */
  variants(rows: number, strands: number): SerpentineVariant[] {
    const seen = new Set<string>();
    const kept: SerpentineVariant[] = [];

    for (const offset of Array.from(
      { length: strands },
      (_value, index) => index,
    )) {
      for (const flip of SERPENTINE_FLIPS) {
        const strips = this.strips(rows, strands, offset);
        const flipped = strips.map(
          (strip, index) =>
            this.isFlipped(flip, index, strands) &&
            strip.bottomRow > strip.topRow,
        );
        const key = JSON.stringify([strips, flipped]);

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        kept.push({
          ...(flip === undefined ? {} : { flip }),
          ...(offset === 0 ? {} : { offset }),
        });
      }
    }

    return kept;
  }
}
