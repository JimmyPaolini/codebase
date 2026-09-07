import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "../boxes-motif/boxes-motif.service";
import { BranchMotifService } from "../branch-motif/branch-motif.service";
import { ChainMotifService } from "../chain-motif/chain-motif.service";
import { CrossMotifService } from "../cross-motif/cross-motif.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MosaicTileMotifService } from "../mosaic-tile/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { NegativeMotifService } from "../negative-motif/negative-motif.service";
import { NegativeSourceService } from "../negative-motif/negative-source.service";
import { ParallelMotifService } from "../parallel-motif/parallel-motif.service";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";
import { SwirlMotifService } from "../swirl-motif/swirl-motif.service";
import { WhirlMotifService } from "../whirl-motif/whirl-motif.service";

import {
  SUPPORTED_TYPES,
  TILE_DRAWN_TYPES,
} from "./meander-generation.constants";
import { MotifRegistryService } from "./motif-registry.service";

import type { MotifDrawnType } from "./meander-generation.types";

// 🔧 Configuration

/**
 * Which motif service each family is expected to resolve to.
 *
 * `Record<MotifDrawnType, MotifService>` inside the registry already makes a
 * missing family a type error. What it cannot catch is the same service
 * pasted under two keys, which would silently draw one family's geometry
 * for another family's name — so this table names the class expected for
 * each, and the first test below checks the table itself covers exactly the
 * motif-drawn families the command line accepts.
 */

const EXPECTED_MOTIF_SERVICES = [
  { expected: BoxesMotifService, type: "boxes" },
  { expected: BranchMotifService, type: "branch" },
  { expected: ChainMotifService, type: "chain" },
  { expected: CrossMotifService, type: "cross" },
  { expected: NegativeMotifService, type: "negative" },
  { expected: ParallelMotifService, type: "parallel" },
  { expected: SnakeMotifService, type: "snake" },
  { expected: SwirlMotifService, type: "swirl" },
  { expected: WhirlMotifService, type: "whirl" },
] as const satisfies readonly { expected: unknown; type: MotifDrawnType }[];

// 🧪 Tests

describe(MotifRegistryService, () => {
  let service: MotifRegistryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BoxesMotifService,
        BranchMotifService,
        ChainMotifService,
        CrossMotifService,
        GridGeometryService,
        MosaicTileMotifService,
        MosaicTileService,
        MotifRegistryService,
        MotifTransformsService,
        NegativeMotifService,
        NegativeSourceService,
        ParallelMotifService,
        ParallelSerpentineService,
        ParallelSerpentineService,
        SnakeMotifService,
        SnakeSequenceService,
        SwirlMotifService,
        WhirlMotifService,
      ],
    }).compile();

    service = await module.resolve(MotifRegistryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolve", () => {
    it("covers exactly the motif-drawn families the command line accepts", () => {
      expect(
        EXPECTED_MOTIF_SERVICES.map(({ type }) => type).toSorted(),
      ).toStrictEqual(
        SUPPORTED_TYPES.filter(
          (type) => !TILE_DRAWN_TYPES.includes(type),
        ).toSorted(),
      );
    });

    it("holds no entry for a tile-drawn family, which has no motif to resolve", () => {
      const covered = new Set<string>(
        EXPECTED_MOTIF_SERVICES.map(({ type }) => type),
      );

      expect(
        TILE_DRAWN_TYPES.filter((type) => covered.has(type)),
      ).toStrictEqual([]);
    });

    it("hands back a distinct motif service for every family", () => {
      const resolved = EXPECTED_MOTIF_SERVICES.map(({ type }) =>
        service.resolve(type),
      );

      expect(new Set(resolved).size).toBe(EXPECTED_MOTIF_SERVICES.length);
    });

    it.each(EXPECTED_MOTIF_SERVICES)(
      "resolves $type to its own motif service",
      ({ expected, type }) => {
        expect(service.resolve(type)).toBeInstanceOf(expected);
      },
    );
  });
});
