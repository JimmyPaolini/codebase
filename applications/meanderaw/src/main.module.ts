import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { LoggerModule } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { DrawModule } from "./modules/draw/draw.module";
import { LatticeIdentificationModule } from "./modules/lattice-identification/lattice-identification.module";
import { MeanderTopologyModule } from "./modules/meander-topology/meander-topology.module";

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
    DrawModule,
    // 🏛️ Neither carries a command of its own. Both are registered so the
    // reading of a *finished drawing* — the parser that reduces a document to
    // its ink, the window of it an address names, and the charter measurement
    // over the same lattice — stays resolvable in `nx run meanderaw:repl`.
    //
    // Nothing in the sweep reaches them: a meander is a Code, and every row is
    // built by reading one rather than by reading a drawing back. They are
    // kept because the historical extraction is the one thing that still has
    // to go the other way, from the drawings this project started from to the
    // Codes that name them.
    LatticeIdentificationModule,
    MeanderTopologyModule,
  ],
})
export class MainModule {}
