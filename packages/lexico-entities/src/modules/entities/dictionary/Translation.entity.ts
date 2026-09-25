import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { AuditableEntity } from "../base/Auditable.entity";

import type { Lexeme } from "./Lexeme.entity";

/**
 * A single English translation linked to a lexeme.
 */
@Entity({
  comment: "An English translation of a Latin dictionary entry",
  name: "translations",
  schema: "public",
})
@ObjectType()
export class Translation extends AuditableEntity {
  constructor(data: string, lexeme?: Lexeme) {
    super();
    this.data = data;
    if (lexeme) this.lexeme = lexeme;
  }

  @Column("text", { comment: "English translation text" })
  @Field()
  @Index()
  data!: string;

  @Index()
  @JoinColumn()
  @ManyToOne("Lexeme", "translations", {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  lexeme!: Lexeme;

  @Column({
    asExpression: "to_tsvector('english', data)",
    generatedType: "STORED",
    nullable: true,
    select: false,
    type: "tsvector",
  })
  @Index({ type: "gin" })
  translationFullTextSearch!: string;
}
