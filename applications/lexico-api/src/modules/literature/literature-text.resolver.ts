import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

import { Line, Text } from "@codebase/lexico-entities";

/** Resolves nested text hierarchy and line relationships. */
@Resolver(() => Text)
export class LiteratureTextResolver {
  /** Lists all child texts under the current text. */
  @ResolveField(() => [Text], { name: "childTexts" })
  public childTexts(@Parent() text: Text): Text[] {
    return text.childTexts;
  }

  /** Lists all lines attached to the current text. */
  @ResolveField(() => [Line], { name: "lines" })
  public linesForText(@Parent() text: Text): Line[] {
    return text.lines;
  }

  /** Resolves the parent text for a nested text. */
  @ResolveField(() => Text, { name: "parentText", nullable: true })
  public parentText(@Parent() text: Text): null | Text {
    return text.parentText ?? null;
  }
}
