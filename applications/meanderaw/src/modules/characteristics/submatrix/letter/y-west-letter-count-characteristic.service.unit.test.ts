import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { YWestLetterCountCharacteristicService } from "./y-west-letter-count-characteristic.service";

describe(YWestLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: YWestLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        YWestLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(YWestLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated Y glyph, stem pointing west", () => {
    expect(service.compute(contextService.create("04x03y06102d000a10"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x03y06312d000a10"))).toBe(
      0,
    );
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x03y4040a7900800"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y04006b508080"))).toBe(
      0,
    );
    expect(service.compute(contextService.create("04x03y25000e102900"))).toBe(
      0,
    );
  });
});
