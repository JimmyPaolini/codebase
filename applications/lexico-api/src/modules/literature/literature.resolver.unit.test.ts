import { createMock } from "@golevelup/ts-vitest";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import { LiteratureLineResolver } from "./literature-line.resolver";
import { LiteratureTextResolver } from "./literature-text.resolver";
import { LiteratureResolver } from "./literature.resolver";
import { LiteratureService } from "./literature.service";
import { TokenWordDataLoader } from "./token-word-loader.service";

describe("literature resolver suite", () => {
  it("resolves a single author and text by lookup, including nested field data", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";
    author.name = "Virgil";

    const text = new Text();
    text.id = "text-1";
    text.title = "Aeneid";

    const mockService = createMock<LiteratureService>({
      findAuthorByLookup: vi
        .fn<LiteratureService["findAuthorByLookup"]>()
        .mockResolvedValue(author),
      findTextByLookup: vi
        .fn<LiteratureService["findTextByLookup"]>()
        .mockResolvedValue(text),
      listTexts: vi
        .fn<LiteratureService["listTexts"]>()
        .mockResolvedValue([text]),
    });

    const mockLoader = createMock<TokenWordDataLoader>({
      byTokenId: {
        load: vi.fn<() => Promise<Word>>().mockResolvedValue(new Word()),
      },
    });

    const resolver = new LiteratureResolver(mockService, mockLoader);

    await expect(resolver.author({ id: "author-1" })).resolves.toBe(author);
    await expect(resolver.text({ id: "text-1" })).resolves.toBe(text);
    await expect(resolver.resolveAuthorTexts(author)).resolves.toStrictEqual([
      text,
    ]);
  });

  it("returns paginated connections for authors, texts, lines, and tokens", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";

    const text = new Text();
    text.id = "text-1";

    const line = new Line();
    line.id = "line-1";

    const token = new Token();
    token.id = "token-1";

    const mockService = createMock<LiteratureService>({
      listAuthorsConnection: vi
        .fn<LiteratureService["listAuthorsConnection"]>()
        .mockResolvedValue({
          edges: [{ cursor: "a", node: author }],
          pageInfo: {
            endCursor: "a",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "a",
          },
          totalCount: 1,
        }),
      listLinesConnection: vi
        .fn<LiteratureService["listLinesConnection"]>()
        .mockResolvedValue({
          edges: [{ cursor: "l", node: line }],
          pageInfo: {
            endCursor: "l",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "l",
          },
          totalCount: 1,
        }),
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
      listTokensForLineConnection: vi
        .fn<LiteratureService["listTokensForLineConnection"]>()
        .mockResolvedValue({
          edges: [{ cursor: "to", node: token }],
          pageInfo: {
            endCursor: "to",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "to",
          },
          totalCount: 1,
        }),
    });

    const resolver = new LiteratureResolver(
      mockService,
      createMock<TokenWordDataLoader>(),
    );

    await expect(resolver.authors({ first: 10 })).resolves.toMatchObject({
      edges: [{ node: author }],
      totalCount: 1,
    });
    await expect(
      resolver.texts("author-1", undefined, { first: 10 }),
    ).resolves.toMatchObject({
      edges: [{ node: text }],
      totalCount: 1,
    });
    await expect(
      resolver.lines("text-1", { endIndex: 5, startIndex: 1 }, { first: 10 }),
    ).resolves.toMatchObject({
      edges: [{ node: line }],
      totalCount: 1,
    });
    await expect(
      resolver.tokens("line-1", { first: 10 }),
    ).resolves.toMatchObject({
      edges: [{ node: token }],
      totalCount: 1,
    });
  });

  it("resolves search results and nested text/line relations", async () => {
    expect.hasAssertions();

    const author = new Author();
    author.id = "author-1";

    const text = new Text();
    text.id = "text-1";
    text.childTexts = [new Text()];
    text.parentText = new Text();
    text.lines = [new Line()];

    const line = new Line();
    line.id = "line-1";
    line.tokens = [new Token()];

    const mockService = createMock<LiteratureService>({
      searchAuthors: vi
        .fn<LiteratureService["searchAuthors"]>()
        .mockResolvedValue({
          edges: [{ cursor: "a", node: author }],
          pageInfo: {
            endCursor: "a",
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "a",
          },
          totalCount: 1,
        }),
      searchLines: vi.fn<LiteratureService["searchLines"]>().mockResolvedValue({
        edges: [{ cursor: "l", node: line }],
        pageInfo: {
          endCursor: "l",
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: "l",
        },
        totalCount: 1,
      }),
      searchLiterature: vi
        .fn<LiteratureService["searchLiterature"]>()
        .mockResolvedValue({
          authors: [author],
          lines: [line],
          texts: [text],
        }),
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

    const resolver = new LiteratureResolver(
      mockService,
      createMock<TokenWordDataLoader>(),
    );

    await expect(
      resolver.searchAuthors("vir", { first: 5 }),
    ).resolves.toMatchObject({
      edges: [{ node: author }],
      totalCount: 1,
    });
    await expect(
      resolver.searchTexts("ene", "author-1", { first: 5 }),
    ).resolves.toMatchObject({
      edges: [{ node: text }],
      totalCount: 1,
    });
    await expect(
      resolver.searchLines("arma", "text-1", { first: 5 }),
    ).resolves.toMatchObject({
      edges: [{ node: line }],
      totalCount: 1,
    });
    await expect(
      resolver.searchLiterature("vir", "author-1"),
    ).resolves.toStrictEqual({
      authors: [author],
      lines: [line],
      texts: [text],
    });

    const textResolver = new LiteratureTextResolver();

    expect(textResolver.childTexts(text)).toStrictEqual(text.childTexts);
    expect(textResolver.parentText(text)).toBe(text.parentText);
    expect(textResolver.linesForText(text)).toStrictEqual(text.lines);

    const lineResolver = new LiteratureLineResolver();

    expect(lineResolver.tokensForLine(line)).toStrictEqual(line.tokens);
  });

  it("resolves nullable lookups and the token data loader batch contract", async () => {
    expect.hasAssertions();

    const word = new Word();
    word.id = "word-1";
    word.data = "amo";

    const token = new Token();
    token.id = "token-1";
    token.data = "amo";
    token.isPunctuation = false;
    token.word = word;

    const mockService = createMock<LiteratureService>({
      findTokensByIds: vi
        .fn<(ids: string[]) => Promise<Token[]>>()
        .mockImplementation(async (ids) => {
          await Promise.resolve();

          if (ids.includes("token-1")) {
            return [token];
          }

          return [];
        }),
    });

    const loader = new TokenWordDataLoader(mockService);

    await expect(loader.loadTokenWord("token-1")).resolves.toBe(word);

    await expect(
      loader.loadTokenWords(["token-1", "missing"]),
    ).resolves.toStrictEqual([word, null]);

    await expect(loader.loadTokenWords([])).resolves.toStrictEqual([]);

    const resolver = new LiteratureResolver(mockService, loader);

    await expect(
      resolver.author(undefined, undefined, undefined),
    ).resolves.toBeNull();

    await expect(
      resolver.text(undefined, undefined, undefined),
    ).resolves.toBeNull();

    await expect(resolver.resolveTokenWord(token)).resolves.toBe(word);
    expect(resolver).toBeInstanceOf(LiteratureResolver);
  });

  it("generates a schema containing the literature queries and field resolvers", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        LiteratureResolver,
        LiteratureTextResolver,
        LiteratureLineResolver,
        {
          provide: LiteratureService,
          useValue: createMock<LiteratureService>(),
        },
        {
          provide: TokenWordDataLoader,
          useValue: createMock<TokenWordDataLoader>(),
        },
      ],
    }).compile();

    const schemaFactory = module.get(GraphQLSchemaFactory);
    const schema = await schemaFactory.create([
      LiteratureResolver,
      LiteratureTextResolver,
      LiteratureLineResolver,
    ]);

    expect(schema).toBeDefined();
    expect(schema.getQueryType()?.getFields()["author"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["authors"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["text"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["texts"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["lines"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["tokens"]).toBeDefined();
  });
});
