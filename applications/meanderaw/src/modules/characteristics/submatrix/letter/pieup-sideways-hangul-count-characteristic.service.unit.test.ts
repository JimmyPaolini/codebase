import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { PieupSidewaysHangulCountCharacteristicService } from "./pieup-sideways-hangul-count-characteristic.service";

describe(PieupSidewaysHangulCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: PieupSidewaysHangulCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        PieupSidewaysHangulCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      PieupSidewaysHangulCountCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated ㅍ glyph, turned on its side", () => {
    expect(service.compute(contextService.create("03x04y440ed0ed0880"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("03x04y461ed0ed0880"))).toBe(
      0,
    );
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("05x02y277102bb10"))).toBe(0);
  });
});
