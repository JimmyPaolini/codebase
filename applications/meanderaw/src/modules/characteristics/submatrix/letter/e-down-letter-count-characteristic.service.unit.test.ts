import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { EDownLetterCountCharacteristicService } from "./e-down-letter-count-characteristic.service";

describe(EDownLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: EDownLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        EDownLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(EDownLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated E glyph, prongs pointing south", () => {
    expect(service.compute(contextService.create("04x02y67508880"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y67718880"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y610e10a10"))).toBe(0);
    expect(service.compute(contextService.create("03x03y2502d0290"))).toBe(0);
    expect(service.compute(contextService.create("04x02y4440ab90"))).toBe(0);
  });
});
