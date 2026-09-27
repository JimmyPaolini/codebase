import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";

import { CHARACTERISTIC_KEYS } from "./characteristic-registry.constants";
import { CharacteristicRegistryService } from "./characteristic-registry.service";
import { CharacteristicsModule } from "./characteristics.module";
import { CharacteristicsService } from "./characteristics.service";

import type { CodeObject } from "../code/code.types";
import type {
  CharacteristicRecord,
  Characteristics,
} from "./characteristics.types";

/**
 * Enumerated Codes from the committed database, first, middle, and last of
 * each family, plus the smallest filed Code of each strand family the
 * enumeration never reaches. Several are reducible (`02x02y4488` is
 * `01x02y48` twice), so the record's unit reading is exercised too.
 */
const FIXTURE_CODES = [
  "02x03y56cca9",
  "03x03y4658cc3bb",
  "03x03y777c8cb1a",
  "01x02y48",
  "02x02y4488",
  "05x02y4444488888",
  "01x02y4b",
  "03x02y6548a9",
  "05x02y6754488ab9",
  "01x06y0004f8",
  "01x08y07fb7fb3",
  "01x08y7fff87fb",
  "01x02y00",
  "02x02y0000",
  "02x03y44ad1a",
  "03x03y2754c89a3",
  "03x03y752ca1a31",
  "01x02y33",
  "02x02y3333",
  "01x02y7b",
  "02x02y77bb",
  "02x02y1221",
  "02x04y44a944a9",
  "04x02y444488a9",
  "01x03y04b",
  "01x08y07c87830",
  "05x02y67710abb31",
  "02x03y44ed88",
  "03x03y2752d81a3",
  "03x03y7528e12b1",
  "01x02y03",
  "02x04y255e8821",
  "05x02y67565a9ab9",
  "02x03y255aa1",
  "03x03y23535a1a3",
  "05x02y233353331a",
  "06x02y2525251a1a1a",
  "04x04y2335635cc29ca339",
  "04x03y35634884a339",
  "04x03y6354c48c8a39",
  "04x03y356369a5a339",
  "05x03y65635c8c4ca39a9",
  "04x03y6354c69c8a39",
] as const;

/** The legacy fields a record replaces, projected onto the record's keys under the T3 renames and T4 ports. */
function legacyProjection(legacy: Characteristics): Record<string, unknown> {
  return {
    bettiNumber0Count: legacy.components,
    bettiNumber1Count: legacy.cycles,
    cornerCount: legacy.cornerCount,
    crossCount: legacy.inkXJunctions,
    density: legacy.density,
    dotCount: legacy.dotCount,
    edgeCount: legacy.edgeCount,
    embeddedUCount: legacy.embeddedUCount,
    endsAreLatticeNeighbors: legacy.endsAreLatticeNeighbors,
    endsOnBorderRules: legacy.endsOnBorderRules,
    forkCount: legacy.inkTJunctions,
    freeEndCount: legacy.freeEnds,
    horizontalEdgeCount: legacy.horizontalPointCount,
    inkPointCount: legacy.inkPointCount,
    isArcade: legacy.isArcade,
    isBars: legacy.isBars,
    isClosedLoop: legacy.isClosedLoop,
    isComb: legacy.isComb,
    isDots: legacy.isDots,
    isFork: legacy.isFork,
    isLines: legacy.isLines,
    isMesh: legacy.isMesh,
    isPureTree: legacy.isPureTree,
    isSingleArc: legacy.isSingleArc,
    isStippled: legacy.isStippled,
    longestHorizontalRunLength: legacy.longestHorizontalRun,
    longestVerticalRunLength: legacy.longestVerticalRun,
    reversesAtItsTightestTurn: legacy.reversesAtItsTightestTurn,
    tileCrossing: legacy.crossesTheSeam,
    tileCrossingComponentDeltaCount: legacy.seamComponents,
    tileCrossingCycleCount: legacy.seamCycles,
    verticalEdgeCount: legacy.verticalPointCount,
  };
}

/** The same fields read off a record, with `tileCrossingCount` read as the legacy boolean it replaces. */
function recordProjection(
  record: CharacteristicRecord,
  legacy: Record<string, unknown>,
): Record<string, unknown> {
  const values: Readonly<Record<string, unknown>> = record;
  const entries = Object.keys(legacy).map((key): [string, unknown] => [
    key,
    key === "tileCrossing" ? record.tileCrossingCount > 0 : values[key],
  ]);

  return Object.fromEntries(entries);
}

/** The Code drawn `times` over side by side: each row repeated, columns multiplied. */
function tiled(code: CodeObject, times: number): CodeObject {
  const rows = Array.from({ length: code.rows }, (_unused, row) =>
    code.digits
      .slice(row * code.columns, (row + 1) * code.columns)
      .repeat(times),
  );

  return { ...code, columns: code.columns * times, digits: rows.join("") };
}

describe(CharacteristicRegistryService, () => {
  let codeService: CodeService;
  let legacyService: CharacteristicsService;
  let service: CharacteristicRegistryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule],
    }).compile();

    codeService = module.get(CodeService);
    legacyService = module.get(CharacteristicsService);
    service = module.get(CharacteristicRegistryService);
  });

  it("discovers exactly one evaluator per key in the key list, in its order", () => {
    expect(service.metadata().map((metadata) => metadata.key)).toStrictEqual([
      ...CHARACTERISTIC_KEYS,
    ]);
  });

  it("gives every record exactly the key list's fields", () => {
    const record = service.record("02x03y56cca9");

    expect(Object.keys(record).toSorted()).toStrictEqual(
      [...CHARACTERISTIC_KEYS].toSorted(),
    );
  });

  describe.each(FIXTURE_CODES)("%s", (code) => {
    it("records every surviving legacy field under its new key", () => {
      const legacy = legacyProjection(
        legacyService.compute(codeService.parse(code)),
      );

      expect(recordProjection(service.record(code), legacy)).toStrictEqual(
        legacy,
      );
    });

    it("reads a parsed Code the same as its formatted string", () => {
      expect(service.record(codeService.parse(code))).toStrictEqual(
        service.record(code),
      );
    });

    it.each([1, 2, 3])(
      "scores the tile-crossing component delta as the legacy seamComponents does, tiled %i times",
      (times) => {
        const filed = tiled(codeService.parse(code), times);

        expect(service.tileCrossingComponentDeltaCount(filed)).toBe(
          legacyService.seamComponents(filed),
        );
      },
    );

    it.each([1, 2, 3])(
      "calls the Code reducible as the legacy measure does, tiled %i times",
      (times) => {
        const filed = tiled(codeService.parse(code), times);

        expect(service.isReducible(filed)).toBe(
          legacyService.measure(filed).isReducible,
        );
      },
    );
  });
});
