import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants";
import { GenerateModule } from "./modules/commands/generate/generate.module";
import { ValidateModule } from "./modules/commands/validate/validate.module";
import { LoggerModule } from "./modules/logger/logger.module";

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
    GenerateModule,
    ValidateModule,
  ],
})
export class MainModule {}
