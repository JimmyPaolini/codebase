import { Module } from "@nestjs/common";

import { MeanderLatticeModule } from "../meander-lattice/meander-lattice.module";

import { MeanderTopologyService } from "./meander-topology.service";

/**
 * Wires up the charter measurement, which reads a finished SVG and reports
 * its channel widths and junction counts. It depends on no motif service and
 * on nothing that generates: it sits downstream of the whole drawing
 * pipeline and consumes only its output, which is what lets it measure a
 * document this application did not produce.
 *
 * {@link MeanderLatticeModule} is the one exception, and it is not one: a
 * lattice is the grid a document is read against rather than anything that
 * draws, so depending on it leaves this module's stance intact.
 */
@Module({
  controllers: [],
  exports: [MeanderTopologyService],
  imports: [MeanderLatticeModule],
  providers: [MeanderTopologyService],
})
export class MeanderTopologyModule {}
