import { Module } from "@nestjs/common";

import {
  Author,
  Line,
  Text,
  Token,
  TypeOrmModule,
} from "@codebase/lexico-entities";

import { AuthorsResolver } from "./authors.resolver";
import { LinesResolver } from "./lines.resolver";
import { LiteratureResolver } from "./literature.resolver";
import { LiteratureService } from "./literature.service";
import { TextsResolver } from "./texts.resolver";
import { TokenWordDataLoader } from "./token-word-loader.service";
import { TokensResolver } from "./tokens.resolver";

/**
 * Module providing literature browsing, hierarchy, and search endpoints.
 */
@Module({
  exports: [LiteratureService, TokenWordDataLoader],
  imports: [TypeOrmModule.forFeature([Author, Text, Line, Token])],
  providers: [
    AuthorsResolver,
    TextsResolver,
    LinesResolver,
    TokensResolver,
    LiteratureResolver,
    LiteratureService,
    TokenWordDataLoader,
  ],
})
export class LiteratureModule {}
