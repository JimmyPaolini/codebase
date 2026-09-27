import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { YouHanziCountCharacteristicService } from "./you-hanzi-count-characteristic.service";

describe(YouHanziCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: YouHanziCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        YouHanziCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(YouHanziCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated 由 glyph", () => {
    expect(
      service.compute(contextService.create("04x04y04006f50efd0ab90")),
    ).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(
      service.compute(contextService.create("04x04y04006f71efd0ab90")),
    ).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(
      service.compute(contextService.create("05x03y67500eff10ab900")),
    ).toBe(0);
    expect(
      service.compute(contextService.create("04x04y6750efd0af900800")),
    ).toBe(0);
    expect(
      service.compute(contextService.create("05x03y067502ffd00ab90")),
    ).toBe(0);
  });
});
