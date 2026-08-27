import { InputModule } from "@callidescope/configuration";
import { GraphModule } from "@callidescope/graph";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { AddressLookupModule } from "../address-lookup/address-lookup.module";
import { AddressReportModule } from "../address-report/address-report.module";

import { DepthCommand } from "./depth.command";

/**
 * NestJS module that wires the `depth` command.
 */
@Module({
  controllers: [],
  exports: [DepthCommand],
  imports: [
    AddressLookupModule,
    AddressReportModule,
    GraphModule,
    InputModule,
    LoggerModule,
  ],
  providers: [DepthCommand],
})
export class DepthModule {}
