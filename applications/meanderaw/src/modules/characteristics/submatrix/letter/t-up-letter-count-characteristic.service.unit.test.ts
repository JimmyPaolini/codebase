import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { TUpLetterCountCharacteristicService } from "./t-up-letter-count-characteristic.service";

describe(TUpLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: TUpLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        TUpLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(TUpLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated T glyph, stem pointing north", () => {
    expect(service.compute(contextService.create("04x02y04002b10"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y04002b31"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x02y27100800"))).toBe(0);
    expect(service.compute(contextService.create("03x03y400e10800"))).toBe(0);
    expect(service.compute(contextService.create("03x03y0402d0080"))).toBe(0);
  });
});
