import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { TavEastLetterCountCharacteristicService } from "./tav-east-letter-count-characteristic.service";

describe(TavEastLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: TavEastLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        TavEastLetterCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(TavEastLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated ת glyph, turned a quarter clockwise so its top faces east", () => {
    expect(service.compute(contextService.create("03x03y400a50290"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x03y400a71290"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x02y06502980"))).toBe(0);
    expect(service.compute(contextService.create("04x02y4610a900"))).toBe(0);
    expect(service.compute(contextService.create("03x03y610a50080"))).toBe(0);
  });
});
