import { Inject } from "@nestjs/common";
import { Args as Arguments, ID, Query, Resolver } from "@nestjs/graphql";

import { Lexeme } from "@codebase/lexico-entities";

import { LexemesService } from "./lexemes.service";

/**
 * GraphQL resolver exposing dictionary lexeme queries.
 */
@Resolver(() => Lexeme)
export class LexemesResolver {
  public constructor(
    @Inject(LexemesService) private readonly lexemesService: LexemesService,
  ) {}

  /**
   * Retrieves a single dictionary lexeme by ID.
   */
  @Query(() => Lexeme, {
    description: "Retrieves a single dictionary lexeme by ID.",
    name: "lexeme",
    nullable: true,
  })
  public async lexeme(
    @Arguments("id", { type: () => ID }) id: string,
  ): Promise<Lexeme | null> {
    return this.lexemesService.findById(id);
  }

  /**
   * Retrieves multiple dictionary lexemes by ID.
   */
  @Query(() => [Lexeme], {
    description: "Retrieves multiple dictionary lexemes by ID.",
    name: "lexemes",
  })
  public async lexemes(
    @Arguments("ids", { type: () => [ID] }) ids: string[],
  ): Promise<Lexeme[]> {
    return this.lexemesService.findByIds(ids);
  }
}
