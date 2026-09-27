import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { RhoWestLetterCountCharacteristicService } from "./rho-west-letter-count-characteristic.service";

describe(RhoWestLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: RhoWestLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        RhoWestLetterCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(RhoWestLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated Ρ glyph, turned a quarter clockwise so its stem faces west", () => {
    expect(service.compute(contextService.create("04x02y27500a90"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y27710a90"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y650e90800"))).toBe(0);
    expect(service.compute(contextService.create("03x03y0406d0a90"))).toBe(0);
    expect(service.compute(contextService.create("04x02y6500ab10"))).toBe(0);
  });
});
