import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { HorizontalEdgeCountCharacteristicService } from "./horizontal-edge-count-characteristic.service";

describe(HorizontalEdgeCountCharacteristicService, () => {
  let contextService: CharacteristicContextService;
  let service: HorizontalEdgeCountCharacteristicService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        HorizontalEdgeCountCharacteristicService,
      ],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    service = await module.resolve(HorizontalEdgeCountCharacteristicService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("describes itself as the horizontalEdgeCount submatrix characteristic", () => {
    expect(service.metadata).toMatchObject({
      category: "submatrix",
      key: "horizontalEdgeCount",
      valueType: "number",
    });
  });

  it("counts points whose ink runs only east and west", () => {
    expect(service.compute(contextService.create("04x01y3303"))).toBe(3);
  });

  it("ignores forks and crosses that also run east and west", () => {
    expect(service.compute(contextService.create("04x01y3b7f"))).toBe(1);
  });

  it("ignores vertical points, corners, and bare points", () => {
    expect(service.compute(contextService.create("04x01yca60"))).toBe(0);
  });
});
