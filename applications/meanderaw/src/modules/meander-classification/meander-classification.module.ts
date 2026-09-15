import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";
import { MosaicNamingModule } from "../mosaic-naming/mosaic-naming.module";

import { MeanderClassificationService } from "./meander-classification.service";

/**
 * Registers the family classifier the lattice-first architecture needs: the
 * layer that says which family a tile belongs to from the tile's own
 * structure, where until now a family was whichever procedural motif service
 * had drawn the thing.
 *
 * It imports `MosaicNamingModule` because a sub-family is a predicate over
 * the lattice rather than a property of the `mosaic` family — see
 * `docs/adr/0007-address-every-meander-by-its-lattice.md`, which measured 85
 * drawings outside `mosaic` earning one — so the same rules name a region
 * for a tile of any family.
 */
@Module({
  controllers: [],
  exports: [MeanderClassificationService],
  imports: [CodeModule, MosaicNamingModule],
  providers: [MeanderClassificationService],
})
export class MeanderClassificationModule {}
