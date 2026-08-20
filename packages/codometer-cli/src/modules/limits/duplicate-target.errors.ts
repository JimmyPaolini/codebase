// 🚨 Errors

/**
 * Raised when two measured targets answer to one name.
 *
 * A metric is addressed by its target's name, so a repeated name would make
 * every limit on either target land on whichever was indexed last. Configured
 * targets are checked for this when the configuration file is read; this
 * catches the same mistake in a configuration a host assembled itself.
 *
 * Only ever raised for a run that declares a limit. Two targets sharing a name
 * decide nothing where nothing is gated, and a measurement that gates nothing
 * is not this layer's to fail.
 */
export class DuplicateTargetError extends Error {
  constructor(target: string) {
    super(
      `Two measured targets are called "${target}". A limit addresses its metric by target name, so the name has to belong to one of them.`,
    );
    this.name = "DuplicateTargetError";
  }
}
