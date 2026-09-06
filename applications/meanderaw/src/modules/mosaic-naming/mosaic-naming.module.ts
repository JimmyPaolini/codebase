import { Module } from "@nestjs/common";

import { MosaicMotifModule } from "../mosaic-motif/mosaic-motif.module";

import { MosaicNamingService } from "./mosaic-naming.service";

/**
 * Wires up the rules that name a `mosaic` tile.
 *
 * It sits above the family rather than inside it, and the arrow runs one
 * way: naming reads a tile, and nothing about building, enumerating, or
 * drawing one reads a name. That is what keeps a name an alias for a
 * recognized region rather than a property a tile carries around — and it is
 * why adding a name is adding a rule here rather than touching the space it
 * describes.
 */
@Module({
  controllers: [],
  exports: [MosaicNamingService],
  imports: [MosaicMotifModule],
  providers: [MosaicNamingService],
})
export class MosaicNamingModule {}
