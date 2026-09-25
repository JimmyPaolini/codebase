import { Inject } from "@nestjs/common";
import { Args as Arguments, Query, Resolver } from "@nestjs/graphql";

import { PaginationArguments } from "../../main.entities";

import { LexemeSearchConnection, LexemeSearchResult } from "./search.entities";
import { SearchService } from "./search.service";

import type { Connection } from "../../main.types";

/**
 * GraphQL resolver exposing Latin and English dictionary search queries.
 */
@Resolver()
export class SearchResolver {
  public constructor(
    @Inject(SearchService) private readonly searchService: SearchService,
  ) {}

  /**
   * Searches English definitions and translations using full-text and substring matching.
   */
  @Query(() => LexemeSearchConnection, {
    description:
      "Performs English definition and translation search with relevance ranking.",
    name: "searchEnglish",
  })
  public async searchEnglish(
    @Arguments("query", { type: () => String }) query: string,
    @Arguments() pagination: PaginationArguments,
  ): Promise<Connection<LexemeSearchResult>> {
    return this.searchService.searchEnglish(query, pagination);
  }

  /**
   * Searches Latin lemmas and inflected forms with enclitic parsing and fuzzy matching.
   */
  @Query(() => LexemeSearchConnection, {
    description:
      "Performs tiered Latin dictionary search across exact headwords, inflected forms, prefixes, and fuzzy matches.",
    name: "searchLatin",
  })
  public async searchLatin(
    @Arguments("query", { type: () => String }) query: string,
    @Arguments() pagination: PaginationArguments,
  ): Promise<Connection<LexemeSearchResult>> {
    return this.searchService.searchLatin(query, pagination);
  }
}
