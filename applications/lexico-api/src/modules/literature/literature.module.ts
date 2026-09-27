import { Module } from "@nestjs/common";

import {
  Author,
  Line,
  Text,
  Token,
  TypeOrmModule,
} from "@codebase/lexico-entities";

import { LiteratureResolver } from "./literature.resolver";
import { LiteratureService } from "./literature.service";
import { TokenWordDataLoader } from "./token-word-loader.service";

/**
 * Module providing literature browsing, hierarchy, and search endpoints.
 */
@Module({
  exports: [LiteratureService, TokenWordDataLoader],
  imports: [TypeOrmModule.forFeature([Author, Text, Line, Token])],
  providers: [LiteratureResolver, LiteratureService, TokenWordDataLoader],
})
export class LiteratureModule {}
