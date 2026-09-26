import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { MWestLetterCountCharacteristicService } from "./m-west-letter-count-characteristic.service";

describe(MWestLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: MWestLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        MWestLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(MWestLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated M glyph, legs pointing west", () => {
    expect(service.compute(contextService.create("04x03y235002d02390"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x03y237102d02390"))).toBe(
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
    expect(service.compute(contextService.create("04x03y4040c4c0ab90"))).toBe(
      0,
    );
  });
});
