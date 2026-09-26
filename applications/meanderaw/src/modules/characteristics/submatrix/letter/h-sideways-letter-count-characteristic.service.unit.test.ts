import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { HSidewaysLetterCountCharacteristicService } from "./h-sideways-letter-count-characteristic.service";

describe(HSidewaysLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: HSidewaysLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        HSidewaysLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(HSidewaysLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated H glyph, posts horizontal", () => {
    expect(service.compute(contextService.create("04x02y27102b10"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y27312b10"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y440ed0880"))).toBe(0);
  });
});
