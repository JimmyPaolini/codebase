import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
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
 * One invariant a family is allowed to break. `modifierNames` narrows the
 * permission to the modifiers that actually break it; omitting it means the
 * family breaks the invariant however it is drawn.
 */
interface CharterRelaxation {
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
 */
const RELAXED_INVARIANTS: Record<MeanderType, readonly CharterRelaxation[]> = {
  boxes: [],
  chain: [{ invariant: "no-branching", modifierNames: ["edge", "edge-flip"] }],
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
 * How many documents `StartCommand` commits: 114 named patterns beside 3,179
 * enumerated `mosaic` tiles. It is #340's own corpus size, and the number its
 * space-filling measurement is quoted against.
 */
const COMMITTED_CORPUS_SIZE = 114 + 3179;

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
          relaxation.modifierNames.includes(parameters.modifier.name))),
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
      expect(charterSweep).toHaveLength(114);
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

    it("crosses in the negative space only where the spec reported it", () => {
      const crossing = charterSweep.filter(
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
      expect(
        measured
          .filter((topology) => topology.inkXJunctions > 0)
          .map(({ name }) => name),
      ).toStrictEqual([]);
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
