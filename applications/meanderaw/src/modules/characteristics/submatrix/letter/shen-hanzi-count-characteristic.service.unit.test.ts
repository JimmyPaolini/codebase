import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { ShenHanziCountCharacteristicService } from "./shen-hanzi-count-characteristic.service";

describe(ShenHanziCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: ShenHanziCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ShenHanziCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(ShenHanziCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated 申 glyph", () => {
    expect(
      service.compute(contextService.create("04x05y04006f50efd0af900800")),
    ).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(
      service.compute(contextService.create("04x05y04006f71efd0af900800")),
    ).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(
      service.compute(contextService.create("06x03y0675002fff100ab900")),
    ).toBe(0);
  });
});
