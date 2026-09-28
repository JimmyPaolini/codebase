import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { LLetterCountCharacteristicService } from "./l-letter-count-characteristic.service";

describe(LLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: LLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        LLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(LLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated L glyph, foot pointing east", () => {
    expect(service.compute(contextService.create("03x02y400a10"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x02y400a31"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x02y610800"))).toBe(0);
    expect(service.compute(contextService.create("03x02y250080"))).toBe(0);
    expect(service.compute(contextService.create("03x02y040290"))).toBe(0);
  });
});
