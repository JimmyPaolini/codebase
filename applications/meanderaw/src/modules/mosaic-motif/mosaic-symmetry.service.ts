// cspell:ignore hxhxhx xhxhxh — mosaic tile identifiers, one letter per
// point of the tile, from MosaicSymmetryService.identify.
import { Inject, Injectable } from "@nestjs/common";

import { MosaicTileService } from "./mosaic-tile.service";

import type {
  MosaicDirections,
  MosaicPointLetters,
  MosaicPointRank,
  MosaicTile,
  MosaicTransform,
  MosaicTransformChoice,
} from "./mosaic-motif.types";

/**
 * The symmetries under which two `mosaic` tiles draw the same pattern, and
 * the identifier that names a tile independently of which of them produced
 * it. A tile repeats forever in both directions, so shifting its columns
 * only re-phases the same wallpaper; reversing its columns or flipping its
 * levels mirrors it. Enumerating every tile and keeping one representative
 * per symmetry class is what turns a combinatorial blow-up into a set small
 * enough to look through.
 *
 * The group has order `4 × columns` — `columns` translations, times a
 * horizontal mirror, times a level flip — and it acts on the tile's edges
 * rather than on its points, because an edge is where the tile's degrees of
 * freedom are. A translation moves an edge along its level; a mirror sends
 * the eastward edge leaving one point to the eastward edge *arriving* at
 * its reflection, which is why its column arithmetic differs by one from
 * the southward edge's; a flip turns the tile upside down, and a southward
 * edge lands one level higher than a horizontal one because it is indexed
 * by the upper of the two levels it joins.
 */
