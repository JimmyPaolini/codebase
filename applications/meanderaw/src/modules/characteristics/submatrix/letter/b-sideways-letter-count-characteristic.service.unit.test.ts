import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { BSidewaysLetterCountCharacteristicService } from "./b-sideways-letter-count-characteristic.service";

describe(BSidewaysLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: BSidewaysLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        BSidewaysLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(BSidewaysLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated B glyph, squares side by side", () => {
    expect(service.compute(contextService.create("04x02y6750ab90"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y6771ab90"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y650ed0a90"))).toBe(0);
  });
});
