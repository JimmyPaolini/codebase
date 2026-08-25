/** Thrown when a modifier's `name` isn't listed as compatible with the requested type. */
export class InvalidModifierError extends Error {
  constructor(
    modifierName: string,
    type: string,
    compatibleModifierNames: readonly string[],
  ) {
    super(
      `modifier "${modifierName}" is not compatible with type "${type}"; compatible modifiers: ${
        compatibleModifierNames.length > 0
          ? compatibleModifierNames.join(", ")
          : "none"
      }`,
    );
    this.name = "InvalidModifierError";
  }
}
