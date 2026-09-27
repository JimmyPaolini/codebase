import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { Author, Line, Text, Token, Word } from "@codebase/lexico-entities";

import { PaginationArguments } from "../search/search-pagination.entities";

import {
  AuthorConnectionType,
  LineConnectionType,
  TextConnectionType,
  TokenConnectionType,
} from "./literature-connection.entities";
import { LinesRangeInput } from "./literature-lines-range.entities";
import { EntityLookupInput } from "./literature-lookup-input.entities";
import { LiteratureSearchResult } from "./literature-search-result.entities";
import { LiteratureService } from "./literature.service";
import { TokenWordDataLoader } from "./token-word-loader.service";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver exposing literature author, text, line, and token lookups.
 */
@Resolver(() => Author)
export class LiteratureResolver {
  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
    @Inject(TokenWordDataLoader)
    private readonly tokenWordDataLoader: TokenWordDataLoader,
  ) {}

  /**
   * Finds an author by ID or slug.
   */
  @Query(() => Author, { name: "author", nullable: true })
  public async author(
    @Arguments("lookup", { nullable: true, type: () => EntityLookupInput })
    lookup?: EntityLookupInput,
    @Arguments("id", { nullable: true, type: () => ID }) id?: string,
    @Arguments("slug", { nullable: true, type: () => String }) slug?: string,
  ): Promise<Author | null> {
    const resolvedId = lookup?.id ?? id;
    const resolvedSlug = lookup?.slug ?? slug;

    if (!resolvedId && !resolvedSlug) {
      return null;
    }

    return this.literatureService.findAuthorByLookup(resolvedId, resolvedSlug);
  }

  /**
   * Lists authors with Relay pagination.
   */
  @Query(() => AuthorConnectionType, { name: "authors" })
  public async authors(
    @Arguments() pagination: PaginationArguments,
  ): Promise<Connection<Author>> {
    return this.literatureService.listAuthorsConnection(pagination);
  }

  /**
   * Lists lines with optional range bounds.
   */
  @Query(() => LineConnectionType, { name: "lines" })
  public async lines(
    @Arguments("textId", { nullable: true, type: () => ID }) textId:
      | null
      | string
      | undefined,
    @Arguments("range", { nullable: true, type: () => LinesRangeInput })
    range?: LinesRangeInput,
    @Arguments() pagination?: PaginationArguments,
  ): Promise<Connection<Line>> {
    return this.literatureService.listLinesConnection(
      textId,
      {
        endIndex: range?.endIndex ?? null,
        startIndex: range?.startIndex ?? null,
      },
      pagination,
    );
  }

  /** Resolves the text list associated with an author. */
  @ResolveField(() => [Text], { name: "texts" })
  public async resolveAuthorTexts(@Parent() author: Author): Promise<Text[]> {
    return this.literatureService.listTexts(author.id);
  }

  /** Resolves a token to the matching dictionary word. */
  @ResolveField(() => Word, { name: "word", nullable: true })
  public async resolveTokenWord(@Parent() token: Token): Promise<null | Word> {
    return this.tokenWordDataLoader.byTokenId.load(token.id);
  }

  /** Searches authors by name or slug. */
  @Query(() => AuthorConnectionType, { name: "searchAuthors" })
  public async searchAuthors(
    @Arguments("query", { nullable: false, type: () => String }) query: string,
    @Arguments() pagination?: PaginationArguments,
  ): Promise<Connection<Author>> {
    return this.literatureService.searchAuthors(query, pagination);
  }

  /** Searches lines by content. */
  @Query(() => LineConnectionType, { name: "searchLines" })
  public async searchLines(
    @Arguments("query", { nullable: false, type: () => String }) query: string,
    @Arguments("textId", { nullable: true, type: () => ID }) textId:
      | null
      | string
      | undefined,
    @Arguments() pagination: PaginationArguments,
  ): Promise<Connection<Line>> {
    return this.literatureService.searchLines(query, textId, pagination);
  }

  /** Searches authors, texts, and lines together. */
  @Query(() => LiteratureSearchResult, { name: "searchLiterature" })
  public async searchLiterature(
    @Arguments("query", { nullable: false, type: () => String }) query: string,
    @Arguments("authorId", { nullable: true, type: () => ID })
    authorId?: string,
  ): Promise<LiteratureSearchResult> {
    const results = await this.literatureService.searchLiterature(
      query,
      authorId,
    );
    return {
      authors: results.authors,
      lines: results.lines,
      texts: results.texts,
    };
  }

  /** Searches texts by title or slug. */
  @Query(() => TextConnectionType, { name: "searchTexts" })
  public async searchTexts(
    @Arguments("query", { nullable: false, type: () => String }) query: string,
    @Arguments("authorId", { nullable: true, type: () => ID }) authorId:
      | null
      | string
      | undefined,
    @Arguments() pagination: PaginationArguments,
  ): Promise<Connection<Text>> {
    return this.literatureService.searchTexts(query, authorId, pagination);
  }

  /**
   * Finds a text by ID or slug.
   */
  @Query(() => Text, { name: "text", nullable: true })
  public async text(
    @Arguments("lookup", { nullable: true, type: () => EntityLookupInput })
    lookup?: EntityLookupInput,
    @Arguments("id", { nullable: true, type: () => ID }) id?: string,
    @Arguments("slug", { nullable: true, type: () => String }) slug?: string,
  ): Promise<null | Text> {
    const resolvedId = lookup?.id ?? id;
    const resolvedSlug = lookup?.slug ?? slug;

    if (!resolvedId && !resolvedSlug) {
      return null;
    }

    return this.literatureService.findTextByLookup(resolvedId, resolvedSlug);
  }

  /** Lists texts with optional author and parent filters. */
  @Query(() => TextConnectionType, { name: "texts" })
  public async texts(
    @Arguments("authorId", { nullable: true, type: () => ID }) authorId:
      | null
      | string
      | undefined,
    @Arguments("parentTextId", { nullable: true, type: () => ID })
    parentTextId: null | string | undefined,
    @Arguments() pagination: PaginationArguments,
  ): Promise<Connection<Text>> {
    return this.literatureService.listTextsConnection(
      authorId,
      parentTextId,
      pagination,
    );
  }

  /** Lists tokens for a line. */
  @Query(() => TokenConnectionType, { name: "tokens" })
  public async tokens(
    @Arguments("lineId", { type: () => ID }) lineId: string,
    @Arguments() pagination: PaginationArguments,
  ): Promise<Connection<Token>> {
    return this.literatureService.listTokensForLineConnection(
      lineId,
      pagination,
    );
  }
}
