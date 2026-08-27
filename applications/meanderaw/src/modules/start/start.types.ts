// 🏷️ Types

/** One swept mosaic, as the file it is written to and the identifier naming its tile. */
export interface PermutedMosaic {
  readonly columns: number;
  readonly fileName: string;
  readonly identifier: string;
  readonly rows: number;
  readonly svg: string;
}

/** Parsed `start` command options, ready to feed both sweeps. */
export interface StartCommandOptions {
  outputDirectory: string;
}
