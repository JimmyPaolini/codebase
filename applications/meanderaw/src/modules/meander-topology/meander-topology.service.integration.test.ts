// cspell:ignore dvvxxd dvvxxvdx dvvxxvvxxd dvvxxvvxxvdx dvvxxvvxxvvxxd
// cspell:ignore hxxhhx hxxhhxxh hxxhhxxhhx hxxhhxxhhxxh hxxhhxxhhxxhhx
// cspell:ignore hxhxhx hxhxhxhx hxhxhxhxhx hxhxhxhxhxhx hxhxhxhxhxhxhx
// cspell:ignore dvx vxvx dvxvx vxvxvx dvxvxvx
// cspell:ignore ddd dddd ddddd dddddd ddddddd
// cspell:ignore lll llll lllll llllll lllllll
// cspell:ignore dld dldl dldld dldldl dldldld
// cspell:ignore ldl ldldl ldldldl
// cspell:ignore dll dlld dlldl dlldll dlldlld
// cspell:ignore lvx lvxl dlvxl lvxlvx lvxlvxl
// — mosaic tile identifiers, one letter per cell of the tile, from
// MOSAIC_MARK_LETTERS in src/modules/mosaic-motif/mosaic-motif.constants.ts.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { DrawCombinationsService } from "../draw/draw-combinations.service";
import { PERMUTATIONS_SUBDIRECTORY } from "../draw/draw.constants";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifRegistryService } from "../meander-generation/motif-registry.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { ParallelMotifService } from "../parallel-motif/parallel-motif.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import { MeanderLatticeService } from "./meander-lattice.service";
import { MeanderTopologyService } from "./meander-topology.service";

