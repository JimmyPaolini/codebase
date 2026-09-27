import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { YuKatakanaCountCharacteristicService } from "./yu-katakana-count-characteristic.service";

describe(YuKatakanaCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: YuKatakanaCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        YuKatakanaCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(YuKatakanaCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated ユ glyph", () => {
    expect(service.compute(contextService.create("04x02y25002b10"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y25002b31"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y440e90800"))).toBe(0);
    expect(service.compute(contextService.create("04x02y27100a10"))).toBe(0);
    expect(service.compute(contextService.create("03x03y0406d0880"))).toBe(0);
  });
});
