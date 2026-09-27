import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

import { Line, Token } from "@codebase/lexico-entities";

/** Resolves nested token rows for a literature line. */
@Resolver(() => Line)
export class LiteratureLineResolver {
  /** Resolves every token attached to a line. */
  @ResolveField(() => [Token], { name: "tokens" })
  public tokensForLine(@Parent() line: Line): Token[] {
    return line.tokens;
  }
}
