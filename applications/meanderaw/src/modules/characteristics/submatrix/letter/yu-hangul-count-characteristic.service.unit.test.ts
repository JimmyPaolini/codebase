import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { YuHangulCountCharacteristicService } from "./yu-hangul-count-characteristic.service";

describe(YuHangulCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: YuHangulCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        YuHangulCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(YuHangulCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated ㅠ glyph", () => {
    expect(service.compute(contextService.create("05x02y2771008800"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("05x02y2773108800"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("03x04y0402d02d0080"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("05x02y044002bb10"))).toBe(0);
    expect(service.compute(contextService.create("03x04y400e10e10800"))).toBe(
      0,
    );
  });
});
