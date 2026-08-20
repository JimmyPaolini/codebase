import { readFileSync } from "node:fs";
import path from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";

import { Injectable, Logger } from "@nestjs/common";

import { BROTLI_OPTIONS, GZIP_LEVEL } from "./size-analysis.constants";

import type { AnalyzeSizeArguments, SizeResult } from "./size-analysis.types";
import type { CodometerCompression } from "@codometer/configuration";

/** Measures how many bytes a target's files occupy once compressed. */
@Injectable()
export class SizeAnalysisService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly logger = new Logger(SizeAnalysisService.name);

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Compresses one file's contents and reports the resulting byte count.
   *
   * Written as a lookup rather than a switch so that a compression added to
   * the configuration without an implementation here fails to compile, instead
   * of falling through to whichever branch happened to be last.
   */
  private compress(
    contents: Buffer,
    compression: CodometerCompression,
  ): number {
    const compressors: Record<CodometerCompression, () => number> = {
      brotli: () => brotliCompressSync(contents, BROTLI_OPTIONS).length,
      gzip: () => gzipSync(contents, { level: GZIP_LEVEL }).length,
      none: () => contents.length,
    };

    return compressors[compression]();
  }

  /**
   * Measures one file, or nothing when it cannot be read.
   *
   * A file can vanish between being matched and being read — a build running
   * beside the measurement is enough. Reporting the rest of the target is
   * worth more than abandoning the run over one file.
   */
  private measureFile(
    absolutePath: string,
    compression: CodometerCompression,
  ): number {
    try {
      return this.compress(readFileSync(absolutePath), compression);
    } catch (error: unknown) {
      this.logger.warn(`📦 Skipped unreadable file`, undefined, {
        path: absolutePath,
        reason: String(error),
      });
      return 0;
    }
  }

  // 🌎 Public Methods

  /**
   * Measures every file of a target and sums the results.
   *
   * Each file is compressed on its own. Compressing them together would let
   * one file's dictionary shrink the next, reporting a total smaller than
   * anything that will ever be transferred.
   */
  analyze(args: AnalyzeSizeArguments): SizeResult {
    let bytes = 0;

    for (const filePath of args.files) {
      bytes += this.measureFile(
        path.resolve(args.workingDirectory, filePath),
        args.compression,
      );
    }

    return { bytes, compression: args.compression, files: args.files.length };
  }
}
