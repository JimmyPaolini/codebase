import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { XLetterCountCharacteristicService } from "./x-letter-count-characteristic.service";

describe(XLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: XLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        XLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(XLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated X glyph", () => {
    expect(service.compute(contextService.create("04x03y04002f100800"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x03y04002f310800"))).toBe(
      0,
    );
  });
});
