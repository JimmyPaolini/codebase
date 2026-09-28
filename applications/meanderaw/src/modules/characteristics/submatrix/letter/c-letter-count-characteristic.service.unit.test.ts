import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { CLetterCountCharacteristicService } from "./c-letter-count-characteristic.service";

describe(CLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: CLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        CLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(CLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated C glyph, open to the east", () => {
    expect(service.compute(contextService.create("03x02y610a10"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x02y631a10"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x02y250290"))).toBe(0);
    expect(service.compute(contextService.create("03x02y440a90"))).toBe(0);
    expect(service.compute(contextService.create("03x02y650880"))).toBe(0);
  });
});
