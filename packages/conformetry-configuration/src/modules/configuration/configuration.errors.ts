/**
 * Raised when the configuration path points to an unsupported file type.
 */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}