import type {
  GenerationParameters,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { LatticeGraph } from "./meander-topology.types";

// 🔧 Configuration

/** One member of the swept space: the parameters to generate, and the labels the assertions read back. */
interface CharterCase {
  readonly label: string;
  readonly parameters: GenerationParameters;
  readonly variant: string;
}

/**
 * The three charter invariants {@link MeanderTopologyService} can measure
 * from a drawing alone. The other four are properties of how a meander is
 * built rather than of the document it produces, so no measurement can
 * decide them and none is declared here.
 */
type CharterInvariant = "no-branching" | "no-crossing" | "space-filling";

/**
 * One invariant a family is allowed to break.
 *
 * The two optional fields narrow the permission from opposite directions,
 * and a relaxation may use either, both, or neither. `modifierNames` names
 * the modifiers that break it, so the family holds the invariant otherwise;
 * `exceptModifierNames` names the modifiers that put it back, so the family
 * breaks it otherwise — including when drawn with no modifier at all, which
 * `modifierNames` alone has no way to say. `cross` needs the second: it
 * crosses by default and stops crossing under `interrupted`.
 */
interface CharterRelaxation {
  readonly exceptModifierNames?: readonly Modifier["name"][];
  readonly invariant: CharterInvariant;
  readonly modifierNames?: readonly Modifier["name"][];
}

/**
 * Which charter invariants each family is allowed to break.
 *
 * The sweep below asserts against this declaration in both directions: an
 * invariant a family does not relax must hold, and one it does relax must
 * actually be broken. A family therefore cannot quietly stop holding an
 * invariant, and cannot quietly hold one it was added to break.
 *
 * A family added to relax an invariant adds its own row here rather than
 * changing the sweep. `Record<MeanderType, …>` makes forgetting a row a type
 * error.
 *
 * `chain` and `snake` relax no-branching under `edge` and `edge-flip`, and
 * that entry is a measurement rather than a design decision. The `edge`
 * family widens the repeat unit past the zigzag it contains, so the zigzag's
 * terminating vertical lands in the interior of the band border rather than
 * at its end, and the border runs on either side of it — three arms of ink
 * meeting, ten per document, at every row count, in the committed reference
 * assets as much as in a fresh run. The charter in `README.md` and
 * `AGENTS.md` records this; #340's own measurement table still reports zero
 * T-junctions across every family and has not been corrected, because
 * editing that issue is outward-facing.
 *
 * `cross` relaxes no-crossing, and is the only family that relaxes it: its
 * warp and weft meet at four-armed `+` junctions, the first degree-4 ink
 * this project has drawn. `interrupted` is the exception because it gives up
 * the grid level either side of each junction, so the bar no longer reaches
 * it and the crossing leaves the ink graph entirely — the family's own
 * account of that is in
 * `docs/adr/0004-draw-crossings-as-a-one-pitch-interlace-break.md`. Nothing
 * else is declared for it: the break keeps every lattice point painted, so
 * space-filling holds in both modes, and neither mode branches.
 *
 * `negative` relaxes no-branching in every one of its modes but one: it inks
 * the corridors a `mosaic` tile leaves, and a cell where three corridors meet
 * becomes a lattice point where three arms of ink meet. The exception is
 * `ruled-closed`, which inverts the `lines` sub-family — the survey's whole
 * "neither" class, whose negative is two straight channels that neither
 * branch nor cross — so it is the one mode of the one branching family that
 * needs no relaxation at all, and naming it is cheaper than a charter that
 * forgives more than it has to. It relaxes no-crossing in three of them, and those
 * three are named, because a cell where *four* corridors meet becomes a
 * lattice point where four arms do. Which sources those are is not a taste:
 * two adjacent corridors in one lattice column is exactly an X-junction, so a
 * source that never puts two openings side by side branches without crossing
 * and one that does cannot avoid it. `brick-straight` is stack bond, whose
 * mortar runs unbroken in both directions where running bond's does not;
 * `grid` inverts the `dots` sub-family, which is nothing but openings; and
 * `brick-upright` inverts `diamond`, whose two-level openings are adjacent by
 * construction. The survey found the same thing across the whole `mosaic`
 * unit space — 3,070 of its 3,179 tiles have a crossing negative — so a
 * `negative` family that crossed nowhere was showing the 3.3% minority.
 * Nothing else is declared: every lattice point of its canvas carries ink in
 * every mode, so space-filling holds throughout.
 *
 * `branch` relaxes no-branching in every one of its modes, which is why its
 * entry names no modifier either. It inks a spanning tree of the band's
 * lattice — every lattice point painted, joined by exactly one fewer step
 * than there are points — so it forks at most of its columns and closes a
 * loop at none. Nothing else is declared for it: no lattice point in any of
 * its modes carries four arms, so invariant 4 holds, and every lattice
 * point carries ink, so space-filling holds. What separates it from
 * `negative` is not the relaxation, which is the same one, but the loops:
 * `negative` is one to five pieces with 10 to 45 cycles among them, and
 * `branch` has none. Both are measured below, not asserted here.
 *
 * `parallel` declares nothing at all, and that empty row is the whole point
 * of the family rather than an omission. Its ink is `N` strands running
 * alongside one another at the same `unit / 2` stroke every other family
 * draws at, nested so that the strands and the channels between them tile
 * the band at one thickness: space-filling holds strictly, no lattice point
 * carries three arms, and none carries four. #340's candidate table and
 * #413 both said `parallel` would relax nothing; unlike most such
 * predictions this one is asserted here rather than restated, in both
 * directions, so a drawing that started branching would fail this sweep.
 *
 * Only the ink is declared here. Invariants 3 and 4 constrain positive space
 * — a family's negative may branch and cross freely, and no family is failed
 * for it.
 */
const RELAXED_INVARIANTS: Record<MeanderType, readonly CharterRelaxation[]> = {
  boxes: [],
  branch: [{ invariant: "no-branching" }],
  chain: [{ invariant: "no-branching", modifierNames: ["edge", "edge-flip"] }],
  cross: [{ exceptModifierNames: ["interrupted"], invariant: "no-crossing" }],
  mosaic: [],
  negative: [
    { exceptModifierNames: ["ruled-closed"], invariant: "no-branching" },
    {
      invariant: "no-crossing",
      modifierNames: ["brick-straight", "brick-upright", "grid"],
    },
  ],
  parallel: [],
  snake: [{ invariant: "no-branching", modifierNames: ["edge", "edge-flip"] }],
  swirl: [],
  whirl: [],
};

/** How a modifier reads in a test name, including whichever parameter it carries. */
const modifierLabel = (modifier: Modifier): string => {
  if (modifier.name === "alternated") {
    return `alternated period ${modifier.period}`;
  }

  if (modifier.name === "comb") {
    return `comb ${modifier.isUpward ? "standing up" : "hanging down"}`;
  }

  if (modifier.name === "dot") {
    return `dot ${modifier.shape}`;
  }

  if (modifier.name === "plied") {
    return `plied ${modifier.strands}`;
  }

  if (modifier.name === "rung") {
    return `rung pointing ${modifier.isLeftward ? "left" : "right"}`;
  }

  if (modifier.name === "stagger") {
    return `stagger over ${modifier.branches} branches`;
  }

  return modifier.name;
};

/**
 * The swept space, read from the same {@link DrawCombinationsService} that
 * `DrawCommand` writes `output/` from. Sweeping the shared enumeration
 * rather than a second copy of it is what makes "the charter gates the
 * corpus this repository commits" a fact rather than a comment: there is one
 * composition, and a family added to it widens both at once.
 *
 * It is instantiated directly rather than resolved from a testing module
 * because `it.each` needs the table at collection time, before any
 * `beforeAll` has run. The service takes no dependencies, so there is
 * nothing for a container to supply.
 *
 * The sweep stops short of `mosaic`'s 3,179 enumerated tiles for one reason:
 * those are reachable only through a motif service, and the charter is
 * tested through `MeanderGenerationService.generate`, the single seam every
 * family, modifier, and validation rule already passes through. Those tiles
 * are gated from disk instead — see the committed-corpus test below.
 *
 * That enumeration runs to the shared `MAXIMUM_VALUE`, so the charter is
 * gated across every row count the command line accepts. It used to stop at
 * 8 while the command line accepted 12, and issue #507 lived in the four row
 * counts between — the reason `DrawCombinationsService` no longer has a
 * sweep maximum of its own.
 */
const charterSweep: readonly CharterCase[] = new DrawCombinationsService()
  .enumerate()
  .map((parameters) => {
    const modifier = parameters.modifier
      ? ` with ${modifierLabel(parameters.modifier)}`
      : "";

    return {
      label: `${parameters.type} at ${parameters.rows} rows${modifier}`,
      parameters,
      variant: `${parameters.type}${modifier}`,
    };
  });

/**
 * How long a corpus-wide measurement may take. Each of the three tests that
 * use it reads all 3,981 committed documents from disk and measures every
 * one, which takes roughly two seconds locally but several times that on a
 * shared CI runner — past vitest's five-second default, which is what failed
 * there while passing everywhere else. Bounded rather than removed, so a
 * genuine hang still fails instead of running forever.
 */
const CORPUS_MEASUREMENT_TIMEOUT_MILLISECONDS = 60_000;

/**
 * How many documents `DrawCommand` commits: 427 named patterns beside two
 * exhaustive halves — 3,179 enumerated `mosaic` tiles and 375 enumerated
 * one-column `negative` sources.
 *
 * The named half was 174 until issue #507. It sampled row counts up to 8
 * while the command line accepted 12, and the four row counts in between
 * were where `chain` and `snake` drew self-retracing ink that no test could
 * see. That half now runs to `MAXIMUM_VALUE`, which is where 128 of the
 * extra 253 come from — every family gained its own four row counts,
 * `branch` and the families with a lower structural minimum included. 55 are
 * `branch`'s, whose modes each gained a parameter: `rung` a direction,
 * `stagger` a branch count swept at four values, and `comb` a direction
 * whose downward half the unmodified drawing already was. The last 70 are
 * `negative`'s, which grew from three modes to ten — seven new sources at
 * ten row counts apiece.
 *
 * Neither exhaustive half followed, and they stay at 3,179 and 375. Both
 * enumerate their space rather than sampling it, so the same four row counts
 * would add 552,002 `mosaic` tiles — see `PERMUTATION_ROWS_SWEEP_MAXIMUM`,
 * which carries the count per row and the reason the cap is not a charter
 * blind spot. The `negative` half stops one row earlier still, and for a
 * reason of its own rather than a budget: every drawing in it inverts a tile
 * the `mosaic` half has already committed, which is what lets the
 * corridor-identity gate cover it completely.
 */
const COMMITTED_CORPUS_SIZE = 427 + 3179 + 375;

/**
 * How many committed documents leave a gap at the band's termination — the
 * one place invariant 2's `channelWidthCompliant` does not look, and the
 * measurement its doc comment cites as the reason that carve-out is
 * load-bearing rather than a formality.
 *
 * Published in seven places and computed in none until this assertion, at a
 * value of 2,114 measured over the six original families' 3,293 documents.
 * It reached 2,120 when `cross` added six, and 2,176 when the named half of
 * the sweep grew to `MAXIMUM_VALUE` — 56 of the 128 documents that added
 * leave such a gap. Nothing would have caught either drift:
 * `channelWidthCompliant` passes either way, because skipping those two
 * columns is exactly what it does. `negative`, `branch`, and `parallel` add
 * none at any row count — each covers its own first and last lattice column
 * — so this number moving by anything other than a change of row range is a
 * family changing how its band ends.
 */
const TERMINATION_GAP_DOCUMENTS = 2176;

/** Where `DrawCommand` writes those documents, and where they are committed. */
const OUTPUT_DIRECTORY = path.join(import.meta.dirname, "../../../output");

/**
 * Every committed document, read off disk.
 *
 * The corpus is a tree rather than two flat directories — `DrawCommand`
 * files each drawing under the family, row count, and column span that
 * produced it — so this walks it rather than listing it, and reports each
 * document by its path relative to `output/`. That path is the document's
 * identity now: two drawings can share a filename where their directories
 * already say which family and row count they belong to.
 *
 * Read one at a time rather than through `Promise.all`: three thousand
 * concurrent opens is enough to exhaust the descriptor limit on a developer
 * machine, and the whole read costs a fraction of a second sequentially.
 * Each directory's entries are sorted before they are walked, so the order
 * the corpus is reported in is the tree's own rather than the filesystem's.
 */
const readCommittedCorpus = async (
  directory: string = OUTPUT_DIRECTORY,
): Promise<{ document: string; name: string }[]> => {
  const documents: { document: string; name: string }[] = [];

  const listing = await readdir(directory, { withFileTypes: true });
  const entries = listing.toSorted((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      documents.push(...(await readCommittedCorpus(entryPath)));
    } else if (entry.name.endsWith(".svg")) {
      documents.push({
        document: await readFile(entryPath, "utf8"),
        name: path.relative(OUTPUT_DIRECTORY, entryPath),
      });
    }
  }

  return documents;
};

/**
 * Whether a document leaves its band's termination open: a lattice point
 * missing from the first or last column, which is the pair
 * `MeanderTopologyService.isChannelWidthCompliant` steps over.
 */
const hasTerminationGap = (graph: LatticeGraph): boolean => {
  for (const column of [0, graph.columns]) {
    for (let row = 0; row <= graph.rows; row += 1) {
      if (!graph.nodes.has(`${column},${row}`)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * The six families #340 measured the negative space of, named so the
 * assertion below can be an allow-list rather than a deny-list.
 *
 * That direction is load-bearing. Invariants 3 and 4 constrain ink; a
 * meander's negative may branch and cross as it likes, and no family may be
 * failed for what its white space does. A deny-list would put every family
 * added later back inside that gate by default, and the only thing standing
 * between it and a failure would be somebody remembering to add its name.
 * Listing the surveyed six instead puts a new family outside by
 * construction.
 */
const NEGATIVE_SPACE_SURVEYED_FAMILIES: ReadonlySet<MeanderType> = new Set([
  "boxes",
  "chain",
  "mosaic",
  "snake",
  "swirl",
  "whirl",
]);

/**
 * Every `negative` mode, beside the committed `mosaic` permutation whose
 * white space it inks.
 *
 * This is what makes "the candidates drawn come from the survey's shortlist"
 * — #415's second acceptance criterion — a fact rather than a comment, and it
 * now carries the seven modes added beside those three as well. The
 * right-hand column names files that were on disk before this family existed,
 * measured by the survey and committed by the permutation sweep, and the
 * assertion below reads both and compares them. The `rows` on the left is one
 * lower than the `rows` in the filename on the right, which is the whole of
 * `NEGATIVE_SOURCE_ROW_OFFSET`.
 *
 * Two details are worth knowing before reading a row of it.
 *
 * **The repeat count is not always six.** A `mosaic` drawing's canvas ends at
 * its rightmost mark, so a tile whose last cell carries a rightward-reaching
 * mark — a horizontal dash, a rule, or, for a two-column tile, simply a
 * second column — declares a canvas one lattice column wider than one whose
 * marks are all dots or all vertical dashes in a single column. `grid` and
 * `brick-upright` are the two of those, so the committed source at six
 * repeats covers the band a `negative` of *five* repeats draws, and that is
 * what they are compared against. It is invariant 7 in miniature: the two
 * families agree on the band and disagree on where it stops.
 *
 * **Some rows name a re-phasing rather than the tile as built.** The
 * permutation sweep files each symmetry class under its canonical
 * representative, and for eight of these fifty the tile this family builds is
 * a re-phasing of that representative — the same wallpaper, started at a
 * different level. The corridor counts are a property of the class, so they
 * match anyway; the identifier is the class's, not the tile's.
 *
 * The sweep also draws `negative` from 8 rows up, past the survey's own
 * range, so those drawings have no committed source to compare against and
 * are absent here. They are still gated by the sweep above, which measures
 * them like every other drawing.
 */
const NEGATIVE_SOURCE_DOCUMENTS: readonly {
  readonly parameters: GenerationParameters;
  readonly sourceName: string;
}[] = (
  [
    {
      columns: 2,
      identifiers: [
        "dvvxxd",
        "dvvxxvdx",
        "dvvxxvvxxd",
        "dvvxxvvxxvdx",
        "dvvxxvvxxvvxxd",
      ],
    },
    {
      columns: 2,
      identifiers: [
        "hxxhhx-dashes",
        "hxxhhxxh-dashes",
        "hxxhhxxhhx-dashes",
        "hxxhhxxhhxxh-dashes",
        "hxxhhxxhhxxhhx-dashes",
      ],
      modifierName: "brick-staggered",
    },
    {
      columns: 2,
      identifiers: [
        "hxhxhx-dashes",
        "hxhxhxhx-dashes",
        "hxhxhxhxhx-dashes",
        "hxhxhxhxhxhx-dashes",
        "hxhxhxhxhxhxhx-dashes",
      ],
      modifierName: "brick-straight",
    },
    {
      columns: 1,
      identifiers: [
        "dvx",
        "vxvx-diamond",
        "dvxvx",
        "vxvxvx-diamond",
        "dvxvxvx",
      ],
      modifierName: "brick-upright",
      repeatCount: 5,
    },
    {
      columns: 1,
      identifiers: [
        "ddd-dots",
        "dddd-dots",
        "ddddd-dots",
        "dddddd-dots",
        "ddddddd-dots",
      ],
      modifierName: "grid",
      repeatCount: 5,
    },
    {
      columns: 1,
      identifiers: ["dld", "dldl", "dldld", "dldldl", "dldldld"],
      modifierName: "ruled",
    },
    {
      columns: 1,
      identifiers: [
        "lll-lines",
        "llll-lines",
        "lllll-lines",
        "llllll-lines",
        "lllllll-lines",
      ],
      modifierName: "ruled-closed",
    },
    {
      columns: 1,
      identifiers: ["ldl", "dldl", "ldldl", "dldldl", "ldldldl"],
      modifierName: "ruled-raised",
    },
    {
      columns: 1,
      identifiers: ["dll", "dlld", "dlldl", "dlldll", "dlldlld"],
      modifierName: "ruled-spaced",
    },
    {
      columns: 1,
      identifiers: ["lvx", "lvxl", "dlvxl", "lvxlvx", "lvxlvxl"],
      modifierName: "ruled-tall",
    },
  ] satisfies readonly {
    columns: number;
    identifiers: readonly string[];
    modifierName?: Modifier["name"];
    repeatCount?: number;
  }[]
).flatMap(({ columns, identifiers, modifierName, repeatCount }) =>
  identifiers.map((identifier, index) => ({
    parameters: {
      repeatCount: repeatCount ?? 6,
      rows: index + 3,
      type: "negative" as const,
      ...(modifierName ? { modifier: { name: modifierName } } : {}),
    },
    sourceName: `mosaic/${index + 4}-rows/permutations/${columns}-columns/${identifier}.svg`,
  })),
);

/**
 * The family a committed document belongs to, read off the directory it is
 * filed under rather than off its filename: `DrawCommand` puts every
 * attribute but the variant and the repeat count into the path.
 */
const familyOf = (name: string): string => name.split("/")[0] ?? name;

/** Whether `parameters` name a drawing the charter declaration allows to break `invariant`. */
const relaxes = (
  parameters: GenerationParameters,
  invariant: CharterInvariant,
): boolean =>
  RELAXED_INVARIANTS[parameters.type].some(
    (relaxation) =>
      relaxation.invariant === invariant &&
      (relaxation.modifierNames === undefined ||
        (parameters.modifier !== undefined &&
          relaxation.modifierNames.includes(parameters.modifier.name))) &&
      (relaxation.exceptModifierNames === undefined ||
        parameters.modifier === undefined ||
        !relaxation.exceptModifierNames.includes(parameters.modifier.name)),
  );

// 🧪 Tests

describe(MeanderTopologyService, () => {
  let generationService: MeanderGenerationService;
  let latticeService: MeanderLatticeService;
  let topologyService: MeanderTopologyService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BoxesMotifService,
        BranchMotifService,
        ChainMotifService,
        CrossMotifService,
        GridGeometryService,
        MeanderGenerationService,
        MeanderLatticeService,
        MeanderTopologyService,
        MosaicMotifService,
        MosaicSubFamilyService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MotifRegistryService,
        MotifTransformsService,
        NegativeMotifService,
        NegativeSourceService,
        ParallelMotifService,
        SnakeMotifService,
        SnakeSequenceService,
        SvgRenderingService,
        SwirlMotifService,
        WhirlMotifService,
      ],
    }).compile();

    generationService = await module.resolve(MeanderGenerationService);
    latticeService = await module.resolve(MeanderLatticeService);
    topologyService = await module.resolve(MeanderTopologyService);
  });

  describe("the meander charter", () => {
    // 🎯 The sweep is built by mapping a service's output. If that
    // enumeration ever shrinks — a renamed constant, a widened union, a type
    // guard that stops matching — every `it.each` below would quietly cover
    // less, or nothing at all, without a single failure. This is the guard
    // against a property test that vacates instead of failing.
    //
    // The count also pins where the sweep stops. 427 is every combination up
    // to `MAXIMUM_VALUE`; 174 was every combination up to 8, and 128 of the
    // difference is the row counts issue #507 was reachable at and untested
    // at. Reverting the sweep to a maximum of its own would fail here
    // rather than quietly narrow the gate.
    it("sweeps every named-type combination DrawCommand writes, out to the deepest row count the command line accepts", () => {
      expect(charterSweep).toHaveLength(427);
      expect(
        Math.max(...charterSweep.map(({ parameters }) => parameters.rows)),
      ).toBe(12);
    });

    it.each(charterSweep)("$label holds it", ({ parameters }) => {
      const topology = topologyService.measure(
        generationService.generate(parameters),
      );

      expect({
        branches: topology.inkTJunctions > 0,
        crosses: topology.inkXJunctions > 0,
        spaceFilling: topology.channelWidthCompliant,
      }).toStrictEqual({
        branches: relaxes(parameters, "no-branching"),
        crosses: relaxes(parameters, "no-crossing"),
        spaceFilling: !relaxes(parameters, "space-filling"),
      });
    });

    // 🎯 This pins the corpus #340 measured and nothing beyond it. It scopes
    // itself by naming the six families that were surveyed, never by naming
    // the families that were not — see
    // `NEGATIVE_SPACE_SURVEYED_FAMILIES` for why the direction matters.
    it("crosses in the negative space only where the spec reported it, across the six families it measured", () => {
      const crossing = charterSweep
        .filter(({ parameters }) =>
          NEGATIVE_SPACE_SURVEYED_FAMILIES.has(parameters.type),
        )
        .filter(
          ({ parameters }) =>
            topologyService.measure(generationService.generate(parameters))
              .negativeXJunctions > 0,
        );

      expect([
        ...new Set(crossing.map(({ variant }) => variant)),
      ]).toStrictEqual([
        "mosaic with alternated period 3",
        "mosaic with split",
      ]);
    });

    // 🎯 The `negative` family's whole claim, in one assertion: its ink is
    // the white space of a document this repository already committed. The
    // two counts are read from two different files by two different routes —
    // one generated here, one measured off disk — so a change to either side
    // that stopped them being complements would fail.
    //
    // The first expectation is the guard against a vacuous `0 === 0`. Every
    // source but one really does have corridors that branch or cross;
    // `ruled-closed` inverts the `lines` sub-family, which the survey put in
    // its "neither" class at every row count, and its negative has neither
    // kind of junction by nature. Asserting the guard as an equality rather
    // than as a threshold names that one exception instead of quietly
    // admitting any other source that stopped having corridors at all.
    it.each(NEGATIVE_SOURCE_DOCUMENTS)(
      "inks exactly the corridors $sourceName leaves",
      async ({ parameters, sourceName }) => {
        const source = topologyService.measure(
          await readFile(path.join(OUTPUT_DIRECTORY, sourceName), "utf8"),
        );
        const negative = topologyService.measure(
          generationService.generate(parameters),
        );

        expect(source.negativeTJunctions + source.negativeXJunctions > 0).toBe(
          parameters.modifier?.name !== "ruled-closed",
        );
        expect({
          branches: negative.inkTJunctions,
          crosses: negative.inkXJunctions,
        }).toStrictEqual({
          branches: source.negativeTJunctions,
          crosses: source.negativeXJunctions,
        });
      },
    );

    // 🎯 The `branch` family's whole claim, taken over the corpus rather
    // than over a family's own drawings: its eighty-eight documents are
    // trees and every other one of the 3,981 is not. Reading from disk is
    // what makes the second half say anything — a family that started
    // drawing loops, or one that stopped, fails here rather than in its own
    // test.
    //
    // The two conditions are separated on purpose. Being a forest is what
    // every family but three already is; being one connected piece is what
    // `negative` already is. Only `branch` is both, and the 3,421 documents
    // that predate it manage it in not a single case.
    it(
      "draws a tree in exactly the branching family's documents",
      async () => {
        const documents = await readCommittedCorpus();
        const trees: string[] = [];
        const looped: string[] = [];
        const negativeCycles: number[] = [];
        const negativeComponents: number[] = [];

        for (const { document, name } of documents) {
          const { components, edges, nodes } =
            topologyService.connectivity(document);

          if (edges !== nodes - components) {
            looped.push(name);
          }

          if (components === 1 && edges === nodes - 1) {
            trees.push(name);
          }

          if (familyOf(name) === "negative") {
            negativeCycles.push(edges - nodes + components);
            negativeComponents.push(components);
          }
        }

        // 🎯 The measurement `README.md`, `AGENTS.md`, and
        // `BranchMotifService`'s own doc comment all cite as the reason
        // `branch` and `negative` are two families rather than one name for
        // one thing. Published in three places and computed in none until
        // this assertion: the cycle count is `edges - nodes + components`,
        // which this loop already had all three inputs for.
        expect(negativeCycles).toHaveLength(475);
        expect(Math.min(...negativeCycles)).toBe(0);
        expect(Math.max(...negativeCycles)).toBe(65);
        expect(Math.min(...negativeComponents)).toBe(1);
        expect(Math.max(...negativeComponents)).toBe(13);

        expect(trees).toHaveLength(88);
        expect(
          [...new Set(trees.map((name) => familyOf(name)))].toSorted(),
        ).toStrictEqual(["branch"]);

        // 🎯 The loops are all somewhere else: 460 of `negative`'s 475
        // corridor networks, `cross`'s seven solid crossings, and the eighteen
        // `snake` drawings whose `edge` pitch closes a loop against the band
        // border. `branch` appears nowhere in this list, which is the half of
        // the claim a tree test alone would not make.
        //
        // The fifteen `negative` documents missing from it are the `lines`
        // sub-family's negative — `ruled-closed` at each of the family's ten
        // row counts, and the same class enumerated at each of the five its
        // permutation half covers. They are why the cycle floor above is zero
        // and the component ceiling thirteen: that source's negative is the
        // band's own rules and nothing joining them, so it is one component
        // per lattice row with no loop anywhere, and the one corner of this
        // family that is a forest like the six oldest.
        expect(looped).toHaveLength(485);
        expect(
          [...new Set(looped.map((name) => familyOf(name)))].toSorted(),
        ).toStrictEqual(["cross", "negative", "snake"]);
      },
      CORPUS_MEASUREMENT_TIMEOUT_MILLISECONDS,
    );

    // 🎯 The two figures the charter's own "ink branches" bullet publishes,
    // read off the named patterns the charter counts them over. Prose and
    // measurement were authored at different moments and nothing else makes
    // them agree, so the count is taken here rather than restated there.
    it("branches in exactly the families the charter names, measured from disk", async () => {
      const corpus = await readCommittedCorpus();
      const documents = corpus.filter(
        ({ name }) => !name.includes(`/${PERMUTATIONS_SUBDIRECTORY}/`),
      );
      const branching: string[] = [];
      let tJunctions = 0;

      for (const { document, name } of documents) {
        const measured = topologyService.measure(document);

        tJunctions += measured.inkTJunctions;

        if (measured.inkTJunctions > 0) {
          branching.push(name);
        }
      }

      expect(documents).toHaveLength(427);
      expect(tJunctions).toBe(5152);
      expect(branching).toHaveLength(214);
      expect(
        [...new Set(branching.map((name) => familyOf(name)))].toSorted(),
      ).toStrictEqual(["branch", "chain", "negative", "snake"]);
    });

    it(
      "holds across every committed document, measured from disk",
      async () => {
        const documents = await readCommittedCorpus();

        expect(documents).toHaveLength(COMMITTED_CORPUS_SIZE);

        const measured = documents.map(({ document, name }) => ({
          name,
          ...topologyService.measure(document),
        }));

        expect(
          measured
            .filter((topology) => !topology.channelWidthCompliant)
            .map(({ name }) => name),
        ).toStrictEqual([]);

        // 🎯 Ink crosses in exactly two families across all 3,981 files, and
        // in neither of them by accident. Taken as three statements rather
        // than one list, so each says something a longer list would bury.
        const crossing = measured.filter(
          (topology) => topology.inkXJunctions > 0,
        );

        expect(
          [...new Set(crossing.map(({ name }) => familyOf(name)))].toSorted(),
        ).toStrictEqual(["cross", "negative"]);

        // 🎯 `cross`'s seven, at twelve junctions per document at every one
        // of its row counts, 6 through 12 — the count is a property of the
        // repeat count rather than of `rows`, which is what the four row
        // counts added with the widened sweep confirm rather than merely
        // illustrate. The `interrupted` renderings of those same seven row
        // counts are absent on purpose: the break takes the junction out of
        // the ink graph.
        expect(
          crossing
            .filter(({ name }) => familyOf(name) === "cross")
            .map(({ inkXJunctions, name }) => `${name} ${inkXJunctions}`),
        ).toStrictEqual([
          "cross/10-rows/plain-6-repeats.svg 12",
          "cross/11-rows/plain-6-repeats.svg 12",
          "cross/12-rows/plain-6-repeats.svg 12",
          "cross/6-rows/plain-6-repeats.svg 12",
          "cross/7-rows/plain-6-repeats.svg 12",
          "cross/8-rows/plain-6-repeats.svg 12",
          "cross/9-rows/plain-6-repeats.svg 12",
        ]);

        // 🎯 `negative`'s named thirty: exactly the three modes
        // `RELAXED_INVARIANTS` names, at every one of the family's ten row
        // counts and at no other mode. How many junctions each carries is
        // pinned mode by mode in `negative-motif.service.unit.test.ts`; what
        // this adds is that the set of crossing modes on disk is the set the
        // charter declares, so a fourth mode that started crossing fails here
        // even if somebody updated that table to match it.
        const namedCrossing = crossing.filter(
          ({ name }) =>
            familyOf(name) === "negative" &&
            !name.includes(`/${PERMUTATIONS_SUBDIRECTORY}/`),
        );

        expect(
          [
            ...new Set(namedCrossing.map(({ name }) => name.split("/").at(-1))),
          ].toSorted(),
        ).toStrictEqual([
          "brick-straight-6-repeats.svg",
          "brick-upright-6-repeats.svg",
          "grid-6-repeats.svg",
        ]);
        expect(namedCrossing).toHaveLength(30);

        // 🎯 And the permutation half's 276, which is a different kind of
        // statement: not a charter declaration but a measurement of the space
        // itself. 276 of its 375 one-column sources cross, 94 branch without
        // crossing, and 5 do neither — the `lines` class at each swept row
        // count. The named half draws six members of this space, and the
        // proportions here are why naming more of them would not have found
        // many more non-crossing ones to name.
        expect(
          crossing.filter(
            ({ name }) =>
              familyOf(name) === "negative" &&
              name.includes(`/${PERMUTATIONS_SUBDIRECTORY}/`),
          ),
        ).toHaveLength(276);
      },
      CORPUS_MEASUREMENT_TIMEOUT_MILLISECONDS,
    );

    // 🎯 The one measurement `channelWidthCompliant`'s carve-out rests on,
    // taken from the same lattice the carve-out steps over. Both halves
    // matter: the count is what the doc comments cite, and the families
    // absent from it are the four that cover their own band ends.
    it(
      "leaves a termination gap in exactly the documents the carve-out is for",
      async () => {
        const documents = await readCommittedCorpus();
        const withGap = documents.filter(({ document }) =>
          hasTerminationGap(latticeService.build(document)),
        );

        expect(documents).toHaveLength(COMMITTED_CORPUS_SIZE);
        expect(withGap).toHaveLength(TERMINATION_GAP_DOCUMENTS);
        expect(
          [...new Set(withGap.map(({ name }) => familyOf(name)))].toSorted(),
        ).toStrictEqual([
          "chain",
          "cross",
          "mosaic",
          "snake",
          "swirl",
          "whirl",
        ]);
      },
      CORPUS_MEASUREMENT_TIMEOUT_MILLISECONDS,
    );

    it.each([
      {
        expected: {
          channelWidthCompliant: true,
          inkTJunctions: 10,
          inkXJunctions: 0,
          negativeTJunctions: 0,
          negativeXJunctions: 0,
        },
        name: "snake-5-rows-6-repeats-edge.svg",
      },
      {
        expected: {
          channelWidthCompliant: true,
          inkTJunctions: 0,
          inkXJunctions: 0,
          negativeTJunctions: 20,
          negativeXJunctions: 9,
        },
        name: "mosaic-5-rows-12-repeats-split.svg",
      },
    ])(
      "is measurable from the committed $name alone",
      async ({ expected, name }) => {
        const document = await readFile(
          path.join(import.meta.dirname, "../../../testing/assets", name),
          "utf8",
        );

        expect(topologyService.measure(document)).toStrictEqual(expected);
      },
    );
  });
});
