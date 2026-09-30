import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Line, Text } from "@codebase/lexico-entities";

import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";

describe(TextsResolver, () => {
  let resolver: TextsResolver;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TextsResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
      ],
    }).compile();

    resolver = await module.resolve(TextsResolver);
  });

  it("is defined", () => {
    expect(resolver).toBeDefined();
  });

  it("resolves a single text by lookup", async () => {
    expect.hasAssertions();

    const text = new Text();
    text.id = "text-1";
    text.title = "Aeneid";

    const mockService = createMock<LiteratureService>({
      findTextByLookup: vi
        .fn<LiteratureService["findTextByLookup"]>()
        .mockResolvedValue(text),
    });

    const textsResolver = new TextsResolver(mockService);

    await expect(textsResolver.text({ id: "text-1" })).resolves.toBe(text);
    await expect(textsResolver.text({ slug: "aeneid" })).resolves.toBe(text);
    await expect(
      textsResolver.text({ lookup: { id: "text-1" } }),
    ).resolves.toBe(text);
    await expect(
      textsResolver.text({ lookup: { slug: "aeneid" } }),
    ).resolves.toBe(text);
  });

  it("returns a paginated connection for texts", async () => {
    expect.hasAssertions();

    const text = new Text();
    text.id = "text-1";

    const mockService = createMock<LiteratureService>({
      listTextsConnection: vi
        .fn<LiteratureService["listTextsConnection"]>()
        .mockResolvedValue({
          edges: [{ cursor: "t", node: text }],
          pageInfo: {
            endCursor: "t",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "t",
          },
          totalCount: 1,
        }),
    });

    const textsResolver = new TextsResolver(mockService);

    await expect(
      textsResolver.texts({
        after: "cursor-1",
        authorId: "author-1",
        before: "cursor-0",
        first: 10,
        last: 5,
      }),
    ).resolves.toMatchObject({
      edges: [{ node: text }],
      totalCount: 1,
    });
    await expect(
      textsResolver.texts({ first: 10, parentTextId: "parent-1" }),
    ).resolves.toMatchObject({
      edges: [{ node: text }],
      totalCount: 1,
    });
    await expect(textsResolver.texts({ first: 10 })).resolves.toMatchObject({
      edges: [{ node: text }],
      totalCount: 1,
    });
  });

  it("resolves text search results and nested text/line relations", async () => {
    expect.hasAssertions();

    const text = new Text();
    text.id = "text-1";
    text.childTexts = [new Text()];
    text.parentText = new Text();
    text.lines = [new Line()];

    const mockService = createMock<LiteratureService>({
      searchTexts: vi.fn<LiteratureService["searchTexts"]>().mockResolvedValue({
        edges: [{ cursor: "t", node: text }],
        pageInfo: {
          endCursor: "t",
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "t",
        },
        totalCount: 1,
      }),
    });

    const textsResolver = new TextsResolver(mockService);

    await expect(
      textsResolver.searchTexts({
        after: "c-1",
        authorId: "author-1",
        before: "c-0",
        first: 5,
        last: 2,
        query: "ene",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: text }],
      totalCount: 1,
    });
    await expect(
      textsResolver.searchTexts({ first: 5, query: "ene" }),
    ).resolves.toMatchObject({
      edges: [{ node: text }],
      totalCount: 1,
    });

    expect(textsResolver.childTexts(text)).toStrictEqual(text.childTexts);
    expect(textsResolver.parentText(text)).toBe(text.parentText);
    expect(textsResolver.parentText(new Text())).toBeNull();
    expect(textsResolver.linesForText(text)).toStrictEqual(text.lines);
  });

  it("resolves nullable text lookups", async () => {
    expect.hasAssertions();

    const textsResolver = new TextsResolver(createMock<LiteratureService>());

    await expect(textsResolver.text({})).resolves.toBeNull();

    await expect(textsResolver.text({ lookup: {} })).resolves.toBeNull();
  });
});
