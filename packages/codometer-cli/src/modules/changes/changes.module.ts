import { ChangesModule as CodometerChangesModule } from "@codometer/changes";
import { DocumentsModule, RenderModule } from "@codometer/output";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { ChangesCommand } from "./changes.command";

/** Wires the `changes` command that reports codometer's diff against main. */
@Module({
  controllers: [],
  exports: [ChangesCommand],
  imports: [
    CodometerChangesModule,
    DocumentsModule,
    LoggerModule,
    RenderModule,
  ],
  providers: [ChangesCommand],
})
export class ChangesModule {}
