import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { AoEastHanziCountCharacteristicService } from "./ao-east-hanzi-count-characteristic.service";

describe(AoEastHanziCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: AoEastHanziCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        AoEastHanziCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(AoEastHanziCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated 凹 glyph, turned a quarter anticlockwise so its base faces east", () => {
    expect(
      service.compute(contextService.create("04x04y6350a5c069c0a390")),
    ).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(
      service.compute(contextService.create("04x04y6371a5c069c0a390")),
    ).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(
      service.compute(contextService.create("05x03y65650ca9c0a3390")),
    ).toBe(0);
    expect(
      service.compute(contextService.create("04x04y6350c690ca50a390")),
    ).toBe(0);
    expect(
      service.compute(contextService.create("05x03y63350c65c0a9a90")),
    ).toBe(0);
  });
});
