import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { OLetterCountCharacteristicService } from "./o-letter-count-characteristic.service";

describe(OLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: OLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        OLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(OLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated O glyph", () => {
    expect(service.compute(contextService.create("03x02y650a90"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x02y671a90"))).toBe(0);
  });
});
