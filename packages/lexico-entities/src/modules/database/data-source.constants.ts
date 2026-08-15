import "reflect-metadata";
import { DataSource } from "typeorm";

import { AdjectivalForm } from "../entities/dictionary/form/AdjectivalForm.entity";
import { AdverbForm } from "../entities/dictionary/form/AdverbForm.entity";
import { FiniteVerbForm } from "../entities/dictionary/form/FiniteVerbForm.entity";
import { Form } from "../entities/dictionary/form/Form.entity";
import { GerundForm } from "../entities/dictionary/form/GerundForm.entity";
import { InfinitiveForm } from "../entities/dictionary/form/InfinitiveForm.entity";
import { NominalForm } from "../entities/dictionary/form/NominalForm.entity";
import { ParticipleForm } from "../entities/dictionary/form/ParticipleForm.entity";
import { SupineForm } from "../entities/dictionary/form/SupineForm.entity";
import { AdjectiveInflection } from "../entities/dictionary/inflection/AdjectiveInflection.entity";
import { AdverbInflection } from "../entities/dictionary/inflection/AdverbInflection.entity";
import { Inflection } from "../entities/dictionary/inflection/Inflection.entity";
import { NounInflection } from "../entities/dictionary/inflection/NounInflection.entity";
import { PrepositionInflection } from "../entities/dictionary/inflection/PrepositionInflection.entity";
import { UninflectedInflection } from "../entities/dictionary/inflection/Uninflected.entity";
import { VerbInflection } from "../entities/dictionary/inflection/VerbInflection.entity";
import { Lexeme } from "../entities/dictionary/Lexeme.entity";
import { PrincipalPart } from "../entities/dictionary/PrincipalPart.entity";
import { Pronunciation } from "../entities/dictionary/Pronunciation.entity";
import { Translation } from "../entities/dictionary/Translation.entity";
import { Word } from "../entities/dictionary/Word.entity";
import { WordForm } from "../entities/dictionary/WordForm.entity";
import { WordLexeme } from "../entities/dictionary/WordLexeme.entity";
import { Author } from "../entities/literature/Author.entity";
import { Line } from "../entities/literature/Line.entity";
import { Text } from "../entities/literature/Text.entity";
import { Token } from "../entities/literature/Token.entity";

import { LexicoNamingStrategy } from "./database.constants";

export const LEXICO_DATABASE_ENTITIES = [
  Lexeme,
  Inflection,
  NounInflection,
  VerbInflection,
  AdjectiveInflection,
  AdverbInflection,
  PrepositionInflection,
  UninflectedInflection,
  PrincipalPart,
  Pronunciation,
  Word,
  Translation,
  Form,
  NominalForm,
  AdjectivalForm,
  AdverbForm,
  FiniteVerbForm,
  InfinitiveForm,
  ParticipleForm,
  GerundForm,
  SupineForm,
  WordForm,
  WordLexeme,
  Author,
  Text,
  Line,
  Token,
] as const;

export const lexicoDataSource = new DataSource({
  database: process.env["POSTGRES_DB"] ?? "postgres",
  entities: [...LEXICO_DATABASE_ENTITIES],
  host: process.env["POSTGRES_HOST"] ?? "localhost",
  logging: false,
  migrations: ["src/modules/database/migrations/*.ts"],
  namingStrategy: new LexicoNamingStrategy(),
  password: process.env["POSTGRES_PASSWORD"] ?? "postgres",
  port: Number(process.env["POSTGRES_PORT"] ?? 5432),
  schema: "public",
  synchronize: false,
  type: "postgres",
  username: process.env["POSTGRES_USER"] ?? "postgres",
});
