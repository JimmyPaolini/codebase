import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { TuInvertedHanziCountCharacteristicService } from "./tu-inverted-hanzi-count-characteristic.service";

describe(TuInvertedHanziCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: TuInvertedHanziCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        TuInvertedHanziCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(TuInvertedHanziCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated 凸 glyph, turned upside down", () => {
    expect(
      service.compute(contextService.create("05x03y63350a56900a900")),
    ).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(
      service.compute(contextService.create("05x03y63371a56900a900")),
    ).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(
      service.compute(contextService.create("05x03y0650069a50a3390")),
    ).toBe(0);
    expect(
      service.compute(contextService.create("04x04y6500ca50c690a900")),
    ).toBe(0);
    expect(
      service.compute(contextService.create("04x04y065069c0a5c00a90")),
    ).toBe(0);
  });
});
