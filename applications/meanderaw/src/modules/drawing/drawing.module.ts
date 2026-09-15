import { Module } from "@nestjs/common";

import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { GeometryModule } from "../geometry/geometry.module";
import { GraphModule } from "../graph/graph.module";
import { SvgModule } from "../svg/svg.module";
import { TileModule } from "../tile/tile.module";

import { AddressService } from "./address.service";
import { DrawingService } from "./drawing.service";
import { LatticeService } from "./lattice.service";
import { MeasurementService } from "./measurement.service";

/**
 * Wires up everything that concerns a meander as a **drawing**, in both
 * directions.
 *
 * {@link DrawingService} goes one way, from a Code to an SVG document.
 * {@link LatticeService} goes the other, reducing a finished document back
 * to the lattice points and one-pitch steps its ink paints — and refusing
 * anything it cannot read as that, a curve, a diagonal, a second stroke
 * width, a coordinate off the grid. {@link AddressService} names which
 * window of such a reading holds one repeat — reaching
 * {@link ClassificationModule} for the sub-family name that window's ink
 * earns where it earns one — and {@link MeasurementService} counts a
 * reading's channel widths and junctions.
 *
 * The two directions were two modules until the split between them was
 * looked at: reading a drawing back is the same subject as drawing one, and
 * putting the reader on the far side of a `lattice-` prefix only hid that
 * the addressing sat astride the line. What separates cleanly is the walk
 * over an adjacency, which knows nothing about drawings and lives in
 * {@link GraphModule}.
 *
 * **Only the rendering half is on the sweep's path.** A meander is a Code,
 * and every row is built by reading one rather than by reading a drawing.
 * The other half is kept because the historical corpus is the one thing that
 * still has to go that way, from the drawings this project started from to
 * the Codes that name them.
 */
@Module({
  controllers: [],
  exports: [AddressService, DrawingService, LatticeService, MeasurementService],
  imports: [
    ClassificationModule,
    CodeModule,
    GeometryModule,
    GraphModule,
    SvgModule,
    TileModule,
  ],
  providers: [
    AddressService,
    DrawingService,
    LatticeService,
    MeasurementService,
  ],
})
export class DrawingModule {}
