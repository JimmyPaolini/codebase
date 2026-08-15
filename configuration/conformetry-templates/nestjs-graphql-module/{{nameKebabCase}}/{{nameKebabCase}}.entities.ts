import { ArgsType, Field, ID, InputType, ObjectType } from "@nestjs/graphql";
import {
  ConnectionArgs,
  createConnectionType,
  createEdgeType,
} from "nestjs-graphql-connection";

// 🧬 Entities

/**
 * TODO: Document the {{namePascalCase}} GraphQL object type.
 */
@ObjectType()
export class {{namePascalCase}}Entity {
  @Field(() => ID)
  id!: string;
}

@ObjectType()
export class {{namePascalCase}}Edge extends createEdgeType(
  {{namePascalCase}}Entity,
) {}

/**
 * GraphQL Relay Connection for {{namePascalCase}}.
 */
@ObjectType()
export class {{namePascalCase}}Connection extends createConnectionType(
  {{namePascalCase}}Edge,
) {}

// 📥 Inputs

/**
 * TODO: Document the Create{{namePascalCase}}Input GraphQL input type.
 */
@InputType()
export class Create{{namePascalCase}}Input {
  @Field()
  // TODO: Add input fields.
  _placeholder!: never;
}

/**
 * TODO: Document the Update{{namePascalCase}}Input GraphQL input type.
 */
@InputType()
export class Update{{namePascalCase}}Input {
  @Field()
  // TODO: Add input fields.
  _placeholder!: never;
}

/**
 * TODO: Document the Delete{{namePascalCase}}Input GraphQL input type.
 */
@InputType()
export class Delete{{namePascalCase}}Input {
  @Field()
  // TODO: Add input fields.
  _placeholder!: never;
}

// ⚙️ Args

/**
 * TODO: Document the Find{{namePascalCase}}Args GraphQL args type.
 */
@ArgsType()
export class Find{{namePascalCase}}Args extends ConnectionArgs {
  // TODO: Add custom filter arguments here
}
