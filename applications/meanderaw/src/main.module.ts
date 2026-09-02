import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { GenerateModule } from "./modules/generate/generate.module";
import { MeanderTopologyModule } from "./modules/meander-topology/meander-topology.module";
import { StartModule } from "./modules/start/start.module";

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
    // 🏛️ Carries no command of its own; registered so the charter measurement
    // is resolvable in `nx run meanderaw:repl`.
    MeanderTopologyModule,
    StartModule,
  ],
})
export class MainModule {}
