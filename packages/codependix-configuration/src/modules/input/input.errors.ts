// 💥 Errors

/**
 * Thrown when a command line cannot be turned into a run.
 *
 * One class rather than one per cause, because every cause is the same event
 * to whoever catches it: nothing was attempted, and the reader's next move is
 * to retype the flags rather than to read a stack trace. Only the wording
 * differs, so the wording is all the factories below vary.
 */
export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

/** A command line naming both `--check` and `--write`. */
export function conflictingRunModeError(): InputError {
  return new InputError("Only one of --check or --write may be given.");
}

/**
 * A required value that cannot be asked for, because stdin is not a terminal.
 *
 * A prompt written to a stream nobody is reading is worse than no prompt at
 * all: `prompts` draws its menu, never resolves, and the process exits 0
 * having done nothing — the silent green no-op this refuses to become.
 */
export function missingInputError(subject: string): InputError {
  return new InputError(
    `${subject} is required, and stdin is not a terminal so it cannot be asked for.`,
  );
}

/**
 * A prompt someone dismissed without answering.
 *
 * Kept distinct in wording from a prompt that resolved to something
 * unrecognized: walking away from a question is an ordinary thing to do, and
 * reporting it as a crashed run sends the reader debugging when all they did
 * was press escape.
 */
export function promptCancelledError(subject: string): InputError {
  return new InputError(`${subject} was not chosen.`);
}
