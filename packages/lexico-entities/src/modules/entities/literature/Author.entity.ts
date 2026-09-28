import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, OneToMany } from "typeorm";

import { AuditableEntity } from "../base/Auditable.entity";

import { Text } from "./Text.entity";

/**
 * Represents an author of Latin literature.
 */
@Entity({
  comment: "An author of Latin literature",
  name: "authors",
  schema: "public",
})
@ObjectType()
export class Author extends AuditableEntity {
  @Column("jsonb", { comment: "Unstructured metadata", nullable: true })
  metadata?: null | Record<string, unknown>;

  @Column("varchar", { comment: "The display name of the author", length: 64 })
  @Field()
  name!: string;

  @Column("varchar", {
    comment: "Unique slug identifier (e.g. 'caesar')",
    length: 64,
    unique: true,
  })
  @Field()
  slug!: string;

  @Field(() => [Text])
  @OneToMany("Text", "author", { cascade: true })
  texts!: Text[];
}
