import { Inject, Injectable } from "@nestjs/common";

import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";

import type {
  MosaicDirections,
  MosaicSubFamily,
  MosaicTile,
} from "../mosaic-motif/mosaic-motif.types";
import type {
  MosaicNamingRule,
  MosaicUnbrokenRuns,
} from "./mosaic-naming.types";

/**
 * Names the recognizable regions of the `mosaic` family's unit space.
 *
 * A tile is identified by its bit string, which describes it exactly and
 * tells a reader nothing. A name is the missing half: a word for a whole
 * region of the space, earned by a tile's structure rather than assigned to
 * it. `MosaicSymmetryService.canonicalIdentifier` says which tile this is;
 * this says what kind of tile it is, where there is a kind to say.
 *
 * Three things follow from names being rules rather than labels:
 *
 * - **A name keeps working outside the enumeration.** Nothing here consults
 *   a list of known identifiers, so a tile at a row or column count nobody
 *   has swept is named exactly as one inside it would be.
 * - **A tile matching no rule keeps its bit string** rather than being
 *   forced into the nearest name. Most tiles are like this, and that is the
 *   point: a name that everything has says nothing.
 * - **A tile matching two rules is a defect in the rule set**, not a tie to
 *   break. {@link matching} exists so a test can say so over the whole
 *   space, and the rules are written to be exclusive by construction: each
 *   one requires the *absence* of the directions the others are about, so
 *   they stay disjoint at any degree rather than only where a point can
 *   carry one edge.
 */
@Injectable()
export class MosaicNamingService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether every point of a tile satisfies `predicate`. */
  private everyPoint(
    tile: MosaicTile,
    predicate: (directions: MosaicDirections) => boolean,
  ): boolean {
    return tile.points.every((row) => row.every((point) => predicate(point)));
  }

  /** Whether a point turns a corner: two bits, one of them running across the band and one down it. */
  private isCorner(directions: MosaicDirections): boolean {
    return (
      this.mosaicTileService.degree(directions) === 2 &&
      (directions.east || directions.west) &&
      (directions.north || directions.south)
    );
  }

  /** Whether every edge of one direction's grid is drawn, so its runs are unbroken. */
  private isEveryEdgeDrawn(grid: readonly (readonly boolean[])[]): boolean {
    return grid.every((row) => row.every(Boolean));
  }

  /** Whether a point carries ink running across the band and none running down it. */
  private isHorizontal(directions: MosaicDirections): boolean {
    return (
      (directions.east || directions.west) &&
      !directions.north &&
      !directions.south
    );
  }

  /**
   * Whether a tile's runs are unbroken in each direction: `across` when every
   * eastward edge is drawn, so each level is one continuous rule, and `down`
   * when every southward edge is, so each column is one continuous bar.
   *
   * This is asked of the edges rather than of the points because a point
   * cannot tell: a point in the middle of a rule and a point at the end of a
   * dash both carry ink running across the band, and only the edge that
   * would join it to its neighbor says which it is.
   */
  private isUnbroken(tile: MosaicTile): MosaicUnbrokenRuns {
    const { horizontal, vertical } = this.mosaicTileService.edges(tile);

    return {
      across: this.isEveryEdgeDrawn(horizontal),
      down: this.isEveryEdgeDrawn(vertical),
    };
  }

  /** Whether a point carries ink running down the band and none running across it. */
  private isVertical(directions: MosaicDirections): boolean {
    return (
      (directions.north || directions.south) &&
      !directions.east &&
      !directions.west
    );
  }

  // 🌎 Public Methods

  /**
   * Every name a tile's structure earns. One is a named tile, none is an
   * anonymous one, and more than one is a bug in {@link rules} that
   * `mosaic-naming.service.unit.test.ts` asserts against the whole
   * enumerated space.
   */
  matching(tile: MosaicTile): MosaicSubFamily[] {
    return this.rules()
      .filter((rule) => rule.matches(tile))
      .map((rule) => rule.name);
  }

  /** The name a tile's structure earns, or `undefined` where it earns none. */
  name(tile: MosaicTile): MosaicSubFamily | undefined {
    return this.matching(tile)[0];
  }

  /**
   * Every rule, in the order they are tried — which cannot matter, since a
   * tile satisfying two of them is a defect rather than a precedence
   * question.
   *
   * Six of the seven come in pairs, and the pairing is what the earlier rule
   * set got wrong. Ink running **across** the band is either a continuous
   * rule at every level (`lines`) or broken somewhere (`dashes`); ink
   * running **down** it is either a continuous bar in every column (`bars`)
   * or broken somewhere (`diamond`). Asking only "is every point reached the
   * same way" cannot tell those apart, so a solid bar was called a
   * `diamond` — which is a *dashed* bar — and a two-column tile of unbroken
   * rules was called `dashes`. Whether the run is broken is the question,
   * and it is asked of the edges rather than of the points.
   *
   * The other two are the ends of the space rather than a pair. `dots` is
   * the tile with no edge at all and `mesh` the tile with every edge; each
   * is one tile per shape, and between them they are what the family looks
   * like at its two extremes.
   *
   * `steps` is the only rule about a point's *shape* rather than about which
   * directions a tile uses. Every point turning a corner is a staircase, and
   * it is the closest thing in the space to the fret the project is named
   * after. It is empty at a single column, where a point's eastward edge
   * wraps onto itself and gives it two horizontal bits rather than one.
   */
  rules(): readonly MosaicNamingRule[] {
    const bare = (tile: MosaicTile): boolean =>
      this.everyPoint(tile, (point) => this.mosaicTileService.isBare(point));
    const horizontal = (tile: MosaicTile): boolean =>
      this.everyPoint(tile, (point) => this.isHorizontal(point));
    const vertical = (tile: MosaicTile): boolean =>
      this.everyPoint(tile, (point) => this.isVertical(point));

    return [
      { matches: (tile) => bare(tile), name: "dots" },
      {
        matches: (tile) => horizontal(tile) && this.isUnbroken(tile).across,
        name: "lines",
      },
      {
        matches: (tile) => horizontal(tile) && !this.isUnbroken(tile).across,
        name: "dashes",
      },
      {
        matches: (tile) => vertical(tile) && this.isUnbroken(tile).down,
        name: "bars",
      },
      {
        matches: (tile) => vertical(tile) && !this.isUnbroken(tile).down,
        name: "diamond",
      },
      {
        matches: (tile) => {
          const unbroken = this.isUnbroken(tile);

          return unbroken.across && unbroken.down;
        },
        name: "mesh",
      },
      {
        matches: (tile) =>
          this.everyPoint(tile, (point) => this.isCorner(point)),
        name: "steps",
      },
    ];
  }
}
