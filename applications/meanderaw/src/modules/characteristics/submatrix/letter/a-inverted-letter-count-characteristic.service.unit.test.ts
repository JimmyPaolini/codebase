import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { AInvertedLetterCountCharacteristicService } from "./a-inverted-letter-count-characteristic.service";

describe(AInvertedLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: AInvertedLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        AInvertedLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(AInvertedLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated A glyph, legs pointing north", () => {
    expect(service.compute(contextService.create("03x03y440ed0a90"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x03y461ed0a90"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y650ed0880"))).toBe(0);
    expect(service.compute(contextService.create("04x02y6710ab10"))).toBe(0);
    expect(service.compute(contextService.create("04x02y27502b90"))).toBe(0);
  });
});
