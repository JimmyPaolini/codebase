import { Injectable } from "@nestjs/common";

import { countIsolatedRectangles } from "./rectangle.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the horizontal rectangles of a Code — isolated rectangular rings of ink
 * wider than it is tall, measured in edges — as an M×N submatrix scan. A ring
 * is isolated when every point on it carries exactly its ring's arms, so a
 * divided or branched ring is not a rectangle; squares count toward neither
 * orientation.
 */
@Injectable()
export class HorizontalRectangleCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `horizontalRectangleCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of isolated rectangular rings of ink wider than it is tall, measured in edges.",
    formula: String.raw`\left|\{\, R \subseteq M : R \text{ an isolated rectangular ring},\ w(R) > h(R) \,\}\right|`,
    key: "horizontalRectangleCount",
    name: "Horizontal Rectangle Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the isolated rings whose width and height compare as `w > h`. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedRectangles(
      context.matrix,
      (width, height) => width > height,
    );
  }
}
