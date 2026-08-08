import { Module } from "@nestjs/common";

import { RuleRoutingService } from "./rule-routing.service";

/**
 * Provides the rule-routing service.
 */
@Module({
  controllers: [],
  exports: [RuleRoutingService],
  imports: [],
  providers: [RuleRoutingService],
})
export class RuleRoutingModule {}
