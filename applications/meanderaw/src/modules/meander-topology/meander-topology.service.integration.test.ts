import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { StartCombinationsService } from "../start/start-combinations.service";
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
 * Only the ink is declared here. Invariants 3 and 4 constrain positive space
 * — a family's negative may branch and cross freely, and no family is failed
 * for it.
 */
const RELAXED_INVARIANTS: Record<MeanderType, readonly CharterRelaxation[]> = {
  boxes: [],
  chain: [{ invariant: "no-branching", modifierNames: ["edge", "edge-flip"] }],
  cross: [{ exceptModifierNames: ["interrupted"], invariant: "no-crossing" }],
  mosaic: [],
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

  return modifier.name;
};

/**
 * The swept space, read from the same {@link StartCombinationsService} that
 * `StartCommand` writes `output/` from. Sweeping the shared enumeration
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
 */
const charterSweep: readonly CharterCase[] = new StartCombinationsService()
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
 * How many documents `StartCommand` commits: 120 named patterns beside 3,179
 * enumerated `mosaic` tiles. #340 measured this corpus at 114 named patterns;
 * the `cross` family added the six the sweep draws for it — three row counts
 * from its structural minimum of 6 through the sweep maximum, solid and
 * `interrupted`.
 */
const COMMITTED_CORPUS_SIZE = 120 + 3179;

/** Where `StartCommand` writes those documents, and where they are committed. */
const OUTPUT_DIRECTORY = path.join(import.meta.dirname, "../../../output");

/**
 * Every committed document, read off disk.
 *
 * Read one at a time rather than through `Promise.all`: three thousand
 * concurrent opens is enough to exhaust the descriptor limit on a developer
 * machine, and the whole read costs a fraction of a second sequentially.
 */
const readCommittedCorpus = async (): Promise<
  { document: string; name: string }[]
> => {
  const documents: { document: string; name: string }[] = [];

  for (const directory of [
    OUTPUT_DIRECTORY,
    path.join(OUTPUT_DIRECTORY, "permutations"),
  ]) {
    const names = await readdir(directory);

    for (const name of names.filter((entry) => entry.endsWith(".svg"))) {
      documents.push({
        document: await readFile(path.join(directory, name), "utf8"),
        name,
      });
    }
  }

  return documents;
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
  let topologyService: MeanderTopologyService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BoxesMotifService,
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
        MotifTransformsService,
        SnakeMotifService,
        SnakeSequenceService,
        SvgRenderingService,
        SwirlMotifService,
        WhirlMotifService,
      ],
    }).compile();

    generationService = await module.resolve(MeanderGenerationService);
    topologyService = await module.resolve(MeanderTopologyService);
  });

  describe("the meander charter", () => {
    // 🎯 The sweep is built by mapping a service's output. If that
    // enumeration ever shrinks — a renamed constant, a widened union, a type
    // guard that stops matching — every `it.each` below would quietly cover
    // less, or nothing at all, without a single failure. This is the guard
    // against a property test that vacates instead of failing.
    it("sweeps every named-type combination StartCommand writes", () => {
      expect(charterSweep).toHaveLength(120);
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

    it("holds across every committed document, measured from disk", async () => {
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
      // make it cross, and nowhere else in 3,299 files. The `interrupted`
      // renderings of the same three row counts are absent on purpose: the
      // break takes the junction out of the ink graph.
      expect(
        measured
          .filter((topology) => topology.inkXJunctions > 0)
          .map(({ inkXJunctions, name }) => `${name} ${inkXJunctions}`),
      ).toStrictEqual([
        "cross-6-rows-6-repeats.svg 12",
        "cross-7-rows-6-repeats.svg 12",
        "cross-8-rows-6-repeats.svg 12",
      ]);
    });

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
