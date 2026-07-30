import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Form } from "@codebase/lexico-entities";

import { WordsModule } from "../words/words.module";

import { FormsBuilderGuardsService } from "./forms-builder-guards.service";
import { FormsBuilderOtherService } from "./forms-builder-other.service";
import { FormsBuilderVerbService } from "./forms-builder-verb.service";
import { FormsTransientWordsService } from "./forms-transient-words.service";
import { FormsService } from "./forms.service";

/**
 * Forms ingestion and entity management module.
 *
 * Coordinates parsing of morphological form data, building Form entities,
 * and persisting forms along with their associated transient words.
 */
@Module({
  controllers: [],
  exports: [FormsService],
  imports: [TypeOrmModule.forFeature([Form]), WordsModule],
  providers: [
    FormsService,
    FormsTransientWordsService,
    FormsBuilderGuardsService,
    FormsBuilderOtherService,
    FormsBuilderVerbService,
  ],
})
export class FormsModule {}
