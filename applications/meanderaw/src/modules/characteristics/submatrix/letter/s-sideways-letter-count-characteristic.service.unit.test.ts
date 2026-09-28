import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { SSidewaysLetterCountCharacteristicService } from "./s-sideways-letter-count-characteristic.service";

describe(SSidewaysLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: SSidewaysLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        SSidewaysLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(SSidewaysLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated S glyph, bars vertical", () => {
    expect(service.compute(contextService.create("04x02y4650a980"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y4671a980"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y610a50290"))).toBe(0);
  });
});
