import { Module } from "@nestjs/common";

import { EmbeddedUCountCharacteristicService } from "./embedded-u-count-characteristic.service";

/**
 * Provides and exports every embedded-motif characteristic evaluator — unit
 * shapes read from a 2×2 window that ignore whatever other ink also passes
 * through it — as one group `CharacteristicsModule` imports and re-exports.
 */
@Module({
  controllers: [],
  exports: [EmbeddedUCountCharacteristicService],
  imports: [],
  providers: [EmbeddedUCountCharacteristicService],
})
export class EmbeddedCharacteristicsModule {}
