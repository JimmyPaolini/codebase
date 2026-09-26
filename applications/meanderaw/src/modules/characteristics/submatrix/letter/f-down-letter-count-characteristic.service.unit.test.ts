import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { FDownLetterCountCharacteristicService } from "./f-down-letter-count-characteristic.service";

describe(FDownLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: FDownLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        FDownLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(FDownLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated F glyph, prongs pointing south", () => {
    expect(service.compute(contextService.create("04x02y27500880"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y27710880"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y610e10800"))).toBe(0);
    expect(service.compute(contextService.create("03x03y0402d0290"))).toBe(0);
    expect(service.compute(contextService.create("04x02y4400ab10"))).toBe(0);
  });
});
