import { Module } from "@nestjs/common";

import { LatticeIdentificationModule } from "../lattice-identification/lattice-identification.module";
import { MosaicTileModule } from "../mosaic-tile/mosaic-tile.module";

import { MeanderEnumerationService } from "./meander-enumeration.service";

/**
 * Registers the generalized enumerator: the one walk over the lattice's own
 * unit space, run for every family rather than only for `mosaic`.
 *
 * It imports `MosaicTileModule` for that walk and `LatticeIdentificationModule`
 * for the spelling, both unchanged. Neither is generalized in place: the
 * walk was never about `mosaic` to begin with — see
 * `MeanderEnumerationService`'s own doc comment — and the encoding belongs
 * to the lattice rather than to any region of it, which
 * `LatticeIdentificationService` already says of itself.
 */
@Module({
  controllers: [],
  exports: [MeanderEnumerationService],
  imports: [LatticeIdentificationModule, MosaicTileModule],
  providers: [MeanderEnumerationService],
})
export class MeanderEnumerationModule {}
