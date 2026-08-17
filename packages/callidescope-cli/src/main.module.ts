import { ConfigurationModule } from "@callidescope/configuration";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { CallidescopeModule } from "./modules/callidescope/callidescope.module";

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
    LoggerModule,
    CallidescopeModule,
    ConfigurationModule,
  ],
})
export class MainModule {}
