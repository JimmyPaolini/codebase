/** Thrown when `repeatCount` isn't a whole multiple of a modifier's rotation cycle length. */
export class InvalidRepeatCountCycleError extends Error {
  constructor(repeatCount: number, cycleLength: number, modifierName: string) {
    super(
      `repeatCount must be a multiple of ${cycleLength} for modifier "${modifierName}", received ${repeatCount}`,
    );
    this.name = "InvalidRepeatCountCycleError";
  }
}