@Injectable()
export class MosaicSymmetryService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** A tile's edges as a bit string, which names it exactly: two tiles of one shape draw the same pattern if and only if these agree. */
  private edgeKey(tile: MosaicTile): string {
    const { horizontal, vertical } = this.mosaicTileService.edges(tile);

    return [...horizontal, ...vertical]
      .flatMap((row) => row.map((isSet) => (isSet ? "1" : "0")))
      .join("");
  }

  /**
   * Where an edge's column lands under one group element. A horizontal
   * mirror reflects the lattice about a vertical line, so a southward edge
   * simply follows its own point while an eastward edge — which spans the
   * gap to the point on its right — lands on the gap to the reflection's
   * left, one column back.
   */
  private mapColumn(column: number, options: MosaicTransform): number {
    const { columns, isHorizontal, mirror, shift } = options;
    const reflected = mirror
      ? (isHorizontal ? -column - 1 : -column) + 2 * columns
      : column;

    return (reflected + shift) % columns;
  }

  /** Every tile the symmetry group maps `tile` to, itself included, with duplicates left in. */
  private orbit(tile: MosaicTile): MosaicTile[] {
    const variants: MosaicTile[] = [];

    for (let shift = 0; shift < tile.columns; shift += 1) {
      for (const mirror of [false, true]) {
        for (const flip of [false, true]) {
          variants.push(this.transform(tile, { flip, mirror, shift }));
        }
      }
    }

    return variants;
  }

  /**
   * Copies one direction's edges from `source` onto `target` under one group
   * element.
   *
   * A flip turns the tile upside down, and a southward edge lands one level
   * higher than an eastward one because it is indexed by the upper of the
   * two levels it joins.
   */
  private place(
    source: readonly (readonly boolean[])[],
    target: readonly boolean[][],
    options: MosaicTransform,
  ): void {
    const lastLevel = options.isHorizontal
      ? options.rows - 2
      : options.rows - 3;

    for (const [level, row] of source.entries()) {
      for (const [column, isSet] of row.entries()) {
        if (isSet) {
          this.mosaicTileService.mark(
            target,
            options.flip ? lastLevel - level : level,
            this.mapColumn(column, options),
          );
        }
      }
    }
  }

  /**
   * How a point is reached, ranked in the order the family's original
   * exact-cover search discovered covers in: a bare point first, then one
   * anchoring a southward edge, then one anchoring an eastward edge, then
   * one reached only by a neighbor's edge.
   *
   * That order is what picks a class's representative, so it is stated here
   * rather than left implicit in a traversal. Two tiles that draw the same
   * pattern differ only by a symmetry, and this is the tie-break that says
   * which of them the corpus draws.
   */
  private rank(directions: MosaicDirections): MosaicPointRank {
    if (directions.south) {
      return 1;
    }

    if (directions.east) {
      return 2;
    }

    return directions.north || directions.west ? 3 : 0;
  }

  /**
   * The key {@link canonicalTile} minimizes: every point's {@link rank} in
   * reading order, then the tile's own edges, so that two tiles which rank
   * alike are still ordered by something rather than by chance.
   */
  private signature(tile: MosaicTile): string {
    const ranks = tile.points
      .flatMap((row) => row.map((directions) => this.rank(directions)))
      .join("");

    return `${ranks}|${this.edgeKey(tile)}`;
  }

  /** The tile one group element maps `tile` to. */
  private transform(
    tile: MosaicTile,
    options: MosaicTransformChoice,
  ): MosaicTile {
    const { columns, rows } = tile;
    const source = this.mosaicTileService.edges(tile);
    const { horizontal, vertical } = this.mosaicTileService.blankEdges(tile);

    this.place(source.horizontal, horizontal, {
      ...options,
      columns,
      isHorizontal: true,
      rows,
    });
    this.place(source.vertical, vertical, {
      ...options,
      columns,
      isHorizontal: false,
      rows,
    });

    return this.mosaicTileService.build(
      { columns, rows },
      { horizontal, vertical },
    );
  }

  // 🌎 Public Methods

  /**
   * The identifier every tile in a symmetry class shares: the
   * lexicographically smallest {@link identify} string over the class. Two
   * tiles draw the same pattern exactly when their canonical identifiers
   * match, so this doubles as the deduplication key.
   */
  canonicalIdentifier(tile: MosaicTile): string {
    let smallest = this.identify(tile);

    for (const variant of this.orbit(tile)) {
      const identifier = this.identify(variant);

      if (identifier < smallest) {
        smallest = identifier;
      }
    }

    return smallest;
  }

  /**
   * The one tile of a symmetry class the corpus draws. Every member draws
   * the same pattern up to a shift or a mirror, so which one is committed
   * is a choice rather than a fact, and {@link rank} is where that choice
   * is written down.
   */
  canonicalTile(tile: MosaicTile): MosaicTile {
    let best = tile;
    let smallest = this.signature(tile);

    for (const variant of this.orbit(tile)) {
      const signature = this.signature(variant);

      if (signature < smallest) {
        best = variant;
        smallest = signature;
      }
    }

    return best;
  }

  /**
   * Names a tile by its own points, row-major from the top interior level:
   * `d` for a bare point, `v` where a southward edge is anchored, `h` where
   * an eastward one is, `l` where that eastward edge is the single-column
   * rule wrapping onto its own point, and `x` for a point reached only by a
   * neighbor's edge. `x` sorts after every other letter on purpose, so the
   * smallest identifier in a symmetry class is the one anchoring its edges
   * earliest — `hxhxhx` for the `dashes` tile rather than the `xhxhxh` its
   * own mirror would give. The string names every point, so it is both a
   * complete description of the tile and safe to use as a filename.
   */
  identify(tile: MosaicTile): string {
    const letters: MosaicPointLetters = [
      "d",
      "v",
      tile.columns === 1 ? "l" : "h",
      "x",
    ];

    return tile.points
      .flatMap((row) => row.map((point) => letters[this.rank(point)]))
      .join("");
  }

  /**
   * Every distinct tile that draws the same pattern as `tile`, itself
   * included — its symmetry class, as tiles rather than as a name.
   *
   * The group has `4 × columns` elements but a class can be smaller than
   * that, because a tile symmetric under one of them is mapped to itself by
   * it. Summing these sizes over the enumeration is what recovers the
   * unfolded tile count from the folded one.
   */
  variants(tile: MosaicTile): MosaicTile[] {
    const distinct = new Map<string, MosaicTile>();

    for (const variant of this.orbit(tile)) {
      distinct.set(this.edgeKey(variant), variant);
    }

    return [...distinct.values()];
  }
}
