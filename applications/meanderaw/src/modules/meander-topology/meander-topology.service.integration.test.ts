// cspell:ignore dvvxxd dvvxxvdx dvvxxvvxxd dvvxxvvxxvdx dvvxxvvxxvvxxd
// cspell:ignore hxxhhx hxxhhxxh hxxhhxxhhx hxxhhxxhhxxh hxxhhxxhhxxhhx
// cspell:ignore dld dldl dldld dldldl dldldld
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
import {
  PERMUTATIONS_SUBDIRECTORY,
  ROWS_SWEEP_MAXIMUM,
} from "../draw/draw.constants";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MAXIMUM_VALUE } from "../meander-generation/meander-generation.constants";
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
 * `negative` relaxes no-branching in every one of its modes, which is why
 * its entry names no modifier at all: it inks the corridors a `mosaic` tile
 * leaves, a cell where three corridors meet becomes a lattice point where
 * three arms of ink meet, and all three of its sources were chosen off the
 * survey's _branches only_ shortlist precisely because they branch. Nothing
 * else is declared for it — its sources have zero negative X-junctions at
 * every swept row count, so its ink has zero too, and every lattice point of
 * its canvas carries ink, so space-filling holds.
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
  negative: [{ invariant: "no-branching" }],
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

  if (modifier.name === "dot") {
    return `dot ${modifier.shape}`;
  }

  if (modifier.name === "plied") {
    return `plied ${modifier.strands}`;
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
 * It runs to `MAXIMUM_VALUE` rather than to the `ROWS_SWEEP_MAXIMUM` the
 * corpus is written at, which is the one place the two callers of that
 * enumeration deliberately differ. The charter is a claim about what the
 * command line will draw, not about what happens to be committed, and until
 * #507 the two were quietly taken to be the same thing. The wider sweep
 * costs no committed bytes at all: nothing below reads a swept document off
 * disk.
 */
const charterSweep: readonly CharterCase[] = new DrawCombinationsService()
  .enumerate(MAXIMUM_VALUE)
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
 * How many documents `DrawCommand` commits: 174 named patterns beside 3,179
 * enumerated `mosaic` tiles. #340 measured this corpus at 114 named patterns;
 * the `cross` family added the six the sweep draws for it — three row counts
 * from its structural minimum of 6 through the sweep maximum, solid and
 * `interrupted` — the `negative` family the eighteen it draws for its own,
 * six row counts from its structural minimum of 3 crossed with its two
 * modifiers plus none, the `branch` family twenty-one, seven row counts
 * from its structural minimum of 2 crossed with its two modifiers plus none,
 * and the `parallel` family fifteen, five row counts from its structural
 * minimum of 4 crossed with the two plies `PLIED_SWEEP_STRAND_COUNTS` names
 * plus its unmodified default.
 */
/**
 * How long a corpus-wide measurement may take. Each of the three tests that
 * use it reads all 3,353 committed documents from disk and measures every
 * one, which takes roughly two seconds locally but several times that on a
 * shared CI runner — past vitest's five-second default, which is what failed
 * there while passing everywhere else. Bounded rather than removed, so a
 * genuine hang still fails instead of running forever.
 */
const CORPUS_MEASUREMENT_TIMEOUT_MILLISECONDS = 60_000;

const COMMITTED_CORPUS_SIZE = 174 + 3179;

/**
 * How many committed documents leave a gap at the band's termination — the
 * one place invariant 2's `channelWidthCompliant` does not look, and the
 * measurement its doc comment cites as the reason that carve-out is
 * load-bearing rather than a formality.
 *
 * Published in seven places and computed in none until this assertion, at a
 * value of 2,114 measured over the six original families' 3,293 documents.
 * `cross` has since added six, and nothing would have caught the drift:
 * `channelWidthCompliant` passes either way, because skipping those two
 * columns is exactly what it does. `negative`, `branch`, and `parallel` add
 * none — each covers its own first and last lattice column — so this number
 * moving is a family changing how its band ends.
 */
const TERMINATION_GAP_DOCUMENTS = 2120;

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
 * Every `negative` drawing the sweep commits, beside the committed `mosaic`
 * permutation whose white space it inks.
 *
 * This is what makes "the candidates drawn come from the survey's shortlist"
 * — #415's second acceptance criterion — a fact rather than a comment. The
 * right-hand column names files that were on disk before this family
 * existed, measured by the survey and committed by the permutation sweep, and
 * the assertion below reads both and compares them. The `rows` on the left is
 * one lower than the `rows` in the filename on the right, which is the whole
 * of `NEGATIVE_SOURCE_ROW_OFFSET`.
 *
 * The sweep also draws `negative` at 8 rows, one row past the survey's own
 * range, so those three drawings have no committed source to compare against
 * and are absent here. They are still gated by the sweep above, which
 * measures them like every other drawing.
 */
const NEGATIVE_SOURCE_DOCUMENTS: readonly {
  readonly parameters: GenerationParameters;
  readonly sourceName: string;
}[] = [
  ["dvvxxd", "dvvxxvdx", "dvvxxvvxxd", "dvvxxvvxxvdx", "dvvxxvvxxvvxxd"].map(
    (identifier, index) => ({
      parameters: {
        repeatCount: 6,
        rows: index + 3,
        type: "negative" as const,
      },
      sourceName: `mosaic/${index + 4}-rows/permutations/2-columns/${identifier}.svg`,
    }),
  ),
  ["hxxhhx", "hxxhhxxh", "hxxhhxxhhx", "hxxhhxxhhxxh", "hxxhhxxhhxxhhx"].map(
    (identifier, index) => ({
      parameters: {
        modifier: { name: "brick" as const },
        repeatCount: 6,
        rows: index + 3,
        type: "negative" as const,
      },
      sourceName: `mosaic/${index + 4}-rows/permutations/2-columns/${identifier}-dashes.svg`,
    }),
  ),
  ["dld", "dldl", "dldld", "dldldl", "dldldld"].map((identifier, index) => ({
    parameters: {
      modifier: { name: "ruled" as const },
      repeatCount: 6,
      rows: index + 3,
      type: "negative" as const,
    },
    sourceName: `mosaic/${index + 4}-rows/permutations/1-columns/${identifier}.svg`,
  })),
].flat();

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
    // Both halves of the relationship are pinned, because the sweep is
    // deliberately wider than the corpus and each half can break on its own.
    // Restricted to the row counts `DrawCommand` commits, it must be exactly
    // the enumeration `DrawCommand` writes — that is "the charter gates the
    // corpus this repository commits". Unrestricted, it must reach every row
    // count the command line accepts, which is the gap #507 lived in.
    it("sweeps every named-type combination DrawCommand writes, and every deeper row count the command line accepts", () => {
      const committed = new DrawCombinationsService().enumerate();

      expect(committed).toHaveLength(174);
      expect(charterSweep).toHaveLength(302);
      expect(
        charterSweep
          .filter(({ parameters }) => parameters.rows <= ROWS_SWEEP_MAXIMUM)
          .map(({ parameters }) => parameters),
      ).toStrictEqual(committed);
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
    // that stopped them being complements would fail. The `toBeGreaterThan`
    // is the guard against the assertion passing vacuously on a source with
    // nothing in its negative to ink.
    it.each(NEGATIVE_SOURCE_DOCUMENTS)(
      "inks exactly the corridors $sourceName leaves",
      async ({ parameters, sourceName }) => {
        const source = topologyService.measure(
          await readFile(path.join(OUTPUT_DIRECTORY, sourceName), "utf8"),
        );
        const negative = topologyService.measure(
          generationService.generate(parameters),
        );

        expect(source.negativeTJunctions).toBeGreaterThan(0);
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
    // than over a family's own drawings: its twenty-one documents are trees
    // and every other one of the 3,353 is not. Reading from disk is what
    // makes the second half say anything — a family that started drawing
    // loops, or one that stopped, fails here rather than in its own test.
    //
    // The two conditions are separated on purpose. Being a forest is what
    // every family but three already is; being one connected piece is what
    // `negative` already is. Only `branch` is both, and 3,317 documents
    // predate it without a single one managing it.
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
        expect(negativeCycles).toHaveLength(18);
        expect(Math.min(...negativeCycles)).toBe(10);
        expect(Math.max(...negativeCycles)).toBe(45);
        expect(Math.min(...negativeComponents)).toBe(1);
        expect(Math.max(...negativeComponents)).toBe(5);

        expect(trees).toHaveLength(21);
        expect(
          [...new Set(trees.map((name) => familyOf(name)))].toSorted(),
        ).toStrictEqual(["branch"]);

        // 🎯 The loops are all somewhere else: `negative`'s eighteen corridor
        // networks, `cross`'s three solid crossings, and the ten `snake`
        // drawings whose `edge` pitch closes a loop against the band border.
        // `branch` appears nowhere in this list, which is the half of the
        // claim a tree test alone would not make.
        expect(looped).toHaveLength(31);
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

      expect(documents).toHaveLength(174);
      expect(tJunctions).toBe(1360);
      expect(branching).toHaveLength(59);
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

        // 🎯 Ink crosses in exactly the three documents that were committed to
        // make it cross, and nowhere else in 3,353 files. The `interrupted`
        // renderings of the same three row counts are absent on purpose: the
        // break takes the junction out of the ink graph.
        expect(
          measured
            .filter((topology) => topology.inkXJunctions > 0)
            .map(({ inkXJunctions, name }) => `${name} ${inkXJunctions}`),
        ).toStrictEqual([
          "cross/6-rows/plain-6-repeats.svg 12",
          "cross/7-rows/plain-6-repeats.svg 12",
          "cross/8-rows/plain-6-repeats.svg 12",
        ]);
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
