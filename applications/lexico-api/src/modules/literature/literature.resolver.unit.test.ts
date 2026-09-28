import { createMock } from "@golevelup/ts-vitest";
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from "@nestjs/graphql";
import { Test } from "@nestjs/testing";
import { describe, expect, it, vi } from "vitest";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import { AuthorsResolver } from "./authors.resolver";
import { LinesResolver } from "./lines.resolver";
import { LiteratureResolver } from "./literature.resolver";
import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";
import { TokenWordDataLoader } from "./token-word-loader.service";
import { TokensResolver } from "./tokens.resolver";

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

    const authorsResolver = new AuthorsResolver(mockService);
    const textsResolver = new TextsResolver(mockService);

    await expect(authorsResolver.author({ id: "author-1" })).resolves.toBe(
      author,
    );
    await expect(authorsResolver.author({ slug: "virgil" })).resolves.toBe(
      author,
    );
    await expect(
      authorsResolver.author({ lookup: { id: "author-1" } }),
    ).resolves.toBe(author);
    await expect(
      authorsResolver.author({ lookup: { slug: "virgil" } }),
    ).resolves.toBe(author);
    await expect(textsResolver.text({ id: "text-1" })).resolves.toBe(text);
    await expect(textsResolver.text({ slug: "aeneid" })).resolves.toBe(text);
    await expect(
      textsResolver.text({ lookup: { id: "text-1" } }),
    ).resolves.toBe(text);
    await expect(
      textsResolver.text({ lookup: { slug: "aeneid" } }),
    ).resolves.toBe(text);
    await expect(
      authorsResolver.resolveAuthorTexts(author),
    ).resolves.toStrictEqual([text]);
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

    const authorsResolver = new AuthorsResolver(mockService);
    const textsResolver = new TextsResolver(mockService);
    const linesResolver = new LinesResolver(mockService);
    const tokensResolver = new TokensResolver(
      mockService,
      createMock<TokenWordDataLoader>(),
    );

    await expect(
      authorsResolver.authors({
        after: "cursor-1",
        before: "cursor-0",
        first: 10,
        last: 5,
        query: "",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: author }],
      totalCount: 1,
    });
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
    await expect(
      linesResolver.lines({
        after: "cursor-1",
        before: "cursor-0",
        first: 10,
        last: 5,
        range: { endIndex: 5, startIndex: 1 },
        textId: "text-1",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: line }],
      totalCount: 1,
    });
    await expect(
      linesResolver.lines({
        first: 10,
      }),
    ).resolves.toMatchObject({
      edges: [{ node: line }],
      totalCount: 1,
    });
    await expect(
      tokensResolver.tokens({
        after: "cursor-1",
        before: "cursor-0",
        first: 10,
        last: 5,
        lineId: "line-1",
      }),
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

    const authorsResolver = new AuthorsResolver(mockService);
    const textsResolver = new TextsResolver(mockService);
    const linesResolver = new LinesResolver(mockService);
    const literatureResolver = new LiteratureResolver(mockService);

    await expect(
      authorsResolver.searchAuthors({
        after: "c-1",
        before: "c-0",
        first: 5,
        last: 2,
        query: "vir",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: author }],
      totalCount: 1,
    });
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
    await expect(
      linesResolver.searchLines({
        after: "c-1",
        before: "c-0",
        first: 5,
        last: 2,
        query: "arma",
        textId: "text-1",
      }),
    ).resolves.toMatchObject({
      edges: [{ node: line }],
      totalCount: 1,
    });
    await expect(
      linesResolver.searchLines({ first: 5, query: "arma" }),
    ).resolves.toMatchObject({
      edges: [{ node: line }],
      totalCount: 1,
    });
    await expect(
      literatureResolver.searchLiterature({
        authorId: "author-1",
        query: "vir",
      }),
    ).resolves.toStrictEqual({
      authors: [author],
      lines: [line],
      texts: [text],
    });
    await expect(
      literatureResolver.searchLiterature({ query: "vir" }),
    ).resolves.toStrictEqual({
      authors: [author],
      lines: [line],
      texts: [text],
    });

    expect(textsResolver.childTexts(text)).toStrictEqual(text.childTexts);
    expect(textsResolver.parentText(text)).toBe(text.parentText);
    expect(textsResolver.parentText(new Text())).toBeNull();
    expect(textsResolver.linesForText(text)).toStrictEqual(text.lines);

    expect(linesResolver.tokensForLine(line)).toStrictEqual(line.tokens);
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

    const tokenWithoutWord = new Token();
    tokenWithoutWord.id = "token-2";
    tokenWithoutWord.data = "et";
    tokenWithoutWord.isPunctuation = false;

    const mockService = createMock<LiteratureService>({
      findTokensByIds: vi
        .fn<(ids: string[]) => Promise<Token[]>>()
        .mockImplementation(async (ids) => {
          await Promise.resolve();

          const result: Token[] = [];
          if (ids.includes("token-1")) {
            result.push(token);
          }
          if (ids.includes("token-2")) {
            result.push(tokenWithoutWord);
          }

          return result;
        }),
    });

    const loader = new TokenWordDataLoader(mockService);

    await expect(loader.loadTokenWord("token-1")).resolves.toBe(word);
    await expect(loader.loadTokenWord("token-2")).resolves.toBeNull();
    await expect(loader.loadTokenWord("missing")).resolves.toBeNull();

    await expect(
      loader.loadTokenWords(["token-1", "token-2", "missing"]),
    ).resolves.toStrictEqual([word, null, null]);

    await expect(loader.loadTokenWords([])).resolves.toStrictEqual([]);

    const authorsResolver = new AuthorsResolver(mockService);
    const textsResolver = new TextsResolver(mockService);
    const tokensResolver = new TokensResolver(mockService, loader);

    await expect(authorsResolver.author({})).resolves.toBeNull();

    await expect(authorsResolver.author({ lookup: {} })).resolves.toBeNull();

    await expect(textsResolver.text({})).resolves.toBeNull();

    await expect(textsResolver.text({ lookup: {} })).resolves.toBeNull();

    await expect(tokensResolver.resolveTokenWord(token)).resolves.toBe(word);
    expect(authorsResolver).toBeInstanceOf(AuthorsResolver);
  });

  it("generates a schema containing the literature queries and field resolvers", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
      providers: [
        AuthorsResolver,
        TextsResolver,
        LinesResolver,
        TokensResolver,
        LiteratureResolver,
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
      AuthorsResolver,
      TextsResolver,
      LinesResolver,
      TokensResolver,
      LiteratureResolver,
    ]);

    expect(schema).toBeDefined();
    expect(schema.getQueryType()?.getFields()["author"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["authors"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["text"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["texts"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["lines"]).toBeDefined();
    expect(schema.getQueryType()?.getFields()["tokens"]).toBeDefined();
    expect(
      schema.getQueryType()?.getFields()["searchLiterature"],
    ).toBeDefined();
  });
});
