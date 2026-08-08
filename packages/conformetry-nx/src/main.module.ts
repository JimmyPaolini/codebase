import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants.js";
import { LoggerModule } from "./modules/logger/logger.module.js";
import { NxAdapterModule } from "./modules/nx-adapter/nx-adapter.module.js";
import { RuleRoutingModule } from "./modules/rule-routing/rule-routing.module.js";

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    DiscoveryModule,
    LoggerModule,
    NxAdapterModule,
    RuleRoutingModule,
  ],
})
export class MainModule {}
