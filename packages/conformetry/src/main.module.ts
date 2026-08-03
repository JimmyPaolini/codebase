import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants.js";
import { GenerateModule } from "./modules/commands/generate/generate.module.js";
import { ValidateModule } from "./modules/commands/validate/validate.module.js";
import { IntegrationModule } from "./modules/integration/integration.module.js";
import { LoggerModule } from "./modules/logger/logger.module.js";

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
    IntegrationModule,
    GenerateModule,
    ValidateModule,
  ],
})
export class MainModule {}
