import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LatticeIdentificationService } from "../lattice-identification/lattice-identification.service";
import { MeanderGenerationService } from "../meander-generation/meander-generation.service";
import { MotifPitchService } from "../meander-generation/motif-pitch.service";
import { OutputPathService } from "../svg-rendering/output-path.service";

import { DrawRenderingService } from "./draw-rendering.service";
import { NarrowRepeatCountError } from "./draw.constants";

import type { LatticeAddress } from "../lattice-identification/lattice-identification.types";

// 🔧 Configuration

/** The address identification is stood in with; the fixture document below is nothing a real reader could address. */
const ADDRESS: LatticeAddress = {
  address: "5r4c-4c8c",
  canonicalIdentifier: "4c8c",
  identifier: "4c8c",
  rows: 5,
  span: 4,
};

/** The document generation is stood in with, so what is asserted is the path rather than the ink. */
const DOCUMENT = "<svg>fixture</svg>\n";

// 🧪 Tests

describe(DrawRenderingService, () => {
  let service: DrawRenderingService;
  let identification: LatticeIdentificationService;
  let pitches: MotifPitchService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawRenderingService,
        OutputPathService,
        {
          provide: LatticeIdentificationService,
          useValue: createMock<LatticeIdentificationService>(),
        },
        {
          provide: MeanderGenerationService,
          useValue: createMock<MeanderGenerationService>(),
        },
        {
          provide: MotifPitchService,
          useValue: createMock<MotifPitchService>(),
        },
      ],
    }).compile();

    service = await module.resolve(DrawRenderingService);
    identification = await module.resolve(LatticeIdentificationService);
    pitches = await module.resolve(MotifPitchService);

    const generation = await module.resolve(MeanderGenerationService);

    vi.mocked(generation.generate).mockReturnValue(DOCUMENT);
  });

  beforeEach(() => {
    vi.mocked(identification.identifyDocument).mockReturnValue(ADDRESS);
    vi.mocked(pitches.columnPitch).mockReturnValue(4);
    vi.mocked(pitches.columnSpan).mockReturnValue(4);
    vi.mocked(pitches.columnCount).mockReturnValue(24);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("names the file after the drawing's own address", () => {
    expect(
      service.render({ repeatCount: 6, rows: 5, type: "chain" }),
    ).toStrictEqual({
      directory: "chain/5-rows",
      fileName: "plain-6-repeats-5r4c.svg",
      svg: DOCUMENT,
    });
  });

  // 🎯 A span of four pitches needs six of them clear of both band
  // terminations, and a twelve-column drawing holds three.
  it("refuses a drawing too narrow to address, naming the repeat count that would work", () => {
    vi.mocked(pitches.columnSpan).mockReturnValue(16);
    vi.mocked(pitches.columnCount).mockReturnValue(12);

    expect(() =>
      service.render({ repeatCount: 3, rows: 5, type: "boxes" }),
    ).toThrow(NarrowRepeatCountError);
    expect(identification.identifyDocument).not.toHaveBeenCalled();
  });

  it("rounds the repeat count it names up to the spin family's own cycle", () => {
    vi.mocked(pitches.columnSpan).mockReturnValue(16);
    vi.mocked(pitches.columnCount).mockReturnValue(12);

    expect(() =>
      service.render({
        modifier: { name: "spin" },
        repeatCount: 3,
        rows: 5,
        type: "boxes",
      }),
    ).toThrow(
      "draws a boxes spin too narrow to carry a lattice address; draw at least 8 repeats",
    );
  });

  // 🎯 `mosaic` draws no motif to probe a pitch from, and files its drawings
  // under an address of its own already — see `FILENAME_ADDRESS_CONVENTION`.
  it("asks for neither a pitch nor an address for a tile-drawn family", () => {
    expect(
      service.render({
        repeatCount: 6,
        rows: 6,
        subFamily: "dots",
        type: "mosaic",
      }),
    ).toStrictEqual({
      directory: "mosaic/6-rows",
      fileName: "dots-6-repeats.svg",
      svg: DOCUMENT,
    });
    expect(pitches.columnPitch).not.toHaveBeenCalled();
    expect(identification.identifyDocument).not.toHaveBeenCalled();
  });
});
