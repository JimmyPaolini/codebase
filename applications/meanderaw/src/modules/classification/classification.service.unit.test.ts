import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ConnectivityService } from "../characteristics/connectivity.service";
import { CodeService } from "../code/code.service";
import { GraphService } from "../graph/graph.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { ClassificationService } from "./classification.service";
import { SubFamilyService } from "./sub-family.service";

import type { MeanderStructure, MeanderType } from "./classification.types";

// 🔧 Configuration

/**
 * One case: the Code a tile is spelled by, the shape it is read at, and the
 * families its structure earns.
 *
 * Every Code below is a real reading of a committed drawing rather than a
 * Code invented to satisfy a predicate — taken from the historical
 * drawings, read back onto the lattice once and committed as
 * `HISTORICAL_CORPUS`. That is what makes these assertions evidence about
 * the corpus rather than a restatement of the rules they test.
 */
interface ClassificationCase {
  readonly code: string;
  readonly columns: number;
  readonly families: readonly MeanderType[];
  readonly rows: number;
  readonly source: string;
}

// 🧪 Tests

describe(ClassificationService, () => {
  let characteristicsService: CharacteristicsService;
  let codeService: CodeService;
  let service: ClassificationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CharacteristicsService,
        ClassificationService,
        ConnectivityService,
        CodeService,
        SymmetryService,
        GraphService,
        SubFamilyService,
        TileService,
      ],
    }).compile();

    characteristicsService = await module.resolve(CharacteristicsService);
    codeService = await module.resolve(CodeService);
    service = await module.resolve(ClassificationService);
  });

  /** The structure one case's Code describes, measured the way the sweep measures it. */
  const structure = (
    subject: Pick<ClassificationCase, "code" | "columns" | "rows">,
  ): MeanderStructure => {
    const shape = { columns: subject.columns, rows: subject.rows };
    const parsed = codeService.parse(
      subject.code,
      subject.rows,
      subject.columns,
    );

    return {
      ...shape,
      characteristics: characteristicsService.compute(parsed),
      subFamily: service.subFamily(parsed),
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
      const grid = codeService.parse("4488", 3, 2);

      expect(
        service.classify(grid, characteristicsService.compute(grid), {
          columns: 2,
          rows: 3,
        }),
      ).toStrictEqual({ family: "parallel", subFamily: "bars" });
    });

    it("leaves family and sub-family undefined for a tile whose structure earns neither", () => {
      const grid = codeService.parse("2569a1", 4, 2);

      expect(
        service.classify(grid, characteristicsService.compute(grid), {
          columns: 2,
          rows: 4,
        }),
      ).toStrictEqual({ family: undefined, subFamily: undefined });
    });

    it("records a sub-family a tile earns outside `mosaic`, beside the family rather than in place of it", () => {
      const grid = codeService.parse("56a9", 3, 2);

      expect(
        service.classify(grid, characteristicsService.compute(grid), {
          columns: 2,
          rows: 3,
        }),
      ).toStrictEqual({ family: "mosaic", subFamily: "zigzag" });
    });
  });
});
