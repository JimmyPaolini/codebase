import { Module } from "@nestjs/common";

import { CodeModule } from "../code/code.module";
import { TileModule } from "../tile/tile.module";

import { ClassificationService } from "./classification.service";
import { SubFamilyService } from "./sub-family.service";

/**
 * Registers the family classifier the lattice-first architecture needs: the
 * layer that says which family a tile belongs to from the tile's own
 * structure, where until now a family was whichever procedural motif service
 * had drawn the thing.
 *
 * `SubFamilyService` sits beside it rather than in a module of its own,
 * because a sub-family is one more thing a tile's structure earns: a
 * predicate over the lattice rather than a property of the `mosaic` family —
 * see
 * `docs/adr/0007-address-every-meander-by-its-lattice.md`, which measured 85
 * drawings outside `mosaic` earning one — so the same rules name a region
 * for a tile of any family.
 */
@Module({
  controllers: [],
  exports: [ClassificationService, SubFamilyService],
  imports: [CodeModule, TileModule],
  providers: [ClassificationService, SubFamilyService],
})
export class ClassificationModule {}
