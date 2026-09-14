import { Module } from "@nestjs/common";

import { LatticeIdentificationModule } from "../lattice-identification/lattice-identification.module";
import { MeanderCharacteristicsModule } from "../meander-characteristics/meander-characteristics.module";
import { MeanderDatabaseModule } from "../meander-database/meander-database.module";
import { MeanderDecodingModule } from "../meander-decoding/meander-decoding.module";
import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MeanderRenderingModule } from "../meander-rendering/meander-rendering.module";
import { MosaicNamingModule } from "../mosaic-naming/mosaic-naming.module";
import { ParallelMotifModule } from "../parallel-motif/parallel-motif.module";

import { DrawCodeService } from "./draw-code.service";
import { DrawCombinationsService } from "./draw-combinations.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawNegativePermutationsService } from "./draw-negative-permutations.service";
import { DrawParametersService } from "./draw-parameters.service";
import { DrawPermutationsService } from "./draw-permutations.service";
import { DrawRenderingService } from "./draw-rendering.service";
import { DrawCommand } from "./draw.command";

/**
 * Registers the `draw` CLI command — the application's only command — the
 * service enumerating the space its sweep covers, the two services rendering
 * its permutation halves — one per family that has one — the service
 * rendering the index page all of them are looked through, the service that
 * turns its options into generation parameters, and the service that renders
 * one set of those parameters into a document and the addressed path it is
 * written to.
 *
 * `DrawCombinationsService` is exported because the meander charter's
 * property test sweeps the same enumeration, so the corpus written here and
 * the corpus gated there cannot drift apart.
 *
 * It imports `LatticeIdentificationModule` and `MosaicNamingModule` for the
 * two halves of a permutation's filename: the first spells the tile out, and
 * the second supplies the name its structure earns where it earns one — a
 * rule read off the tile rather than a label the tile carries, which is why
 * naming is a module the sweep asks rather than something the enumeration
 * hands over.
 *
 * It imports `ParallelMotifModule` for one reason: `serpentine`'s variant
 * space is not a cross product of its axes, and which rotations and flips
 * are distinct at a given ply is a fact about the geometry rather than about
 * the sweep. Asking `ParallelSerpentineService` is what keeps the corpus
 * from carrying the same drawing under several filenames.
 *
 * It also imports `MeanderCharacteristicsModule`, `MeanderDatabaseModule`,
 * `MeanderDecodingModule`, and `MeanderRenderingModule` for `DrawCodeService`'s
 * `--code` drawing mode: the generic decoder and renderer every family's Code
 * is now drawn through, the Characteristic computation that measures the same
 * decoded grid, and the committed sqlite database that mode persists a row
 * to, in place of the file `--type`/`--rows` still writes. `MeanderDatabaseModule`
 * always opens the one committed database file — a test exercising
 * `DrawCodeService` builds its own `TestingModule` against a temporary or
 * in-memory connection instead of importing this module.
 */
@Module({
  controllers: [],
  exports: [DrawCombinationsService, DrawCommand],
  imports: [
    LatticeIdentificationModule,
    MeanderCharacteristicsModule,
    MeanderDatabaseModule,
    MeanderDecodingModule,
    MeanderGenerationModule,
    MeanderRenderingModule,
    MosaicNamingModule,
    ParallelMotifModule,
  ],
  providers: [
    DrawCodeService,
    DrawCombinationsService,
    DrawCommand,
    DrawIndexService,
    DrawNegativePermutationsService,
    DrawParametersService,
    DrawPermutationsService,
    DrawRenderingService,
  ],
})
export class DrawModule {}
