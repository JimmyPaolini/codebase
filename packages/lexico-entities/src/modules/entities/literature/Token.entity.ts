import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";

import { AuditableEntity } from "../base/Auditable.entity";
import { Word } from "../dictionary/Word.entity";

import { Author } from "./Author.entity";
import { Line } from "./Line.entity";
import { Text } from "./Text.entity";

/**
 * Represents a single token (word or punctuation) parsed from a line of text.
 */
@Entity({
  comment:
    "A single parsed token (word or punctuation) from a line of literature",
  name: "tokens",
  schema: "public",
})
@Index(["line", "index"], { unique: true })
@Index(["text", "index"])
@ObjectType()
export class Token extends AuditableEntity {
  @Field(() => Author)
  @Index()
  @ManyToOne("Author", { eager: false, onDelete: "CASCADE" })
  author!: Author;

  @Column("varchar", { comment: "The raw string value of the token" })
  @Field()
  @Index()
  data!: string;

  @Column("bigint", {
    comment: "The 0-based index of this token within its parent line",
  })
  @Field()
  index!: number;

  @Column("boolean", {
    comment:
      "True if the token represents punctuation or whitespace, false if it is a word",
  })
  @Field()
  isPunctuation!: boolean;

  @Field(() => Line)
  @ManyToOne("Line", "tokens", { eager: false, onDelete: "CASCADE" })
  line!: Line;

  @Field(() => Text)
  @ManyToOne("Text", { eager: false, onDelete: "CASCADE" })
  text!: Text;

  @Field(() => Word, { nullable: true })
  @Index()
  @JoinColumn()
  @ManyToOne("Word", { eager: false, nullable: true })
  word?: null | Word;
}
