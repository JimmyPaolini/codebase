import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { RhoEastLetterCountCharacteristicService } from "./rho-east-letter-count-characteristic.service";

describe(RhoEastLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: RhoEastLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        RhoEastLetterCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(RhoEastLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated Ρ glyph, turned a quarter anticlockwise so its stem faces east", () => {
    expect(service.compute(contextService.create("04x02y6500ab10"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x02y6500ab31"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y650e90800"))).toBe(0);
    expect(service.compute(contextService.create("04x02y27500a90"))).toBe(0);
    expect(service.compute(contextService.create("03x03y0406d0a90"))).toBe(0);
  });
});
