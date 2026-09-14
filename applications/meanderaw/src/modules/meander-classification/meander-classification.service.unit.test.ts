import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MeanderCharacteristicsService } from "../meander-characteristics/meander-characteristics.service";
import { MeanderConnectivityService } from "../meander-characteristics/meander-connectivity.service";
import { MeanderDecodingService } from "../meander-decoding/meander-decoding.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";

import { MeanderClassificationService } from "./meander-classification.service";

import type { MeanderType } from "../meander-generation/meander-generation.types";
import type { MeanderStructure } from "./meander-classification.types";

// 🔧 Configuration

/**
 * One case: the Code a tile is spelled by, the shape it is read at, and the
 * families its structure earns.
 *
 * Every Code below is a real reading of a committed drawing rather than a
 * grid invented to satisfy a predicate — taken from
 * `output/<family>/<rows>-rows/`, either off the filename's own lattice
 * address or by reading the document back through
 * `LatticeIdentificationService.readTile`. That is what makes these
 * assertions evidence about the corpus rather than a restatement of the
 * rules they test.
 */
interface ClassificationCase {
  readonly code: string;
  readonly columns: number;
  readonly families: readonly MeanderType[];
  readonly rows: number;
  readonly source: string;
}

// 🧪 Tests

describe(MeanderClassificationService, () => {
  let characteristicsService: MeanderCharacteristicsService;
  let decodingService: MeanderDecodingService;
  let service: MeanderClassificationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeanderCharacteristicsService,
        MeanderClassificationService,
        MeanderConnectivityService,
        MeanderDecodingService,
        MeanderLatticeService,
        MeanderTopologyService,
        MosaicNamingService,
        MosaicTileService,
      ],
    }).compile();

    characteristicsService = await module.resolve(
      MeanderCharacteristicsService,
    );
    decodingService = await module.resolve(MeanderDecodingService);
    service = await module.resolve(MeanderClassificationService);
  });

  /** The structure one case's Code describes, measured the way the sweep measures it. */
  const structure = (
    subject: Pick<ClassificationCase, "code" | "columns" | "rows">,
  ): MeanderStructure => {
    const shape = { columns: subject.columns, rows: subject.rows };
    const grid = decodingService.decode(
      subject.code,
      subject.rows,
      subject.columns,
    );

    return {
      ...shape,
      characteristics: characteristicsService.compute(grid),
      subFamily: service.subFamily(grid, shape),
    };
  };

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("matching", () => {
    const cases: readonly ClassificationCase[] = [
      {
        code: "56ccffcca9",
        columns: 2,
        families: ["cross"],
        rows: 6,
        source:
          "cross/6-rows/plain — two ink crossings, no fork, the only family that crosses",
      },
      {
        code: "373f3b",
        columns: 2,
        families: ["negative"],
        rows: 4,
        source:
          "negative/4-rows/brick-straight — the one mode that crosses as well as forks",
      },
      {
        code: "61e1a1",
        columns: 2,
        families: ["branch"],
        rows: 4,
        source:
          "branch/4-rows/rung-northeast — a stile and rungs, forking and closing nothing",
      },
      {
        code: "635c699a3",
        columns: 3,
        families: ["snake"],
        rows: 4,
        source: "snake/4-rows/plain — one closed loop through every point",
      },
      {
        code: "2529",
        columns: 2,
        families: ["boxes"],
        rows: 3,
        source:
          "boxes/3-rows/plain — the one row count at which `chain` does not draw, so the arc is `boxes` alone",
      },
      {
        code: "23561ca39",
        columns: 3,
        families: ["boxes", "chain"],
        rows: 4,
        source:
          "boxes/4-rows/plain — a spiral no count here tells from chain/4-rows/plain's split zigzag",
      },
      {
        code: "635c489a3",
        columns: 3,
        families: ["boxes", "chain"],
        rows: 4,
        source:
          "chain/4-rows/plain — the same arc at the same width, earning both names",
      },
      {
        code: "65635c8c4ca39a9",
        columns: 5,
        families: ["swirl"],
        rows: 4,
        source: "swirl/4-rows/plain — an arc over a repeat 2 × rows - 3 wide",
      },
      {
        code: "6354c69c8a39",
        columns: 4,
        families: ["whirl"],
        rows: 4,
        source: "whirl/4-rows/plain — an arc over a repeat rows wide",
      },
      {
        code: "44448a98",
        columns: 4,
        families: ["parallel"],
        rows: 3,
        source:
          "parallel/3-rows/aligned-strands-2 — two strands measuring three pieces with six ends",
      },
      {
        code: "4488",
        columns: 2,
        families: ["parallel", "mosaic"],
        rows: 3,
        source:
          "branch/3-rows/plain, which is bar for bar parallel/3-rows/aligned-strands-1",
      },
      {
        code: "56a9",
        columns: 2,
        families: ["mosaic"],
        rows: 3,
        source:
          "negative/3-rows/plain — the `zigzag` tile, a closed loop one row below where `snake` draws",
      },
      {
        code: "33",
        columns: 1,
        families: ["mosaic"],
        rows: 3,
        source:
          "negative/3-rows/ruled-closed — the `lines` region of the space",
      },
      {
        code: "2569a1",
        columns: 2,
        families: [],
        rows: 4,
        source:
          "a plain arc over a repeat no family's pitch rule names, in no named region either",
      },
    ];

    it.each(cases)(
      "reads $source as $families",
      ({ code, columns, families, rows }) => {
        expect(
          service.matching(structure({ code, columns, rows })),
        ).toStrictEqual(families);
      },
    );
  });

  describe("classify", () => {
    it("records the first family a tile's structure earns, beside the sub-family its structure earns independently", () => {
      const grid = decodingService.decode("4488", 3, 2);

      expect(
        service.classify(grid, characteristicsService.compute(grid), {
          columns: 2,
          rows: 3,
        }),
      ).toStrictEqual({ family: "parallel", subFamily: "bars" });
    });

    it("leaves family and sub-family undefined for a tile whose structure earns neither", () => {
      const grid = decodingService.decode("2569a1", 4, 2);

      expect(
        service.classify(grid, characteristicsService.compute(grid), {
          columns: 2,
          rows: 4,
        }),
      ).toStrictEqual({ family: undefined, subFamily: undefined });
    });

    it("records a sub-family a tile earns outside `mosaic`, beside the family rather than in place of it", () => {
      const grid = decodingService.decode("56a9", 3, 2);

      expect(
        service.classify(grid, characteristicsService.compute(grid), {
          columns: 2,
          rows: 3,
        }),
      ).toStrictEqual({ family: "mosaic", subFamily: "zigzag" });
    });
  });
});
