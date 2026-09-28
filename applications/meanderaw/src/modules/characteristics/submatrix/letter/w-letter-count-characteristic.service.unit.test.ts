import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { WLetterCountCharacteristicService } from "./w-letter-count-characteristic.service";

describe(WLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: WLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        WLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(WLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated W glyph, legs pointing north", () => {
    expect(service.compute(contextService.create("04x03y4040c4c0ab90"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x03y4061c4c0ab90"))).toBe(
      0,
    );
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x03y6750c8c08080"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y6310e100a310"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y235002d02390"))).toBe(
      0,
    );
  });
});
