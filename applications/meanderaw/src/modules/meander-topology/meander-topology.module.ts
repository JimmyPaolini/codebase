import { Module } from "@nestjs/common";

import { MeanderLatticeService } from "./meander-lattice.service";
import { MeanderTopologyService } from "./meander-topology.service";

/**
 * Wires up the charter measurement, which reads a finished SVG and reports
 * its channel widths and junction counts. It depends on no motif service and
 * on nothing that generates: it sits downstream of the whole drawing
 * pipeline and consumes only its output, which is what lets it measure a
 * document this application did not produce.
 */
@Module({
  controllers: [],
  exports: [MeanderTopologyService],
  imports: [],
  providers: [MeanderLatticeService, MeanderTopologyService],
})
export class MeanderTopologyModule {}
