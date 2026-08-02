import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { {{namePascalCase}}Service } from "./{{nameKebabCase}}.service";

describe({{namePascalCase}}Service, () => {
  let service: {{namePascalCase}}Service;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [{{namePascalCase}}Service],
    }).compile();

    service = await module.resolve({{namePascalCase}}Service);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
