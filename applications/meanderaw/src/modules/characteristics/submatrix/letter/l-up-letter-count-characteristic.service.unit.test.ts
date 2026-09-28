import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { LUpLetterCountCharacteristicService } from "./l-up-letter-count-characteristic.service";

describe(LUpLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: LUpLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        LUpLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(LUpLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated L glyph, foot pointing north", () => {
    expect(service.compute(contextService.create("03x02y040290"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x02y061290"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x02y400a10"))).toBe(0);
    expect(service.compute(contextService.create("03x02y610800"))).toBe(0);
    expect(service.compute(contextService.create("03x02y250080"))).toBe(0);
  });
});
