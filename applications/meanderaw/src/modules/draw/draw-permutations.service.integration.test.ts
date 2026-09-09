import { readdir } from "node:fs/promises";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { LatticeIdentificationService } from "../lattice-identification/lattice-identification.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-tile/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-tile/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-tile/mosaic-tiles.service";
import { OutputPathService } from "../svg-rendering/output-path.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { DrawPermutationsService } from "./draw-permutations.service";

// 🔧 Configuration

/** Where `DrawCommand` writes the corpus, and where it is committed. */
const OUTPUT_DIRECTORY = path.join(import.meta.dirname, "../../../output");

/**
 * How long reading the committed `mosaic` tree and rendering the whole
 * enumerated half in memory are given. The edge budget admits 8,551 tiles,
 * and every one is really rendered here — real work, declared the same way
 * `draw-permutations.service.unit.test.ts` declares its own.
 */
const FULL_SWEEP_TIMEOUT_MILLISECONDS = 120_000;

/**
 * Every committed `.svg` path beneath `directory`, relative to
 * `OUTPUT_DIRECTORY` and POSIX-separated, so it compares directly against
 * the paths {@link DrawPermutationsService.render} composes.
 */
const readCommittedSvgPaths = async (directory: string): Promise<string[]> => {
  const listing = await readdir(directory, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of listing) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      paths.push(...(await readCommittedSvgPaths(entryPath)));
    } else if (entry.name.endsWith(".svg")) {
      paths.push(
        path.relative(OUTPUT_DIRECTORY, entryPath).split(path.sep).join("/"),
      );
    }
  }

  return paths;
};

// 🧪 Tests

describe(DrawPermutationsService, () => {
  describe("against the committed mosaic corpus", () => {
    let service: DrawPermutationsService;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [
          DrawPermutationsService,
          GridGeometryService,
          MosaicNamingService,
          LatticeIdentificationService,
          MeanderLatticeService,
          MosaicSymmetryService,
          MosaicTileGenerationService,
          MosaicTileMotifService,
          MosaicTileService,
          MosaicTilesService,
          OutputPathService,
          SvgRenderingService,
        ],
      }).compile();

      service = await module.resolve(DrawPermutationsService);
    });

    // 🎯 This proves the acceptance criterion without regenerating a single
    // file: `render` is the exact composition `DrawCommand` writes `mosaic`
    // from, called here purely in memory, and diffed against what is
    // already committed. Nothing is written to disk, and nothing about the
    // committed tree is touched.
    it(
      "renders the mosaic half's paths byte-identical to the committed tree",
      async () => {
        const rendered = service
          .rowsSweep()
          .flatMap((rows) => service.render(rows))
          .map((document) => `${document.directory}/${document.fileName}`);

        const committed = await readCommittedSvgPaths(
          path.join(OUTPUT_DIRECTORY, "mosaic"),
        );

        expect(rendered.toSorted()).toStrictEqual(committed.toSorted());
      },
      FULL_SWEEP_TIMEOUT_MILLISECONDS,
    );
  });
});
