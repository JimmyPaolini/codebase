import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { PhiLetterCountCharacteristicService } from "./phi-letter-count-characteristic.service";

describe(PhiLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: PhiLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        PhiLetterCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(PhiLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated Φ glyph", () => {
    expect(
      service.compute(contextService.create("04x04y04006f50af900800")),
    ).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(
      service.compute(contextService.create("04x04y04006f71af900800")),
    ).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(
      service.compute(contextService.create("05x03y065002ff100a900")),
    ).toBe(0);
  });
});
