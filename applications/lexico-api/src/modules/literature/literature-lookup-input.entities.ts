import { Field, ID, InputType } from "@nestjs/graphql";

/** GraphQL lookup arguments for a literature entity. */
@InputType()
export class EntityLookupInput {
  @Field(() => ID, { nullable: true })
  public id?: string;

  @Field(() => String, { nullable: true })
  public slug?: string;
}
