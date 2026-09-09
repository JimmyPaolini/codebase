import { Module } from "@nestjs/common";

import { MeanderLatticeModule } from "../meander-lattice/meander-lattice.module";
import { MosaicNamingModule } from "../mosaic-naming/mosaic-naming.module";
import { MosaicTileModule } from "../mosaic-tile/mosaic-tile.module";

import { LatticeIdentificationService } from "./lattice-identification.service";

/**
 * Wires up the naming of a lattice reading — the reading of one repeat unit
 * out of a rendered document, and the hexadecimal string that spells it out.
 *
 * It imports {@link MeanderLatticeModule} for the reader that reduces a
 * document to its ink, {@link MosaicNamingModule} for the structural
 * predicates that earn a reading a sub-family name, and
 * {@link MosaicTileModule} for the tile vocabulary a reading is expressed in
 * and the symmetry group a canonical name is folded through.
 *
 * The direction all three run in is the whole of the arrangement. `mosaic`
 * knows nothing about this module, so its enumeration folds on the symmetry
 * service's own edge key rather than on a name; the reader knows nothing
 * about tiles, so it can be trusted to refuse a document this module would
 * otherwise address wrongly; and the naming rules consult no family, so they
 * answer for a reading of any of them. Depending the other way as well would
 * put those modules in a cycle.
 */
@Module({
  controllers: [],
  exports: [LatticeIdentificationService],
  imports: [MeanderLatticeModule, MosaicNamingModule, MosaicTileModule],
  providers: [LatticeIdentificationService],
})
export class LatticeIdentificationModule {}
