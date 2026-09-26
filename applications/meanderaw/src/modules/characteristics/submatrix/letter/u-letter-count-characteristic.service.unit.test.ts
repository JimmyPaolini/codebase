import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { ULetterCountCharacteristicService } from "./u-letter-count-characteristic.service";

describe(ULetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: ULetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ULetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(ULetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated U glyph, open to the north", () => {
    expect(service.compute(contextService.create("03x02y440a90"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x02y461a90"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x02y610a10"))).toBe(0);
    expect(service.compute(contextService.create("03x02y250290"))).toBe(0);
    expect(service.compute(contextService.create("03x02y650880"))).toBe(0);
  });
});
