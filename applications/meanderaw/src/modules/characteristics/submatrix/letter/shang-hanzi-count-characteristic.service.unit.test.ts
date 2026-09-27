import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { ShangHanziCountCharacteristicService } from "./shang-hanzi-count-characteristic.service";

describe(ShangHanziCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: ShangHanziCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        ShangHanziCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(ShangHanziCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated 上 glyph", () => {
    expect(service.compute(contextService.create("04x03y04000e102b10"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x03y04000e312b10"))).toBe(
      0,
    );
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x03y4000e7108800"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y27102d000800"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y04402bd00080"))).toBe(
      0,
    );
  });
});
