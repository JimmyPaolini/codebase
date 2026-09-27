import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { TuSoilHanziCountCharacteristicService } from "./tu-soil-hanzi-count-characteristic.service";

describe(TuSoilHanziCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: TuSoilHanziCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        TuSoilHanziCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(TuSoilHanziCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated 土 glyph", () => {
    expect(service.compute(contextService.create("04x03y04002f102b10"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x03y04002f312b10"))).toBe(
      0,
    );
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x03y4400ef108800"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y27102f100800"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y04402fd00880"))).toBe(
      0,
    );
  });
});
