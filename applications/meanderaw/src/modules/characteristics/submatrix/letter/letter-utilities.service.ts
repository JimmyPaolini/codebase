import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  LetterCorner,
  LetterOrientation,
  LetterOrientationName,
  LetterRotation,
  LetterScript,
} from "./letter.types";

/**
 * The orientation arithmetic every letter shares: flipping a glyph template
 * either way, turning it clockwise, naming the sixteen corner and rotation
 * orientations, and reading each script's base corner. A letter holds one
 * base template and asks `orientations` for the other fifteen.
 */
@Injectable()
export class LetterUtilitiesService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  /** Each script's reading direction, the corner its glyphs face before any flip. */
  private readonly baseCorners: Readonly<Record<LetterScript, LetterCorner>> = {
    Greek: "Southeast",
    Hangul: "Southeast",
    Hanzi: "Southeast",
    Hebrew: "Southwest",
    Katakana: "Southeast",
    Latin: "Southeast",
  };

  /** The four corners, in the order orientations are enumerated. */
  private readonly corners: readonly LetterCorner[] = [
    "Southeast",
    "Southwest",
    "Northeast",
    "Northwest",
  ];

  /** How many clockwise quarter turns each rotation makes. */
  private readonly quarterTurns: Readonly<Record<LetterRotation, number>> = {
    Half: 2,
    None: 0,
    Quarter: 1,
    ThreeQuarter: 3,
  };

  /** The four rotations, in the order each corner's orientations are enumerated. */
  private readonly rotations: readonly LetterRotation[] = [
    "None",
    "Quarter",
    "Half",
    "ThreeQuarter",
  ];

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** A template row's points, one character each — every template character is ASCII. */
  private characters(line: string): string[] {
    return Array.from({ length: line.length }, (_unused, column) =>
      line.charAt(column),
    );
  }

  /**
   * Rewrites a template digit's arms through `arms`, which maps each arm bit
   * — north 8, south 4, east 2, west 1 — to the bit it becomes. A blank `.`
   * stays blank.
   */
  private mapArms(
    character: string,
    arms: Readonly<Record<number, number>>,
  ): string {
    if (character === ".") {
      return ".";
    }

    const digit = Number.parseInt(character, 16);
    return [8, 4, 2, 1]
      .filter((arm) => (digit & arm) !== 0)
      .reduce((sum, arm) => sum + (arms[arm] ?? 0), 0)
      .toString(16);
  }

  /** The orientation name for a corner and rotation, with no word for `None`. */
  private orientationName(
    corner: LetterCorner,
    rotation: LetterRotation,
  ): LetterOrientationName {
    return rotation === "None" ? corner : `${corner}${rotation}`;
  }

  /** Pads every row of a template with blanks to its widest row. */
  private rectangular(template: readonly string[]): string[] {
    const width = Math.max(0, ...template.map((line) => line.length));
    return template.map((line) => line.padEnd(width, "."));
  }

  /**
   * Turns a template one quarter clockwise: its west column becomes its top
   * row, and each arm moves round — north to east, east to south, south to
   * west, west to north.
   */
  private turnQuarter(template: readonly string[]): string[] {
    const rows = this.rectangular(template);
    const width = rows[0]?.length ?? 0;
    return Array.from({ length: width }, (_unused, column) =>
      rows
        .map((line) =>
          this.mapArms(line.charAt(column), { 1: 8, 2: 4, 4: 1, 8: 2 }),
        )
        .toReversed()
        .join(""),
    );
  }

  // 🌎 Public Methods

  /** The corner a script's glyphs face before any flip: its reading direction. */
  public baseCorner(script: LetterScript): LetterCorner {
    return this.baseCorners[script];
  }

  /**
   * Mirrors a template east to west, swapping its east and west arms. Rows
   * come back padded with blanks to the widest row.
   */
  public flipHorizontally(template: readonly string[]): readonly string[] {
    return this.rectangular(template).map((line) =>
      this.characters(line)
        .toReversed()
        .map((character) => this.mapArms(character, { 1: 2, 2: 1, 4: 4, 8: 8 }))
        .join(""),
    );
  }

  /**
   * Mirrors a template north to south, swapping its north and south arms.
   * Rows come back padded with blanks to the widest row.
   */
  public flipVertically(template: readonly string[]): readonly string[] {
    return this.rectangular(template)
      .toReversed()
      .map((line) =>
        this.characters(line)
          .map((character) =>
            this.mapArms(character, { 1: 1, 2: 2, 4: 8, 8: 4 }),
          )
          .join(""),
      );
  }

  /**
   * The sixteen orientation names, every corner with every rotation:
   * `Southeast`, `SoutheastQuarter`, `SoutheastHalf`, `SoutheastThreeQuarter`,
   * then the same for Southwest, Northeast, and Northwest.
   */
  public orientationNames(): readonly LetterOrientationName[] {
    return this.corners.flatMap((corner) =>
      this.rotations.map((rotation) => this.orientationName(corner, rotation)),
    );
  }

  /**
   * A base template drawn in all sixteen orientations, in
   * {@link LetterUtilitiesService.orientationNames} order. Each corner flips
   * the base wherever it differs from the script's base corner — east–west
   * by a horizontal flip, north–south by a vertical flip — and the rotation
   * then turns the flipped glyph clockwise. Each carries the window its
   * template fills, columns and rows swapping on a quarter turn.
   */
  public orientations(
    template: readonly string[],
    script: LetterScript,
  ): readonly LetterOrientation[] {
    const base = this.baseCorner(script);
    return this.corners.flatMap((corner) => {
      const mirrored =
        corner.endsWith("east") === base.endsWith("east")
          ? template
          : this.flipHorizontally(template);
      const flipped =
        corner.startsWith("North") === base.startsWith("North")
          ? mirrored
          : this.flipVertically(mirrored);
      return this.rotations.map((rotation) => {
        const turned = this.turnClockwise(flipped, rotation);
        return {
          corner,
          name: this.orientationName(corner, rotation),
          rotation,
          template: turned,
          window: this.submatrixUtilitiesService.glyphWindow(turned),
        };
      });
    });
  }

  /**
   * Turns a template clockwise by `rotation`, carrying each arm round with
   * it; a quarter or three-quarter turn swaps its columns and rows.
   */
  public turnClockwise(
    template: readonly string[],
    rotation: LetterRotation,
  ): readonly string[] {
    return Array.from({ length: this.quarterTurns[rotation] }).reduce<
      readonly string[]
    >((turned) => this.turnQuarter(turned), this.rectangular(template));
  }
}
