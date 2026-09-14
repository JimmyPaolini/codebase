import { InputModule } from "@callidescope/configuration";
import { GraphModule } from "@callidescope/graph";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { AddressLookupModule } from "../address-lookup/address-lookup.module";
import { AddressReportModule } from "../address-report/address-report.module";

import { BreadthCommand } from "./breadth.command";

/**
 * NestJS module that wires the `breadth` command.
 */
@Module({
  controllers: [],
  exports: [BreadthCommand],
  imports: [
    AddressLookupModule,
    AddressReportModule,
    GraphModule,
    InputModule,
    LoggerModule,
  ],
  providers: [BreadthCommand],
})
export class BreadthModule {}
