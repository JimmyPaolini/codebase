import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { KieukInvertedHangulCountCharacteristicService } from "./kieuk-inverted-hangul-count-characteristic.service";

describe(KieukInvertedHangulCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: KieukInvertedHangulCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        KieukInvertedHangulCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      KieukInvertedHangulCountCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated ㅋ glyph, turned upside down", () => {
    expect(service.compute(contextService.create("03x03y400e10a10"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x03y400e31a10"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x03y2502d0080"))).toBe(0);
    expect(service.compute(contextService.create("04x02y04402b90"))).toBe(0);
    expect(service.compute(contextService.create("04x02y67108800"))).toBe(0);
  });
});
