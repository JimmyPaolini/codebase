// 🏷️ Types

/**
 * One document the sweep wrote, as the index page lists it: the directory it
 * landed in, relative to the output directory, and its filename within that
 * directory. Both halves of the sweep produce this shape, so the page lists
 * them together without knowing which half produced what.
 */
export interface OutputDocument {
  readonly directory: string;
  readonly fileName: string;
}

/** One drawing ready to be written: where it goes, and the document itself. */
export interface RenderedDocument extends OutputDocument {
  readonly svg: string;
}

/** Parsed `start` command options, ready to feed both sweeps. */
export interface StartCommandOptions {
  outputDirectory: string;
}
