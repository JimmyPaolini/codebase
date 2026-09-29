import { createMock } from "@golevelup/ts-vitest";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { AuthorsResolver } from "./authors.resolver";
import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";

describe("authors resolver suite", () => {
  it("exposes authors as a pagination-only listing without a query argument", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        AuthorsResolver,
        TextsResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    const schema = await module
      .get(GraphQLSchemaFactory)
      .create([AuthorsResolver, TextsResolver]);
    const fields = schema.getQueryType()?.getFields();

    expect(
      fields?.["authors"]?.args.map((argument) => argument.name).toSorted(),
    ).toStrictEqual(["after", "before", "first", "last"]);
    expect(
      fields?.["searchAuthors"]?.args.map((argument) => argument.name),
    ).toContain("query");
  });
});
