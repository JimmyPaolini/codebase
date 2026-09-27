import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { YuEastKatakanaCountCharacteristicService } from "./yu-east-katakana-count-characteristic.service";

describe(YuEastKatakanaCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: YuEastKatakanaCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        YuEastKatakanaCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(YuEastKatakanaCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated ユ glyph, turned a quarter clockwise so its top faces east", () => {
    expect(service.compute(contextService.create("03x03y440e90800"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x03y461e90800"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x02y25002b10"))).toBe(0);
    expect(service.compute(contextService.create("04x02y27100a10"))).toBe(0);
    expect(service.compute(contextService.create("03x03y0406d0880"))).toBe(0);
  });
});
