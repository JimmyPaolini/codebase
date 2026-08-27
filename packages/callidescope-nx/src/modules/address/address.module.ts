import { AddressLookupModule, AddressReportModule } from "@callidescope/cli";
import { GraphModule } from "@callidescope/graph";
import { Module } from "@nestjs/common";

import { AddressService } from "./address.service";

/** Provides the `depth` and `breadth` lookups the executors run. */
@Module({
  controllers: [],
  exports: [AddressService],
  imports: [AddressLookupModule, AddressReportModule, GraphModule],
  providers: [AddressService],
})
export class AddressModule {}
