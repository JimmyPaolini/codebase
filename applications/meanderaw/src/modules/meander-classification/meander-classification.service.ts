import { Inject, Injectable } from "@nestjs/common";

import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";

import { STRUCTURAL_MINIMUM_ROWS } from "./meander-classification.constants";

import type { MeanderCharacteristics } from "../meander-characteristics/meander-characteristics.types";
import type { MeanderPointGrid } from "../meander-decoding/meander-decoding.types";
import type { MosaicSubFamily } from "../mosaic-tile/mosaic-tile.types";
import type {
  MeanderClassification,
  MeanderFamilyRule,
  MeanderShape,
  MeanderStructure,
  MeanderType,
} from "./meander-classification.types";

/**
 * Decides which family a tile belongs to from the tile's own structure,
 * rather than from whichever procedural motif service happened to draw it.
 *
 * This is the layer the lattice-first architecture was missing. Nine of the
 * ten families were families because a per-family generator produced them;
 * only `mosaic` had a structural account of its own space, and even that one
 * only named regions *within* the family. Enumerating one generic unit space
 * leaves every tile with no family attached, so each family needs a
 * definition a tile can be tested against — and this is where those ten
 * definitions are written down.
 *
 * **Every rule below was measured rather than reasoned out.** Each family's
 * committed drawings were read back onto the lattice through
 * `LatticeIdentificationService.readTile` at the span their own filenames
 * declare, and each rule states what that reading found, per repeat:
 *
 * | family | what one repeat measures |
 * | --- | --- |
 * | `cross` | 2 ink crossings, no fork, 3 loops — the only family whose ink crosses and never branches |
 * | `negative` | forks, and closes a loop through each of its own repeats |
 * | `branch` | forks, crosses nowhere, and closes a loop nowhere |
 * | `snake` | one closed loop through every point, one repeat `rows - 1` wide |
 * | `boxes` | one open arc through every point, one repeat `rows - 1` wide |
 * | `chain` | the same arc at the same width — `snake`'s zigzag with one segment omitted |
 * | `swirl` | one open arc, one repeat `2 × rows - 3` wide |
 * | `whirl` | one open arc, one repeat `rows` wide |
 * | `parallel` | `columns / 2` strands, measuring one piece more than that, each with two ends |
 * | `mosaic` | a tile in one of the named regions of the space, and in no other family's |
 *
 * Three consequences are worth stating, because each is a real finding about
 * the corpus rather than a defect in the rules:
 *
 * - **`boxes` and `chain` are one signature.** A spiral and a split zigzag
 *   are both a single open arc through every point of a repeat `rows - 1`
 *   wide, and no count here separates them; at 4 rows they measure
 *   identically down to the corner count. They are separated only below 4
 *   rows, where `chain`'s own structural minimum excludes it. So a tile of
 *   that shape earns both names, {@link matching} reports both, and
 *   {@link classify} records the first.
 * - **`branch`'s own comb is not a `branch`.** Its forks land against the
 *   band's border rules, which sit at grid levels `0` and `rows` and are cap
 *   ticks rather than points of the repeat — so a repeat of it measures two
 *   plain bars with no fork in it at all, which is bar for bar
 *   `parallel`'s one-strand bundle and earns the `bars` region's name. Only
 *   `rung`, whose rungs meet their stile inside the band, measures as a
 *   `branch` here.
 * - **A sub-family is earned beside the family, never in place of it.** That
 *   is `docs/adr/0007-address-every-meander-by-its-lattice.md`'s own finding
 *   — 85 of the 1,118 swept combinations earn one of `mosaic`'s names, 10 in
 *   `branch`, 25 in `negative` and 50 in `parallel` — so {@link classify}
 *   reports the region a tile sits in whatever family it lands in, and
 *   `mosaic` is tried last so that a tile another family already claims
 *   keeps that family and the name both.
 *
 * A family's own `STRUCTURAL_MINIMUM_ROWS` is conjoined into its rule, which
 * is what keeps `boxes` from `chain` below 4 rows and `swirl` from `whirl`
 * at 3, where their two pitch rules coincide. It is the same record the
 * command line validates against, read rather than restated, so a family
 * whose minimum moves moves here too.
 *
 * A tile matching no rule keeps a null family, which spec #813 asks for
 * directly: "a tile violating a family's own rules simply isn't recorded as
 * that family, rather than being filtered out before enumeration". Most
 * tiles of the enumerated space are like that, and that is the point — a
 * family that everything belonged to would say nothing.
 */
