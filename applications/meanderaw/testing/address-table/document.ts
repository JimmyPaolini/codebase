import { BLOCK_END_MARKER, BLOCK_START_MARKER } from "./constants";

// 📄 Splicing

/**
 * Thrown when the README does not carry both markers, in that order.
 *
 * A run that appended the block instead would put a second copy of the table
 * beside the first and leave a check failing against whichever one it found,
 * so a missing marker is refused rather than repaired.
 */
export class MissingBlockMarkersError extends Error {
  constructor(reason: string) {
    super(`the README carries no lattice address block: ${reason}`);
    this.name = "MissingBlockMarkersError";
  }
}

/** Where the block starts and ends in a README, refusing anything that is not one marker followed by the other. */
const locateBlock = (readme: string): { end: number; start: number } => {
  const start = readme.indexOf(BLOCK_START_MARKER);
  const end = readme.indexOf(BLOCK_END_MARKER);

  if (start === -1) {
    throw new MissingBlockMarkersError(`no ${BLOCK_START_MARKER}`);
  }

  if (end === -1) {
    throw new MissingBlockMarkersError(`no ${BLOCK_END_MARKER}`);
  }

  if (end < start) {
    throw new MissingBlockMarkersError(
      `${BLOCK_END_MARKER} sits above ${BLOCK_START_MARKER}`,
    );
  }

  return { end: end + BLOCK_END_MARKER.length, start };
};

/** The block a README currently carries, markers included. */
export const extractBlock = (readme: string): string => {
  const { end, start } = locateBlock(readme);

  return readme.slice(start, end);
};

/** The README with its block replaced, and every byte outside the two markers left exactly as it was. */
export const spliceBlock = (readme: string, block: string): string => {
  const { end, start } = locateBlock(readme);

  return `${readme.slice(0, start)}${block}${readme.slice(end)}`;
};
