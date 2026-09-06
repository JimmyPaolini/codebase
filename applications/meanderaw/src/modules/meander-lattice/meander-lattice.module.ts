import { Module } from "@nestjs/common";

import { MeanderLatticeService } from "./meander-lattice.service";

/**
 * Wires up the lattice vocabulary — the grid every rendered meander is drawn
 * on, and the reduction of a finished document back onto it.
 *
 * It is the one description of that grid the project keeps, and it is held
 * here rather than inside either side that speaks it. `MeanderTopologyModule`
 * measures a document by reducing it to a lattice; the motif modules
 * construct one and draw it. Neither is downstream of the other, and putting
 * the vocabulary in either would make it so.
 *
 * Nothing here depends on anything: a lattice is a grid, and it knows about
 * no family, no motif, and no measurement.
 */
@Module({
  controllers: [],
  exports: [MeanderLatticeService],
  imports: [],
  providers: [MeanderLatticeService],
})
export class MeanderLatticeModule {}
