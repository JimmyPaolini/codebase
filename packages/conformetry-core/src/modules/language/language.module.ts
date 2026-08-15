import { Module } from "@nestjs/common";

import { LanguageService } from "./language.service";

/**
 * Owns the language validator contract and the shared execution envelope.
 *
 * Imported by `conformetry-validation`, which drives the registered language
 * validators, and by any package composing them (such as
 * `conformetry-jupyter`).
 */
@Module({
  controllers: [],
  exports: [LanguageService],
  imports: [],
  providers: [LanguageService],
})
export class LanguageModule {}
