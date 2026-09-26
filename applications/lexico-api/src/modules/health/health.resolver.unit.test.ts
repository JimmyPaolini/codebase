import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { HealthResolver } from "./health.resolver";
import { HealthService } from "./health.service";

describe("health resolver suite", () => {
  it("builds health resolver schema definition", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [HealthResolver, HealthService],
    }).compile();

    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create([HealthResolver]);

    expect(schema).toBeDefined();
  });

  it("returns health check status from service", () => {
    expect.hasAssertions();

    const service = new HealthService();
    const resolver = new HealthResolver(service);

    expect(resolver.health()).toBe(true);
  });
});
