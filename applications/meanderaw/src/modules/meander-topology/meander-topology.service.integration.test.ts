import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { DrawCombinationsService } from "../draw/draw-combinations.service";
import { COLUMN_SPAN_PATTERN } from "../draw/draw.constants";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { LatticeIdentificationService } from "../lattice-identification/lattice-identification.service";
import { TILE_DRAWN_TYPES } from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifRegistryService } from "../meander-generation/motif-registry.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicSubFamilyService } from "../mosaic-tile/mosaic-sub-family.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-tile/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-tile/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-tile/mosaic-tiles.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { ParallelMotifService } from "../parallel-motif/parallel-motif.service";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { FILENAME_ADDRESS_SUFFIX_PATTERN } from "../svg-rendering/svg-rendering.constants";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import { MeanderTopologyService } from "./meander-topology.service";

import type {
  GenerationParameters,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { LatticeGraph } from "../meander-lattice/meander-lattice.types";

// 🔧 Configuration

/** One member of the swept space: the parameters to generate, and the labels the assertions read back. */
interface CharterCase {
  readonly label: string;
  readonly parameters: GenerationParameters;
  readonly variant: string;
}

/**
 * A structural property of a drawing that a relaxation can be narrowed by,
 * where no set of modifier names can say the same thing.
 *
 * There is one, and `parallel` is the only family that needs it. A border
 * rule forks against ink that rises out of the border row, and a `serpentine`
 * whose first and last strips are each one lattice row deep has none: the
 * flat ribbon on such a strip *is* the rule, so nothing rises to meet it.
 * Every other drawing in the family has an arm or a run reaching a border.
 * `serpentine` drawings therefore both do and do not fork, at the same
 * modifier name, decided by the rotation and the ply — which is exactly what
 * `modifierNames` and `exceptModifierNames` cannot express.
 *
 * {@link CHARTER_CONDITIONS} resolves it, from the same
 * `ParallelSerpentineService.strips` the drawing is cut by.
 */
type CharterCondition = "border-strip-has-depth";

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
 * The two modifier fields narrow the permission from opposite directions,
 * and a relaxation may use either, both, or neither. `modifierNames` names
 * the modifiers that break it, so the family holds the invariant otherwise;
 * `exceptModifierNames` names the modifiers that put it back, so the family
 * breaks it otherwise — including when drawn with no modifier at all, which
 * `modifierNames` alone has no way to say. `cross` needs the second: it
 * crosses by default and stops crossing under `interrupted`.
 *
 * `condition` narrows it by structure rather than by name, for the family
 * whose own parameters decide the answer — see {@link CharterCondition}.
 *
 * `permutations` says the permission is about the family's **enumerated**
 * half rather than its named one. `mosaic` needs it: a name reaches a
 * handful of points in its unit space and none of them branch, while the
 * space itself is every assignment of direction bits and most of it does. A
 * relaxation marked this way is therefore invisible to the sweep below,
 * which draws only named parameters, and is asserted instead against the
 * committed permutation documents — in both directions, exactly as the
 * sweep asserts the rest.
 */
interface CharterRelaxation {
  readonly condition?: CharterCondition;
  readonly exceptModifierNames?: readonly Modifier["name"][];
  readonly invariant: CharterInvariant;
  readonly modifierNames?: readonly Modifier["name"][];
  readonly permutations?: boolean;
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
 * entry names no modifier either. It inks a spine and teeth over the band's
 * lattice — every lattice point painted — inset by one lattice row from the
 * rules that close the band, so it forks wherever a rail meets a tooth. The
 * fewest forks any of its 60 documents leaves is 10, so the relaxation is
 * exercised rather than merely permitted, and the row count at which one of
 * its modes stopped forking is what sets `STRUCTURAL_MINIMUM_ROWS.branch`.
 * Nothing else is declared for it: no lattice point in any of its modes
 * carries four arms, so invariant 4 holds, and every lattice point carries
 * ink, so space-filling holds.
 *
 * It closes a loop nowhere, and that is the only thing separating it from
 * `negative`, whose relaxation is the same one. It briefly closed 5 to 29 of
 * them, while a rule ran along both of its borders and touched the figure —
 * which is exactly what made every `stagger` drawing render as the plain
 * comb. Insetting the figure from its rules leaves each rule a piece of its
 * own, so the family is a forest of two or three pieces with no loop
 * again —
 * against `negative`'s one to thirteen pieces with 0 to 65 cycles among
 * them. Both are measured below, not asserted here, and no charter
 * invariant is about a loop.
 *
 * `parallel` relaxes no-branching, and it is the one row here narrowed by a
 * structural condition rather than by a modifier name. Both of its borders
 * are ruled end to end now, and a rule meets a strand's rising end with
 * west, east, and south ink at one lattice point — so 642 of its 786
 * drawings fork. The other 144 are the `serpentine` drawings whose first and
 * last strips are each one lattice row deep: the flat ribbon on such a strip
 * is the rule, so nothing rises to meet it. That is a fact about the ply and
 * the rotation rather than about the modifier, which is why an unconditional
 * row would be asserted in both directions and fail on those 144. #340's
 * candidate table and #413 both predicted this family would relax nothing;
 * closing its borders is what reversed that, and no prose here is trusted
 * over the sweep.
 *
 * Nothing else is declared for it. A border row has no ink above it, so no
 * lattice point gains a fourth arm and invariant 4 holds; every lattice
 * point still carries ink, so space-filling holds strictly.
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
  mosaic: [
    { invariant: "no-branching", permutations: true },
    { invariant: "no-crossing", permutations: true },
  ],
  negative: [
    { exceptModifierNames: ["ruled-closed"], invariant: "no-branching" },
    {
      invariant: "no-crossing",
      modifierNames: ["brick-straight", "brick-upright", "grid"],
    },
  ],
  parallel: [
    { condition: "border-strip-has-depth", invariant: "no-branching" },
  ],
  snake: [{ invariant: "no-branching", modifierNames: ["edge", "edge-flip"] }],
  swirl: [],
  whirl: [],
};

/** How a modifier reads in a test name, including whichever parameter it carries. */
const modifierLabel = (modifier: Modifier): string => {
  if ("strands" in modifier) {
    return `${modifier.name} ${modifier.strands}`;
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
 * The geometry both the sweep and {@link CHARTER_CONDITIONS} ask, constructed
 * by hand for the same reason {@link NEGATIVE_SOURCE_DOCUMENTS}'s services
 * are: `it.each` needs its table at collection time, before any `beforeAll`
 * has run.
 *
 * One instance rather than two, because the two callers ask it the same
 * question from opposite ends — which rotations of a ply are distinct
 * drawings, and how deep the strips of one of them are.
 */
const parallelSerpentineService = new ParallelSerpentineService(
  new GridGeometryService(),
);

/**
 * How each {@link CharterCondition} is decided, from the drawing's own swept
 * parameters.
 *
 * A total record rather than a chain of tests, for the same reason
 * {@link RELAXED_INVARIANTS} is one: a condition added to the union without
 * an answer here is a type error rather than a silent `undefined`.
 *
 * It reads `strips` rather than measuring the drawing. Measuring would make
 * the assertion circular — the sweep would compare a drawing against itself
 * and pass whatever it did — so what is declared here stays a claim about
 * the parameters, and the ink is what has to agree with it.
 */
const CHARTER_CONDITIONS: Record<
  CharterCondition,
  (parameters: GenerationParameters) => boolean
> = {
  "border-strip-has-depth": ({ modifier, rows }) => {
    if (modifier?.name !== "serpentine") {
      return true;
    }

    const strips = parallelSerpentineService.strips(
      rows,
      modifier.strands,
      modifier.offset,
    );
    const first = strips.at(0);
    const last = strips.at(-1);

    return (
      first === undefined ||
      last === undefined ||
      first.bottomRow > first.topRow ||
      last.bottomRow > last.topRow
    );
  },
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
 * `beforeAll` has run — see {@link parallelSerpentineService}, the one
 * dependency it takes. It needs that service because `serpentine`'s variant
 * space is not a cross product: which rotations and flips are distinct at a
 * given ply is a fact about the geometry, and asking the geometry is what
 * keeps the sweep from committing the same drawing twice.
 *
 * The sweep stops short of `mosaic`'s 8,551 enumerated tiles for one reason:
 * those are reachable only through a motif service, and the charter is
 * tested through `MeanderGenerationService.generate`, the single seam every
 * family, modifier, and validation rule already passes through. Those tiles
 * are gated from disk instead — see the committed-corpus test below.
 *
 * That enumeration runs to each family's own `FAMILY_MAXIMUM_ROWS`, which
 * is the same record `generate` validates against, so the charter is gated
 * across every row count the command line accepts — including `mosaic`'s
 * lower ceiling of 6. It used to stop at 8 while the command line accepted
 * 12 for every family alike, and issue #507 lived in the four row counts
 * between — the reason `DrawCombinationsService` no longer has a sweep
 * maximum of its own.
 */
const charterSweep: readonly CharterCase[] = new DrawCombinationsService(
  parallelSerpentineService,
)
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
 * use it reads all 9,863 committed documents from disk and measures every
 * one, which takes well under a second locally but several times that on a
 * shared CI runner — past vitest's five-second default, which is what failed
 * there while passing everywhere else, back when the corpus was three times
 * this size. Bounded rather than removed, so a genuine hang still fails
 * instead of running forever.
 */
const CORPUS_MEASUREMENT_TIMEOUT_MILLISECONDS = 120_000;

/**
 * How many documents `DrawCommand` commits: 1,098 named patterns beside two
 * exhaustive halves — 8,551 enumerated `mosaic` tiles and 208 enumerated
 * one-column `negative` sources.
 *
 * The named half was 174 until issue #507. It sampled row counts up to 8
 * while the command line accepted 12, and the four row counts in between
 * were where `chain` and `snake` drew self-retracing ink that no test could
 * see. That half now runs to each family's own `FAMILY_MAXIMUM_ROWS`, the
 * same record the command line validates against, so the two cannot drift
 * apart again.
 *
 * It was 1,183 while `mosaic` still had three modifiers of its own. Every
 * mosaic there is is a member of the enumerated space, and 19 of those 24
 * named drawings were a tile that space already commits — so the family
 * draws no motif now and contributes nothing to this half. Its whole
 * contribution to the corpus is the 8,551.
 *
 * Nine of the ten families read the shared `MAXIMUM_VALUE` there. `mosaic`
 * is the tenth, at 6, which is why the exhaustive `mosaic` half is 8,551
 * rather than 3,179. The reason is a budget on an exhaustively enumerated
 * space rather than anything the geometry does —
 * `MOSAIC_TILE_MAXIMUM_ROWS` carries the count per row, and the whole
 * family stopping at the same number is what keeps this from being a
 * charter blind spot: a `mosaic` above 6 rows is refused rather than drawn
 * uncommitted.
 *
 * The `negative` half stops at the same 6, so it is 208 rather than 375.
 * Its deepest row count now inverts a seven-row source that is enumerated
 * but not committed, which is why the corridor-identity gate below covers
 * rows 3 through 5 of it rather than all of it.
 */
const COMMITTED_CORPUS_SIZE = 1098 + 8551 + 208;

/**
 * How many committed documents leave a gap at the band's termination — the
 * one place invariant 2's `channelWidthCompliant` does not look, and the
 * measurement its doc comment cites as the reason that carve-out is
 * load-bearing rather than a formality.
 *
 * Published in seven places and computed in none until this assertion, at a
 * value of 2,114 measured over the six original families' 3,293 documents.
 * It reached 2,120 when `cross` added six, 2,176 when the named half of the
 * sweep grew to `MAXIMUM_VALUE`, 273 when `mosaic` — which leaves such a gap
 * in every one of its documents, named and enumerated alike — was capped at
 * 6 rows, and 6,005 when that family's edge budget and the removal of its
 * degree ceiling widened its enumerated half from 290 tiles to 8,551.
 * Nothing would have caught any of those drifts:
 * `channelWidthCompliant` passes either way, because skipping those two
 * columns is exactly what it does. `negative`, `branch`, and `parallel` add
 * none at any row count — each covers its own first and last lattice column
 * — so this number moving by anything other than a change of row range is a
 * family changing how its band ends.
 */
const TERMINATION_GAP_DOCUMENTS = 6005;

/** Which of a measured document's two junction counts an invariant is about. */
type JunctionKind = "inkTJunctions" | "inkXJunctions";

/** Whether the charter declaration allows a family to break `invariant` at all, by any route. */
const declaresRelaxation = (
  family: string,
  invariant: CharterInvariant,
): boolean =>
  Object.entries(RELAXED_INVARIANTS).some(
    ([declared, relaxations]) =>
      declared === family &&
      relaxations.some((relaxation) => relaxation.invariant === invariant),
  );

/** Every family whose enumerated half the charter declaration allows to break `invariant`. */
const permutationRelaxations = (invariant: CharterInvariant): string[] =>
  Object.entries(RELAXED_INVARIANTS)
    .filter(([, relaxations]) =>
      relaxations.some(
        (relaxation) =>
          relaxation.invariant === invariant &&
          relaxation.permutations === true,
      ),
    )
    .map(([family]) => family)
    .toSorted();

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
 * A drawing's lattice as one comparable string, so two of them can be tested
 * for being the same ink under two names.
 *
 * It reads the lattice rather than the document because a family may
 * decompose one figure into different `M`/`V`/`H` runs — `parallel`'s three
 * shapes do exactly that at one strand — so equal bytes are sufficient for a
 * duplicate and nowhere near necessary. Both edge sets and the node set are
 * sorted, so the order the paths happened to be emitted in cannot make two
 * identical drawings look distinct.
 */
const latticeAddress = (graph: LatticeGraph): string =>
  JSON.stringify({
    columns: graph.columns,
    horizontalEdges: [...graph.horizontalEdges].toSorted(),
    nodes: [...graph.nodes].toSorted(),
    rows: graph.rows,
    verticalEdges: [...graph.verticalEdges].toSorted(),
  });

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
 * representative, and for some of these thirty the tile this family builds is
 * a re-phasing of that representative — the same wallpaper, started at a
 * different level. The corridor counts are a property of the class, so they
 * match anyway; the identifier is the class's, not the tile's.
 *
 * The sweep also draws `negative` from 6 rows up, past the deepest source
 * the `mosaic` half commits, so those drawings have no committed source to
 * compare against and are absent here. They are still gated by the sweep
 * above, which measures them like every other drawing.
 */
/**
 * The services the source paths below are derived from, constructed by hand
 * for the same reason {@link charterSweep} is: `it.each` needs its table at
 * collection time, before any `beforeAll` has run.
 *
 * Deriving the path rather than writing it out is what keeps this list
 * honest. Each entry has to name a file the `mosaic` half of the sweep really
 * wrote, and the sweep names a file by exactly these two calls — so a change
 * to how a tile is identified or named moves both together instead of
 * leaving thirty string literals behind.
 */
const mosaicTileService = new MosaicTileService();
const mosaicSymmetryService = new MosaicSymmetryService(mosaicTileService);
const mosaicNamingService = new MosaicNamingService(mosaicTileService);
const latticeIdentificationService = new LatticeIdentificationService(
  new MeanderLatticeService(),
  mosaicNamingService,
  mosaicSymmetryService,
  mosaicTileService,
);
const mosaicTilesService = new MosaicTilesService(
  mosaicSymmetryService,
  mosaicTileService,
);
const negativeSourceService = new NegativeSourceService(mosaicTileService);

const NEGATIVE_SOURCE_DOCUMENTS: readonly {
  readonly parameters: GenerationParameters;
  readonly sourceName: string;
}[] = (
  [
    {},
    { modifierName: "brick-staggered" },
    { modifierName: "brick-straight" },
    { modifierName: "brick-upright", repeatCount: 5 },
    { modifierName: "grid", repeatCount: 5 },
    { modifierName: "ruled" },
    { modifierName: "ruled-closed" },
    { modifierName: "ruled-raised" },
    { modifierName: "ruled-spaced" },
    { modifierName: "ruled-tall" },
  ] satisfies readonly {
    modifierName?: Modifier["name"];
    repeatCount?: number;
  }[]
).flatMap(({ modifierName, repeatCount }) =>
  [3, 4, 5].flatMap((rows) => {
    const modifier = modifierName ? { name: modifierName } : undefined;
    const tile = negativeSourceService.tile(
      negativeSourceService.source(modifier),
      rows,
    );

    // 🎯 A source the `mosaic` half never committed has nothing to compare
    // against. The edge budget admits one column at six rows and no more, so
    // the two-column sources stop a row shallower than the one-column ones
    // rather than being listed and then not found.
    if (!mosaicTilesService.isAdmitted(tile)) {
      return [];
    }

    const identifier = latticeIdentificationService.canonicalIdentifier(tile);
    const earned = mosaicNamingService.name(tile);
    const stem = earned ? `${identifier}-${earned}` : identifier;

    return [
      {
        parameters: {
          repeatCount: repeatCount ?? 6,
          rows,
          type: "negative" as const,
          ...(modifier ? { modifier } : {}),
        },
        sourceName: `mosaic/${tile.rows}-rows/${tile.columns}-columns/${stem}.svg`,
      },
    ];
  }),
);

/**
 * The family a committed document belongs to, read off the directory it is
 * filed under rather than off its filename: `DrawCommand` puts every
 * attribute but the variant and the repeat count into the path.
 */
const familyOf = (name: string): string => name.split("/")[0] ?? name;

/**
 * A committed document's path with the lattice address its filename now
 * carries taken back off, leaving the family, row count, variant and repeat
 * count a statement about topology is really about.
 *
 * An address is a statement about ink, and the address table is where every
 * one of them is pinned. Spelling `cross`'s seven addresses into an expected
 * list here would say the same thing a second time, in the one form nobody
 * can read — and would restate it on every drawing whose ink moved for a
 * reason this suite has no opinion about.
 */
const unaddressed = (name: string): string =>
  name.replace(FILENAME_ADDRESS_SUFFIX_PATTERN, "");

/**
 * Whether `parameters` name a drawing the charter declaration allows to
 * break `invariant`.
 *
 * A relaxation marked `permutations` is skipped: it is about the tiles a
 * family enumerates, which no set of named parameters reaches, so applying
 * it here would excuse a named drawing for something only an enumerated one
 * does. Those are asserted against committed output instead.
 *
 * A relaxation carrying a `condition` is resolved beside the modifier names,
 * through {@link CHARTER_CONDITIONS}, so all three ways of narrowing a
 * permission compose the same way and a family may use any of them.
 */
const relaxes = (
  parameters: GenerationParameters,
  invariant: CharterInvariant,
): boolean =>
  RELAXED_INVARIANTS[parameters.type].some(
    (relaxation) =>
      relaxation.invariant === invariant &&
      relaxation.permutations !== true &&
      (relaxation.condition === undefined ||
        CHARTER_CONDITIONS[relaxation.condition](parameters)) &&
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
        MosaicSubFamilyService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MotifRegistryService,
        MotifTransformsService,
        NegativeMotifService,
        NegativeSourceService,
        ParallelMotifService,
        ParallelSerpentineService,
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

    // The count also pins where the sweep stops, on every axis. 1,104 is
    // every combination up to each family's own `FAMILY_MAXIMUM_ROWS`; 174
    // was every combination up to 8, and the row counts issue #507 was
    // reachable at and untested at are most of the difference. Reverting
    // the sweep to a maximum of its own would fail here rather than quietly
    // narrow the gate.

    // The second expectation pins the other way `mosaic` could go wrong.
    // It is drawn from its enumerated space rather than from a motif — see
    // `TILE_DRAWN_TYPES` — so it belongs to this sweep not at all, and a
    // combination of it creeping back in would be a drawing this half
    // commits beside a tile the other half already does.

    // Most of the rest is `parallel`, which had one shape and a flat pair of
    // swept plies. Its ply range is now the row count's at each row count,
    // it is swept for all three of the family's shapes — `plied`,
    // `aligned`, and `serpentine` — and `serpentine` is swept over every
    // distinct rotation and flip of each ply. Those axes are gated here
    // exactly as the row axis is: a value the command line accepts and the
    // corpus does not commit is the same blind spot #507 was, one modifier
    // over.
    it("sweeps every named-type combination DrawCommand writes, out to the deepest row count the command line accepts", () => {
      expect(charterSweep).toHaveLength(1098);

      expect(
        Math.max(...charterSweep.map(({ parameters }) => parameters.rows)),
      ).toBe(12);
      expect(
        charterSweep.filter(({ parameters }) =>
          TILE_DRAWN_TYPES.includes(parameters.type),
        ),
      ).toStrictEqual([]);
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

    // 🎯 Issue #669's exclusion, asserted as a lattice property rather than
    // reflected as a count. `aligned-strands-1`, `plied-strands-1`, and
    // `serpentine`'s two one-strand variants used to render the same ink
    // under four names, once both borders were drawn full — three shapes
    // decompose it into different `M`/`V`/`H` runs, so comparing paths or
    // bytes would miss the duplication. Reducing every `parallel`
    // combination to its lattice and asserting none collide catches the
    // next degenerate combination whether or not anybody predicted it; the
    // count guards against the sweep quietly narrowing to nothing.
    it("draws no two parallel combinations onto the same lattice", () => {
      const parallelCases = charterSweep.filter(
        ({ parameters }) => parameters.type === "parallel",
      );
      const addresses = parallelCases.map(({ parameters }) =>
        latticeAddress(
          latticeService.build(generationService.generate(parameters)),
        ),
      );

      expect(parallelCases).toHaveLength(786);
      expect(new Set(addresses).size).toBe(addresses.length);
    });

    // 🎯 Issue #682's headline criterion, asserted the same way for the same
    // reason. Closing this family's second border took away the only thing
    // that had told three of its names apart — `plain`, `comb-upward`, and
    // `stagger-branches-3` drew one pattern under three at every row count,
    // separated by which border each left bare. Two of the three are gone,
    // and this is what says the third kind of collision is too. It is a gate
    // on the geometry rather than on those names: a change to `spineRow` or
    // to `unitColumns` that gave two modes one lattice again would fail here
    // rather than commit two names for one drawing. The count guards against
    // the sweep quietly narrowing to nothing.

    // Insetting the figure from its rules removed the collapse that deleted
    // those two names, so both would now be distinct drawings — an upward
    // comb puts its rail on the bottom row and its teeth one row clear of
    // the top, and a three-branch crenel is a rail nothing swallows.
    // Restoring either is a decision about which drawings the corpus
    // commits, and this gate neither asks for it nor stands in its way.
    it("draws no two branch combinations onto the same lattice", () => {
      const branchCases = charterSweep.filter(
        ({ parameters }) => parameters.type === "branch",
      );
      const addresses = branchCases.map(({ parameters }) =>
        latticeAddress(
          latticeService.build(generationService.generate(parameters)),
        ),
      );

      expect(branchCases).toHaveLength(60);
      expect(new Set(addresses).size).toBe(addresses.length);
    });

    // 🎯 This pins the corpus #340 measured and nothing beyond it. It scopes
    // itself by naming the six families that were surveyed, never by naming
    // the families that were not — see
    // `NEGATIVE_SPACE_SURVEYED_FAMILIES` for why the direction matters.
    //
    // None of them crosses in its negative space any more, and the two that
    // did were `mosaic with alternated period 3` and `mosaic with split` —
    // drawings this half no longer holds. The second of those still has its
    // measurement: it is the same shape the `diamond` sub-family draws, and
    // `mosaic-5-rows-12-repeats-diamond.svg` is measured off disk at the
    // foot of this suite, `negativeXJunctions: 9` and all. So this is an
    // empty allow-list rather than a lost one, and a family that started
    // crossing in its white space would still fail here.
    it("crosses in the negative space nowhere among the six families it measured", () => {
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
      ]).toStrictEqual([]);
    });

    // 🎯 The `negative` family's whole claim, in one assertion: its ink is
    // the white space of a document this repository already committed. The
    // two counts are read from two different files by two different routes —
    // one generated here, one measured off disk — so a change to either side
    // that stopped them being complements would fail.

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

    // 🎯 Which families draw a tree, and which draw loops, taken over the
    // corpus rather than over a family's own drawings. Reading from disk is
    // what makes both halves say anything — a family that started drawing
    // loops, or one that stopped, fails here rather than in its own test.

    // The two conditions are separated on purpose. Being a forest throughout
    // is what four of the ten families are — the four absent from the looped
    // set below; being one connected piece is what `negative` already is.

    // **The corpus holds no tree at all**, and it held two kinds until this
    // change. `branch` drew a spanning tree while one of its two border rows
    // was left unruled; `parallel`'s one-strand serpentine was a single
    // ribbon that ran the whole band without stopping, which is the
    // degenerate tree. Ruling both borders took each out of the tree set,
    // and neither has come back. No charter invariant is about a loop or
    // about connectivity, and both families still fill space, so this is
    // their shape as a graph changing rather than their compliance.

    // That an empty tree set can be reached two ways is why the conditions
    // are separated. `branch` leaves it by falling into pieces: its figure
    // is inset by a lattice row from every rule beside it, so each rule is a
    // piece of its own and the drawing is a forest of two or three, with
    // no loop in any of them.
    // `parallel`'s `plied` bundle leaves it the other way, joining into one
    // piece and closing a loop, and a deeper serpentine stays `strands`
    // pieces. The looped set below is what says which route each took.
    it(
      "draws a tree nowhere, having closed the two figures that were one",
      async () => {
        const documents = await readCommittedCorpus();
        const trees: string[] = [];
        const looped: string[] = [];
        const negativeCycles: number[] = [];
        const negativeComponents: number[] = [];
        const loneRibbons: string[] = [];

        for (const { document, name } of documents) {
          const connectivity = topologyService.connectivity(document);
          const { components, edges, nodes } = connectivity;

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

          if (path.basename(name).startsWith("serpentine-strands-1-")) {
            loneRibbons.push(
              `${components} component(s), ${edges - nodes + components} loop(s)`,
            );
          }
        }

        // 🎯 The measurement `README.md`, `AGENTS.md`, and
        // `BranchMotifService`'s own doc comment all cite as the reason
        // `branch` and `negative` are two families rather than one name for
        // one thing. Published in three places and computed in none until
        // this assertion: the cycle count is `edges - nodes + components`,
        // which this loop already had all three inputs for.
        expect(negativeCycles).toHaveLength(308);
        expect(Math.min(...negativeCycles)).toBe(0);
        expect(Math.max(...negativeCycles)).toBe(65);
        expect(Math.min(...negativeComponents)).toBe(1);
        expect(Math.max(...negativeComponents)).toBe(13);

        expect(trees).toStrictEqual([]);

        // 🎯 The 22 lone ribbons this suite used to follow out of the tree
        // set — the `serpentine-strands-1` pair, in phase and flipped, at
        // each of the eleven row counts — are gone rather than renamed:
        // issue #669 drops both one-strand `serpentine` variants from the
        // sweep, since a single ribbon spanning the whole band draws the
        // same ink `aligned-strands-1` already names. There is no lone
        // ribbon left to be a tree or a loop. The loop keeps watching for
        // one rather than being deleted with the drawings, so a strand
        // count that reintroduced one would be caught here again.
        expect(loneRibbons).toHaveLength(0);

        // 🎯 Where the loops are: 294 of `negative`'s 308 corridor networks,
        // 3,099 `mosaic` drawings, `cross`'s seven solid crossings, the
        // eighteen `snake` drawings whose `edge` pitch closes a loop against
        // the band border, and 642 of `parallel`'s 786. `branch` is absent,
        // having been in it for exactly one commit.

        // `parallel` is the newest arrival, and its 642 are exactly the
        // drawings a border rule added ink to — so the count is the same 642
        // the branching test below reports, from a different measurement.
        // The 144 it leaves out are the `serpentine` drawings whose first and
        // last strips are each one lattice row deep: those two flat ribbons
        // already were the two rules, so ruling them adds no step and closes
        // nothing. Issue #669 dropped the family's other 33 documents — the
        // one-strand `plied` and `serpentine` entries — before this count was
        // taken, so none of them are in either figure.

        // `branch` arrived the same way one commit earlier and left again
        // one commit later, when its figure was inset from its rules so that
        // no rule would land on the ink it closes the band around. `mosaic`
        // arrived earlier still, from removing the degree ceiling: a figure
        // of dash ends cannot close, and 3,099 of that family's 8,575
        // documents now do. No charter invariant is about a loop — the ink
        // stays orthogonal and every point stays inked — so each is a
        // family's shape as a graph changing rather than its compliance.

        // The fourteen `negative` documents missing from it are the `lines`
        // sub-family's negative — `ruled-closed` at each of the family's ten
        // row counts, and the same class enumerated at each of the four its
        // permutation half covers. They are why the cycle floor above is zero
        // and the component ceiling thirteen: that source's negative is the
        // band's own rules and nothing joining them, so it is one component
        // per lattice row with no loop anywhere, and the one corner of this
        // family that is a forest like the six oldest.
        expect(looped).toHaveLength(4060);
        expect(
          [...new Set(looped.map((name) => familyOf(name)))].toSorted(),
        ).toStrictEqual(["cross", "mosaic", "negative", "parallel", "snake"]);
      },
      CORPUS_MEASUREMENT_TIMEOUT_MILLISECONDS,
    );

    // 🎯 The two figures the charter's own "ink branches" bullet publishes,
    // read off the named patterns the charter counts them over. Prose and
    // measurement were authored at different moments and nothing else makes
    // them agree, so the count is taken here rather than restated there.

    // The junction total moved from 5,152 to 6,538 when `branch` gained a
    // rule along its second border, and to 24,572 when `parallel` gained
    // both of its own: those 819 documents carry 18,034 of these where they
    // carried none. The document count moved with it — 214 to 889 — where
    // `branch` moved the total alone, having already forked in all of its
    // 66. Both fell four times more: to 24,352 and 878 when the eleven
    // `comb` duplicates of `plain` were deleted; to 24,132 and 867 when the
    // eleven `stagger-branches-3` duplicates were; to 23,472 and 834 when
    // issue #669 dropped `parallel`'s 33 one-strand duplicates; and to
    // 22,158 and 828 when `branch`'s figure was inset from its rules.

    // That last fall took forks away rather than documents. A rule no longer
    // running along the row a rail sits on stops forking against every tooth
    // in it, which is most of what `branch` used to contribute. The six
    // drawings it also cost were the family's 2-row ones, which its new
    // structural minimum excludes — `stagger` has no room for a tooth in a
    // band that shallow once both of its rules are clear of the figure.

    // 144 `parallel` documents are still absent, and they are the same 144
    // the looped test above leaves out — the `serpentine` drawings whose two
    // border strips are flat. So this is not "the family branches now" but
    // the structural condition `RELAXED_INVARIANTS` declares, counted from
    // disk instead of from the sweep.
    it("branches in exactly the families the charter names, measured from disk", async () => {
      const corpus = await readCommittedCorpus();
      const documents = corpus.filter(
        ({ name }) => !COLUMN_SPAN_PATTERN.test(name),
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

      expect(documents).toHaveLength(1098);

      expect(tJunctions).toBe(22158);
      expect(branching).toHaveLength(828);
      expect(
        [...new Set(branching.map((name) => familyOf(name)))].toSorted(),
      ).toStrictEqual(["branch", "chain", "negative", "parallel", "snake"]);
      expect(
        branching.filter((name) => familyOf(name) === "parallel"),
      ).toHaveLength(642);
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

        // 🎯 Ink crosses in exactly three families across all 9,863 files, and
        // in neither of them by accident. Taken as three statements rather
        // than one list, so each says something a longer list would bury.
        const crossing = measured.filter(
          (topology) => topology.inkXJunctions > 0,
        );

        expect(
          [...new Set(crossing.map(({ name }) => familyOf(name)))].toSorted(),
        ).toStrictEqual(["cross", "mosaic", "negative"]);

        // 🎯 The other half of `RELAXED_INVARIANTS`, for the relaxations the
        // sweep above cannot see because no set of named parameters reaches
        // them. Asserted in both directions, exactly as the sweep asserts the
        // rest: a family declared to branch or cross in its enumerated half
        // has to actually do it somewhere in committed output, and a family
        // that declares nothing has to do it nowhere. So a declaration
        // cannot be added without the drawings, and the drawings cannot
        // appear without the declaration.
        const permutationFamilies = (junctions: JunctionKind): string[] =>
          [
            ...new Set(
              measured
                .filter(
                  (topology) =>
                    COLUMN_SPAN_PATTERN.test(topology.name) &&
                    topology[junctions] > 0,
                )
                .map(({ name }) => familyOf(name)),
            ),
          ].toSorted();

        for (const [invariant, junctions] of [
          ["no-branching", "inkTJunctions"],
          ["no-crossing", "inkXJunctions"],
        ] satisfies readonly [CharterInvariant, JunctionKind][]) {
          const observed = permutationFamilies(junctions);

          expect(observed).toStrictEqual(
            expect.arrayContaining(permutationRelaxations(invariant)),
          );
          expect(
            observed.filter((family) => !declaresRelaxation(family, invariant)),
          ).toStrictEqual([]);
        }

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
            .map(
              ({ inkXJunctions, name }) =>
                `${unaddressed(name)} ${inkXJunctions}`,
            ),
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
            familyOf(name) === "negative" && !COLUMN_SPAN_PATTERN.test(name),
        );

        expect(
          [
            ...new Set(
              namedCrossing.map(({ name }) =>
                unaddressed(name).split("/").at(-1),
              ),
            ),
          ].toSorted(),
        ).toStrictEqual([
          "brick-straight-6-repeats.svg",
          "brick-upright-6-repeats.svg",
          "grid-6-repeats.svg",
        ]);
        expect(namedCrossing).toHaveLength(30);

        // 🎯 And the permutation half's 136, which is a different kind of
        // statement: not a charter declaration but a measurement of the space
        // itself. 136 of its 208 one-column sources cross, 68 branch without
        // crossing, and 4 do neither — the `lines` class at each swept row
        // count. The named half draws six members of this space, and the
        // proportions here are why naming more of them would not have found
        // many more non-crossing ones to name.
        expect(
          crossing.filter(
            ({ name }) =>
              familyOf(name) === "negative" && COLUMN_SPAN_PATTERN.test(name),
          ),
        ).toHaveLength(136);
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
        name: "mosaic-5-rows-12-repeats-diamond.svg",
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
