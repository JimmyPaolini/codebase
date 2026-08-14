import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants";
import { GenerateModule } from "./modules/generate/generate.module";
import { LoggerModule } from "./modules/logger/logger.module";
import { ValidateModule } from "./modules/validate/validate.module";

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
