import { Inject } from "@nestjs/common";
import {
  Args as Arguments,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";

import { Token, Word } from "@codebase/lexico-entities";

import { TokenConnectionType } from "./literature-connection.entities";
import { LiteratureService } from "./literature.service";
import { TokenWordDataLoader } from "./token-word-loader.service";
import { TokensArguments } from "./tokens-arguments.entities";

import type { Connection } from "../../lexico-api.types";

/**
 * GraphQL resolver for Tokens.
 */
@Resolver(() => Token)
export class TokensResolver {
  public constructor(
    @Inject(LiteratureService)
    private readonly literatureService: LiteratureService,
    @Inject(TokenWordDataLoader)
    private readonly tokenWordDataLoader: TokenWordDataLoader,
  ) {}

  /** Resolves a token to the matching dictionary word. */
  @ResolveField(() => Word, { name: "word", nullable: true })
  public async resolveTokenWord(@Parent() token: Token): Promise<null | Word> {
    return this.tokenWordDataLoader.byTokenId.load(token.id);
  }

  /** Lists tokens for a line. */
  @Query(() => TokenConnectionType, { name: "tokens" })
  public async tokens(
    @Arguments() arguments_: TokensArguments,
  ): Promise<Connection<Token>> {
    return this.literatureService.listTokensForLineConnection(
      arguments_.lineId,
      arguments_,
    );
  }
}
