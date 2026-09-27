import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { DaletInvertedLetterCountCharacteristicService } from "./dalet-inverted-letter-count-characteristic.service";

describe(DaletInvertedLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: DaletInvertedLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        DaletInvertedLetterCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(
      DaletInvertedLetterCountCharacteristicService,
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated ד glyph, turned upside down", () => {
    expect(service.compute(contextService.create("05x02y040002b310"))).toBe(1);
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("05x02y040002b331"))).toBe(0);
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("05x02y2371000800"))).toBe(0);
    expect(service.compute(contextService.create("03x04y0400c02d0080"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("03x04y400e10c00800"))).toBe(
      0,
    );
  });
});
