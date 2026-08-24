// 🚨 Errors

/**
 * Raised when a file a target matched cannot be read.
 *
 * Louder than the unreadable *directory* discovery tolerates, and deliberately
 * so: a directory nobody can read narrows what was measured, while a matched
 * file nobody can read makes the reported total wrong by definition. Size
 * analysis exists to gate, and a number quietly short by one file lets a real
 * breach pass.
 */
export class UnreadableTargetFileError extends Error {
  constructor(filePath: string, reason: string) {
    super(`Cannot measure ${filePath}: ${reason}`);
    this.name = "UnreadableTargetFileError";
  }
}
