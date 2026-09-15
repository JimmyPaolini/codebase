import { Module } from "@nestjs/common";

import { MosaicTileModule } from "../mosaic-tile/mosaic-tile.module";

import { CodeService } from "./code.service";

/**
 * Wires up the module that owns a meander's Code, in both directions.
 *
 * {@link MosaicTileModule} is the one import, and the direction it runs in is
 * the whole of the arrangement: spelling a tile out needs the tile
 * vocabulary and the symmetry group a canonical spelling is folded through,
 * while the enumeration folds its own walk on the symmetry service's edge
 * key rather than on a Code. Depending the other way as well would put the
 * two in a cycle.
 */
@Module({
  controllers: [],
  exports: [CodeService],
  imports: [MosaicTileModule],
  providers: [CodeService],
})
export class CodeModule {}
