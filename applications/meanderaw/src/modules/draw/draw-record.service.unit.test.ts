import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GraphService } from "../graph/graph.service";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderCharacteristicsService } from "../meander-characteristics/meander-characteristics.service";
import { MeanderConnectivityService } from "../meander-characteristics/meander-connectivity.service";
import { MeanderClassificationService } from "../meander-classification/meander-classification.service";
import { MeanderDecodingService } from "../meander-decoding/meander-decoding.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MeanderRenderingService } from "../meander-rendering/meander-rendering.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { DrawRecordService } from "./draw-record.service";

// 🧪 Tests

/**
 * Drives the record builder through the real pipeline rather than through
 * mocks of it, because a row is the whole of what this produces and a
 * mocked collaborator would only assert that this service forwards calls.
 */
describe(DrawRecordService, () => {
  let service: DrawRecordService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawRecordService,
        GridGeometryService,
        MeanderCharacteristicsService,
        MeanderClassificationService,
        MeanderConnectivityService,
        MeanderDecodingService,
        MeanderLatticeService,
        MeanderRenderingService,
        GraphService,
        MosaicNamingService,
        MosaicTileService,
        SvgRenderingService,
      ],
    }).compile();

    service = await module.resolve(DrawRecordService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("record", () => {
    it("derives every field of a row from the Code alone, the family and sub-family among them", () => {
      const record = service.record(
        "4488",
        { columns: 2, rows: 3 },
        "enumerated",
      );

      expect({ ...record, svg: record.svg.slice(0, 4) }).toStrictEqual({
        code: "4488",
        columns: 2,
        components: 2,
        cycles: 0,
        family: "parallel",
        freeEnds: 4,
        hasBranching: false,
        hasCrossing: false,
        inkTJunctions: 0,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: 2,
        provenance: "enumerated",
        rows: 3,
        subFamily: "bars",
        svg: "<svg",
      });
    });

    it("records a null family and a null sub-family where a Code's structure earns neither", () => {
      const record = service.record(
        "2569a1",
        { columns: 2, rows: 4 },
        "hardcoded",
      );

      expect(record).toMatchObject({ family: null, subFamily: null });
    });

    it("records the provenance it was given rather than deriving one, since where a Code came from is no property of the Code", () => {
      expect(
        service.record("00", { columns: 1, rows: 3 }, "hardcoded").provenance,
      ).toBe("hardcoded");
    });

    it("refuses a Code whose length disagrees with the shape it was named at", () => {
      expect(() =>
        service.record("00", { columns: 2, rows: 3 }, "enumerated"),
      ).toThrow(/need 4/u);
    });
  });
});
