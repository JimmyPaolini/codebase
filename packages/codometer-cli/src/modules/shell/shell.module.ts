import { Module } from "@nestjs/common";

import { ShellService } from "./shell.service";

/**
 * NestJS module that provides Shell source analysis.
 */
@Module({
  controllers: [],
  exports: [ShellService],
  imports: [],
  providers: [ShellService],
})
export class ShellModule {}
