import { readFile } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import {
  COMPATIBLE_MODIFIERS,
  DEFAULT_REPEAT_COUNT,
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  STRUCTURAL_MINIMUM_ROWS,
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MosaicMotifService } from "../mosaic-motif/mosaic-motif.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import {
  ALTERNATED_SWEEP_PERIODS,
  DOT_SWEEP_SHAPES,
  ROWS_SWEEP_MAXIMUM,
} from "../start/start.constants";
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
 * family widens the unit pitch until the zigzag closes flush against the
 * band's own top and bottom border; the border then runs past the point it
 * lands on, either side, which is three arms of ink meeting — ten of them
 * per document, at every row count, in the committed reference assets as
 * much as in a fresh run. #340's measurement table and the README's charter
 * both report zero T-junctions in ink across every family, and neither is
 * yet aware of these.
 */
const RELAXED_INVARIANTS: Record<MeanderType, readonly CharterRelaxation[]> = {
  boxes: [],
  chain: [{ invariant: "no-branching", modifierNames: ["edge", "edge-flip"] }],
  mosaic: [],
  snake: [{ invariant: "no-branching", modifierNames: ["edge", "edge-flip"] }],
  swirl: [],
  whirl: [],
};

/** Narrows a declared compatible-modifier name to an implemented {@link Modifier} name without an unchecked assertion. */
const isModifierName = (value: string): value is Modifier["name"] =>
  SUPPORTED_MODIFIER_NAMES.includes(value);

/** Narrows a supported type name to a {@link MeanderType} without an unchecked assertion. */
const isMeanderType = (value: string): value is MeanderType =>
  SUPPORTED_TYPES.includes(value);

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

/** Every {@link Modifier} value the sweep covers for one modifier name — the representative values `start` sweeps, not the full range. */
const modifierValues = (name: Modifier["name"]): Modifier[] => {
  if (name === "alternated") {
    return ALTERNATED_SWEEP_PERIODS.map((period) => ({ name, period }));
  }

  if (name === "dot") {
    return DOT_SWEEP_SHAPES.map((shape) => ({ name, shape }));
  }

  return [{ name }];
};

/**
 * The swept space: every family, crossed with every modifier
 * `COMPATIBLE_MODIFIERS` allows it plus no modifier at all, crossed with
 * every row count from that family's own structural minimum through
 * `ROWS_SWEEP_MAXIMUM`.
 *
 * That is deliberately the same space `StartCommand` writes to `output/` —
 * 114 documents — so the figures this test gates are the figures the
 * committed corpus reports, and a widened sweep widens the charter's
 * coverage with it. It stops short of `mosaic`'s 3,179 enumerated tiles for
 * one reason: those are reachable only through a motif service, and the
 * charter is tested through `MeanderGenerationService.generate`, the single
 * seam every family, modifier, and validation rule already passes through.
 */
const charterSweep: readonly CharterCase[] = SUPPORTED_TYPES.filter(
  (value): value is MeanderType => isMeanderType(value),
).flatMap((type) => {
  const modifiers: readonly (Modifier | undefined)[] = [
    undefined,
    ...COMPATIBLE_MODIFIERS[type]
      .filter((value): value is Modifier["name"] => isModifierName(value))
      .flatMap((name) => modifierValues(name)),
  ];
  const minimum = STRUCTURAL_MINIMUM_ROWS[type];
  const rowCounts = Array.from(
    { length: ROWS_SWEEP_MAXIMUM - minimum + 1 },
    (_value, index) => minimum + index,
  );

  return rowCounts.flatMap((rows) =>
    modifiers.map((modifier) => ({
      label: `${type} at ${rows} rows${modifier ? ` with ${modifierLabel(modifier)}` : ""}`,
      parameters: {
        repeatCount:
          modifier && SPIN_FAMILY_MODIFIER_NAMES.includes(modifier.name)
            ? Math.ceil(DEFAULT_REPEAT_COUNT / SPIN_CYCLE_LENGTH) *
              SPIN_CYCLE_LENGTH
            : DEFAULT_REPEAT_COUNT,
        rows,
        type,
        ...(modifier ? { modifier } : {}),
      },
      variant: `${type}${modifier ? ` with ${modifierLabel(modifier)}` : ""}`,
    })),
  );
});

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
