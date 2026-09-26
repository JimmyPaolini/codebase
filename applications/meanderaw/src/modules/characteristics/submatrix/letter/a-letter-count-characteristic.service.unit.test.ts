import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { ALetterCountCharacteristicService } from "./a-letter-count-characteristic.service";

describe(ALetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: ALetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ALetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(ALetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated A glyph, legs pointing south", () => {
    expect(service.compute(contextService.create("03x03y650ed0880"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x03y671ed0880"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y440ed0a90"))).toBe(0);
    expect(service.compute(contextService.create("04x02y6710ab10"))).toBe(0);
    expect(service.compute(contextService.create("04x02y27502b90"))).toBe(0);
  });
});
