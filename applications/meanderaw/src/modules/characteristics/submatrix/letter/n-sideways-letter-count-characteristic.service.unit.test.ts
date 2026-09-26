import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { NSidewaysLetterCountCharacteristicService } from "./n-sideways-letter-count-characteristic.service";

describe(NSidewaysLetterCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: NSidewaysLetterCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        NSidewaysLetterCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(NSidewaysLetterCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts an isolated N glyph, posts horizontal", () => {
    expect(service.compute(contextService.create("04x03y23506390a310"))).toBe(
      1,
    );
  });

  it("ignores the glyph when more ink joins it", () => {
    expect(service.compute(contextService.create("04x03y23716390a310"))).toBe(
      0,
    );
  });

  it("counts nothing for the glyph's other orientations", () => {
    expect(service.compute(contextService.create("04x03y6540ccc08a90"))).toBe(
      0,
    );
  });
});
