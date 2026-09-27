import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { JingHanziCountCharacteristicService } from "./jing-hanzi-count-characteristic.service";

describe(JingHanziCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: JingHanziCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        JingHanziCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(JingHanziCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated 井 glyph", () => {
    expect(
      service.compute(contextService.create("05x04y044002ff102ff1008800")),
    ).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(
      service.compute(contextService.create("05x04y044002ff312ff1008800")),
    ).toBe(0);
  });
});
