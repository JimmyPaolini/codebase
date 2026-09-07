import { Module } from "@nestjs/common";

import { MosaicTileModule } from "../mosaic-tile/mosaic-tile.module";

import { LatticeIdentificationService } from "./lattice-identification.service";

/**
 * Wires up the naming of a lattice reading — the reading of one repeat unit
 * out of a rendered document, and the hexadecimal string that spells it out.
 *
 * It imports {@link MosaicTileModule} for the tile vocabulary a reading is
 * expressed in and for the symmetry group a canonical name is folded
 * through, and the direction that runs in is the whole of the arrangement:
 * `mosaic` knows nothing about this module, so its enumeration folds on the
 * symmetry service's own edge key rather than on a name. Depending the other
 * way as well would put the two modules in a cycle.
 *
 * `MeanderLatticeModule` is not imported. A reading is described by
 * `LatticeGraph`, which is a type rather than a service, so nothing here
 * depends on the reader at run time.
 */
@Module({
  controllers: [],
  exports: [LatticeIdentificationService],
  imports: [MosaicTileModule],
  providers: [LatticeIdentificationService],
})
export class LatticeIdentificationModule {}
