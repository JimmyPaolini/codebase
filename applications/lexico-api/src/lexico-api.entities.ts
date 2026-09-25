import {
  ArgsType as ArgumentsType,
  Field,
  Int,
  ObjectType,
} from "@nestjs/graphql";

/**
 * GraphQL arguments for Relay forward and backward keyset pagination.
 */
@ArgumentsType()
export class PaginationArguments {
  @Field(() => String, {
    description: "Returns edges after the given cursor.",
    nullable: true,
  })
  public after?: null | string | undefined;

  @Field(() => String, {
    description: "Returns edges before the given cursor.",
    nullable: true,
  })
  public before?: null | string | undefined;

  @Field(() => Int, {
    description: "Number of edges to return from the start.",
    nullable: true,
  })
  public first?: null | number | undefined;

  @Field(() => Int, {
    description: "Number of edges to return from the end.",
    nullable: true,
  })
  public last?: null | number | undefined;
}

/**
 * Relay PageInfo containing pagination state.
 */
@ObjectType({ description: "Information about pagination in a connection." })
export class PageInfo {
  @Field(() => String, {
    description: "When paginating forwards, the cursor to continue.",
    nullable: true,
  })
  public endCursor?: string | undefined;

  @Field(() => Boolean, {
    description: "When paginating forwards, are there more items?",
  })
  public hasNextPage!: boolean;

  @Field(() => Boolean, {
    description: "When paginating backwards, are there more items?",
  })
  public hasPreviousPage!: boolean;

  @Field(() => String, {
    description: "When paginating backwards, the cursor to continue.",
    nullable: true,
  })
  public startCursor?: string | undefined;
}
