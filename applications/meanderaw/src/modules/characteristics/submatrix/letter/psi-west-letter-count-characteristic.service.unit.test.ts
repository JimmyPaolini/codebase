import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";
import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { PsiWestLetterCountCharacteristicService } from "./psi-west-letter-count-characteristic.service";

describe(PsiWestLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: PsiWestLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        PsiWestLetterCountCharacteristicService,
        SubmatrixUtilitiesService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(PsiWestLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated Ψ glyph, turned a quarter clockwise so its stem faces west", () => {
    expect(service.compute(contextService.create("04x03y06102f100a10"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x03y06312f100a10"))).toBe(
      0,
    );
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x03y4440af900800"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y04006f508880"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y25002f102900"))).toBe(
      0,
    );
  });
});