@Injectable()
export class MeanderClassificationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicNamingService)
    private readonly mosaicNamingService: MosaicNamingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether a repeat's ink is one open arc with two ends and nothing else — the shape four families share and their pitch rules separate. */
  private isArc(structure: MeanderStructure): boolean {
    const { components, cycles, freeEnds } = structure.characteristics;

    return (
      this.isJunctionFree(structure) &&
      components === 1 &&
      cycles === 0 &&
      freeEnds === 2
    );
  }

  /**
   * Whether a repeat's ink is a bundle of nested brackets: `columns / 2`
   * strands, since a `parallel` strand takes two lattice columns, measuring
   * one piece more than that, every piece an open arc with two ends.
   *
   * The extra piece is measured rather than reasoned out — a repeat of
   * `aligned-strands-2` is three pieces with six ends, and of
   * `aligned-strands-10` eleven with twenty-two — and it is there because a
   * bracket's two arms both end on the band's border rules, which are cap
   * ticks rather than points of the repeat, so the innermost turn is left as
   * a piece of its own.
   */
  private isBundle(structure: MeanderStructure): boolean {
    const { components, cycles, freeEnds } = structure.characteristics;

    return (
      this.isJunctionFree(structure) &&
      cycles === 0 &&
      structure.columns % 2 === 0 &&
      components === structure.columns / 2 + 1 &&
      freeEnds === 2 * components &&
      this.reachesMinimumRows(structure, "parallel")
    );
  }

  /** Whether a repeat's ink is one closed loop through every point, which is what `snake` draws and `chain` is the same drawing minus one segment of. */
  private isClosedLoop(structure: MeanderStructure): boolean {
    const { components, cycles, freeEnds } = structure.characteristics;

    return (
      this.isJunctionFree(structure) &&
      components === 1 &&
      cycles === 1 &&
      freeEnds === 0
    );
  }

  /** Whether a repeat's ink neither forks nor crosses — charter invariants 3 and 4, read off one tile. */
  private isJunctionFree(structure: MeanderStructure): boolean {
    const { inkTJunctions, inkXJunctions } = structure.characteristics;

    return inkTJunctions === 0 && inkXJunctions === 0;
  }

  /** Whether a repeat is deep enough for `family` to draw a non-degenerate motif in, read off the same record the command line validates against. */
  private reachesMinimumRows(
    structure: MeanderStructure,
    family: MeanderType,
  ): boolean {
    return structure.rows >= STRUCTURAL_MINIMUM_ROWS[family];
  }

  // 🌎 Public Methods

  /**
   * The family and the named region one tile's structure earns, each
   * `undefined` where it earns none.
   *
   * The grid is read as a `mosaic` tile for the naming pass alone — that
   * service reads a tile's points and its edges and nothing else, and a
   * decoded Code's grid is exactly those points. It is not validated against
   * the tile agreement invariant here, because a Code the enumerator spelled
   * already satisfies it and a Code a person typed is the caller's own
   * business.
   */
  classify(
    grid: MeanderPointGrid,
    characteristics: MeanderCharacteristics,
    shape: MeanderShape,
  ): MeanderClassification {
    const subFamily = this.subFamily(grid, shape);
    const structure: MeanderStructure = {
      ...shape,
      characteristics,
      subFamily,
    };

    return { family: this.matching(structure)[0], subFamily };
  }

  /**
   * Every family a tile's structure earns, in {@link rules}' own order.
   *
   * More than one is a real answer rather than a defect — spec #813 admits a
   * tile matching zero, one, or several — and `boxes` and `chain` are the
   * pair that reaches two at every row count either of them draws at. Which
   * is why the order matters and is stated in {@link rules} rather than left
   * to whichever rule a filter happens to reach first.
   */
  matching(structure: MeanderStructure): MeanderType[] {
    return this.rules()
      .filter((rule) => rule.matches(structure))
      .map((rule) => rule.name);
  }

  /**
   * Every family's defining combination, in the order they are tried.
   *
   * The order is load-bearing in exactly three places, and nowhere else.
   * `negative` precedes `branch`, because the two relax the same charter
   * invariant and closing a loop is the whole of what separates them.
   * `boxes` precedes `chain`, which is the pair no count here tells apart.
   * And `mosaic` comes last, so a tile another family already claims keeps
   * that family — the region's name is reported beside it either way.
   *
   * See this service's own doc comment for the measurement each rule states.
   */
  rules(): readonly MeanderFamilyRule[] {
    return [
      {
        matches: (structure) =>
          structure.characteristics.inkXJunctions > 0 &&
          structure.characteristics.inkTJunctions === 0 &&
          this.reachesMinimumRows(structure, "cross"),
        name: "cross",
      },
      {
        matches: (structure) =>
          structure.characteristics.inkTJunctions > 0 &&
          structure.characteristics.cycles > 0 &&
          this.reachesMinimumRows(structure, "negative"),
        name: "negative",
      },
      {
        matches: (structure) =>
          structure.characteristics.inkTJunctions > 0 &&
          structure.characteristics.inkXJunctions === 0 &&
          structure.characteristics.cycles === 0 &&
          this.reachesMinimumRows(structure, "branch"),
        name: "branch",
      },
      {
        matches: (structure) =>
          this.isClosedLoop(structure) &&
          structure.columns === structure.rows - 1 &&
          this.reachesMinimumRows(structure, "snake"),
        name: "snake",
      },
      {
        matches: (structure) =>
          this.isArc(structure) &&
          structure.columns === structure.rows - 1 &&
          this.reachesMinimumRows(structure, "boxes"),
        name: "boxes",
      },
      {
        matches: (structure) =>
          this.isArc(structure) &&
          structure.columns === structure.rows - 1 &&
          this.reachesMinimumRows(structure, "chain"),
        name: "chain",
      },
      {
        matches: (structure) =>
          this.isArc(structure) &&
          structure.columns === 2 * structure.rows - 3 &&
          this.reachesMinimumRows(structure, "swirl"),
        name: "swirl",
      },
      {
        matches: (structure) =>
          this.isArc(structure) &&
          structure.columns === structure.rows &&
          this.reachesMinimumRows(structure, "whirl"),
        name: "whirl",
      },
      {
        matches: (structure) => this.isBundle(structure),
        name: "parallel",
      },
      {
        matches: (structure) =>
          structure.subFamily !== undefined &&
          this.reachesMinimumRows(structure, "mosaic"),
        name: "mosaic",
      },
    ];
  }

  /** The named region of the `mosaic` unit space a tile sits in, which a tile of any family may earn — see this service's own doc comment. */
  subFamily(
    grid: MeanderPointGrid,
    shape: MeanderShape,
  ): MosaicSubFamily | undefined {
    return this.mosaicNamingService.name({ ...shape, points: grid });
  }
}
