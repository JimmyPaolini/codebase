import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DrawCombinationsService } from "../draw/draw-combinations.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { LatticeIdentificationModule } from "../lattice-identification/lattice-identification.module";
import { LatticeIdentificationService } from "../lattice-identification/lattice-identification.service";
import { TILE_DRAWN_TYPES } from "../meander-generation/meander-generation.constants";
import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifPitchService } from "../meander-generation/motif-pitch.service";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";

import { OutputPathService } from "./output-path.service";

import type {
  MeanderType,
  MotifDrawnType,
} from "../meander-generation/meander-generation.types";

// 🔧 Configuration

/**
 * Narrows a family to one that draws a motif, so `MotifPitchService` can be
 * asked for its pitch. `DrawCombinationsService.enumerate` already excludes
 * `mosaic` at runtime — see `TILE_DRAWN_TYPES` — this only tells the
 * compiler what is already true.
 */
const isMotifDrawnType = (type: MeanderType): type is MotifDrawnType =>
  !TILE_DRAWN_TYPES.includes(type);

/**
 * How long rendering the whole named-type sweep and addressing every
 * document is given. 1,104 combinations, each really generated and really
 * read back through `MeanderLatticeService` — real work, the same order of
 * magnitude the charter sweep and `DrawCommand`'s "real generation
 * integration" test already budget for.
 */
const FULL_SWEEP_TIMEOUT_MILLISECONDS = 120_000;

/** A `shape-only` filename's own suffix: the row-and-column shape, nothing else. */
const SHAPE_ONLY_SUFFIX_PATTERN = /-\d+r\d+c\.svg$/u;

/** A `full-address` filename's own suffix: the shape, then the hexadecimal identifier. */
const FULL_ADDRESS_SUFFIX_PATTERN = /-\d+r\d+c-[0-9a-f]+\.svg$/u;

/** One combination of the named-type sweep, addressed and built exactly as `DrawCommand` builds it. */
interface AddressedCombination {
  readonly fileName: string;
  readonly type: MeanderType;
}

// 🧪 Tests

describe(OutputPathService, () => {
  describe("addressed filenames across the whole named-type sweep", () => {
    let addressed: AddressedCombination[];

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [LatticeIdentificationModule, MeanderGenerationModule],
        providers: [
          DrawCombinationsService,
          GridGeometryService,
          ParallelSerpentineService,
        ],
      }).compile();

      const combinations = await module.resolve(DrawCombinationsService);
      const generation = await module.resolve(MeanderGenerationService);
      const identification = await module.resolve(LatticeIdentificationService);
      const pitches = await module.resolve(MotifPitchService);
      const outputPaths = await module.resolve(OutputPathService);

      addressed = combinations.enumerate().map((parameters) => {
        const { modifier, rows, type } = parameters;

        if (!isMotifDrawnType(type)) {
          throw new Error(
            `unexpected tile-drawn type in the named sweep: ${type}`,
          );
        }

        const options = { rows, type, ...(modifier ? { modifier } : {}) };
        const svg = generation.generate(parameters);
        const unit = {
          pitch: pitches.columnPitch(options),
          span: pitches.columnSpan(options),
        };
        const address = identification.identifyDocument(svg, unit);
        const filePath = outputPaths.build(parameters, address);

        return {
          fileName: filePath.slice(filePath.lastIndexOf("/") + 1),
          type,
        };
      });
    }, FULL_SWEEP_TIMEOUT_MILLISECONDS);

    // 🎯 This is the sweep the two prior pull requests moved: `branch` and
    // `parallel` drawing changes, and `spin`, `spin-flip`, `edge-flip`, and
    // `plied` widened to their true multi-pitch repeats. A family that
    // newly breaches 255 bytes here is exactly the case
    // `FILENAME_ADDRESS_CONVENTION` exists to catch loudly — see `chain`
    // and `snake`, moved to `shape-only` for precisely this reason.
    it(
      "keeps every addressed filename at or under 255 bytes, naming the offending family when one breaches",
      () => {
        const breaches = addressed
          .map(({ fileName, type }) => ({
            bytes: Buffer.byteLength(fileName, "utf8"),
            fileName,
            type,
          }))
          .filter(({ bytes }) => bytes > 255)
          .map(
            ({ bytes, fileName, type }) =>
              `${type}: ${fileName} (${bytes} bytes)`,
          );

        expect(breaches).toStrictEqual([]);
      },
      FULL_SWEEP_TIMEOUT_MILLISECONDS,
    );

    it("never mixes the two filename conventions within one family", () => {
      const conventionsByFamily = new Map<
        MeanderType,
        Set<"full-address" | "shape-only">
      >();

      for (const { fileName, type } of addressed) {
        const conventions =
          conventionsByFamily.get(type) ??
          new Set<"full-address" | "shape-only">();

        if (FULL_ADDRESS_SUFFIX_PATTERN.test(fileName)) {
          conventions.add("full-address");
        } else if (SHAPE_ONLY_SUFFIX_PATTERN.test(fileName)) {
          conventions.add("shape-only");
        }

        conventionsByFamily.set(type, conventions);
      }

      const mixed = [...conventionsByFamily.entries()].filter(
        ([, conventions]) => conventions.size > 1,
      );

      expect(mixed).toStrictEqual([]);
    });
  });
});
