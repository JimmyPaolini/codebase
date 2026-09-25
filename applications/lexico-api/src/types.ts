import { Field, ObjectType } from "@nestjs/graphql";

/**
 * Constructor type for class references.
 */
export type ClassConstructor<T> = abstract new (...arguments_: never[]) => T;

/**
 * Generic Relay Connection interface.
 */
export interface Connection<T> {
  edges: Edge<T>[];
  pageInfo: PageInfo;
  totalCount: number;
}

/**
 * Generic Relay Edge interface.
 */
export interface Edge<T> {
  cursor: string;
  node: T;
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
