import { Inject, Injectable } from "@nestjs/common";

import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";

import type {
  MosaicDirections,
  MosaicSubFamily,
  MosaicTile,
} from "../mosaic-motif/mosaic-motif.types";
import type { MosaicNamingRule } from "./mosaic-naming.types";

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

  /** Whether a point carries ink running across the band and none running down it. */
  private isHorizontal(directions: MosaicDirections): boolean {
    return (
      (directions.east || directions.west) &&
      !directions.north &&
      !directions.south
    );
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
   * `lines` and `dashes` are one predicate at two column spans, because at a
   * single column an eastward edge wraps onto its own point and draws a
   * continuous rule rather than a dash reaching the point beside it. That is
   * the one place a name depends on the tile's shape rather than only on how
   * its points are reached.
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
        matches: (tile) => tile.columns === 1 && horizontal(tile),
        name: "lines",
      },
      {
        matches: (tile) => tile.columns > 1 && horizontal(tile),
        name: "dashes",
      },
      { matches: (tile) => vertical(tile), name: "diamond" },
    ];
  }
}
