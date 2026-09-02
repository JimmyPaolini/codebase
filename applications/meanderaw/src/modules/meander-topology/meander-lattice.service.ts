import { Injectable } from "@nestjs/common";

import {
  GRID_PITCH_IN_STROKE_WIDTHS,
  LATTICE_TOLERANCE_FRACTION,
  OffLatticeCoordinateError,
  PATH_DATA_PATTERN,
  PATH_TOKEN_PATTERN,
  PATH_UNSUPPORTED_CHARACTER_PATTERN,
  STROKE_WIDTH_PATTERN,
  SUPPORTED_PATH_COMMANDS,
  SVG_HEIGHT_PATTERN,
  SVG_WIDTH_PATTERN,
  UnmeasurableDocumentError,
  UnsupportedPathCommandError,
} from "./meander-topology.constants";

import type {
  LatticeDraft,
  LatticeGraph,
  LatticeScale,
  LatticeSpan,
  PathCommand,
  PathCommandGroup,
} from "./meander-topology.types";

/**
 * Reads a rendered meander back onto the grid it was drawn on.
 *
 * Every coordinate in the corpus is `strokeWidth / 2 + n × 2 × strokeWidth`,
 * because the space-filling invariant fixes the white channel at one stroke
 * width and so fixes the grid pitch at two. That is the whole derivation: a
 * document's own `stroke-width` and canvas dimensions recover its lattice,
 * with no help from whatever produced it.
 *
 * Nothing here interprets the drawing. It reduces the document to which
 * one-pitch steps carry ink and which lattice points are painted, and
 * refuses whatever it cannot reduce — a curve, a diagonal, a second stroke
 * width, a coordinate off the grid — rather than reporting a number nobody
 * should trust.
 */
@Injectable()
export class MeanderLatticeService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Marks the one-pitch steps and lattice points a horizontal run paints across `row`. */
  private addHorizontal(
    draft: LatticeDraft,
    row: number,
    columns: LatticeSpan,
  ): void {
    const first = Math.min(columns.from, columns.to);
    const last = Math.max(columns.from, columns.to);

    draft.nodes.add(this.key(first, row));
    draft.nodes.add(this.key(last, row));

    for (let column = first; column < last; column += 1) {
      draft.horizontalEdges.add(this.key(column, row));
      draft.nodes.add(this.key(column + 1, row));
    }
  }

  /** Marks the one-pitch steps and lattice points a vertical run paints down `column`. */
  private addVertical(
    draft: LatticeDraft,
    column: number,
    rows: LatticeSpan,
  ): void {
    const first = Math.min(rows.from, rows.to);
    const last = Math.max(rows.from, rows.to);

    draft.nodes.add(this.key(column, first));
    draft.nodes.add(this.key(column, last));

    for (let row = first; row < last; row += 1) {
      draft.verticalEdges.add(this.key(column, row));
      draft.nodes.add(this.key(column, row + 1));
    }
  }

  /** Turns one command letter and the coordinates that followed it into a {@link PathCommand}, refusing any other coordinate count. */
  private command(group: PathCommandGroup): PathCommand {
    const [first, second, third] = group.values;

    if (first === undefined || third !== undefined) {
      throw new UnmeasurableDocumentError(
        `command "${group.letter}" carries ${group.values.length} coordinates`,
      );
    }

    if (group.letter === "M") {
      if (second === undefined) {
        throw new UnmeasurableDocumentError("a move takes two coordinates");
      }

      return { command: "M", x: first, y: second };
    }

    if (second !== undefined) {
      throw new UnmeasurableDocumentError(
        `a ${group.letter} command takes one coordinate`,
      );
    }

    return group.letter === "H"
      ? { command: "H", x: first }
      : { command: "V", y: first };
  }

  /** Every command one path's `d` attribute draws, in order. */
  private commands(pathData: string): PathCommand[] {
    return this.groups(pathData).map((group) => this.command(group));
  }

  /** One of the root `<svg>` element's declared dimensions, refusing a document that omits it. */
  private dimension(document: string, pattern: RegExp): number {
    const declared = Number(pattern.exec(document)?.[1]);

    if (!Number.isFinite(declared)) {
      throw new UnmeasurableDocumentError(
        "the root element declares no width or height",
      );
    }

    return declared;
  }

  /** Splits path data into one group per command letter, each carrying the coordinates that followed it. */
  private groups(pathData: string): PathCommandGroup[] {
    const unsupported = PATH_UNSUPPORTED_CHARACTER_PATTERN.exec(pathData);

    if (unsupported) {
      throw new UnsupportedPathCommandError(unsupported[0]);
    }

    const groups: PathCommandGroup[] = [];

    for (const match of pathData.matchAll(PATH_TOKEN_PATTERN)) {
      const current = groups.at(-1);

      if (SUPPORTED_PATH_COMMANDS.includes(match[0])) {
        groups.push({ letter: match[0], values: [] });
      } else if (current === undefined) {
        throw new UnmeasurableDocumentError(
          `path data "${pathData}" begins with a coordinate`,
        );
      } else {
        current.values.push(Number(match[0]));
      }
    }

    return groups;
  }

  /** The `"column,row"` key a lattice point or one-pitch step is recorded under. */
  private key(column: number, row: number): string {
    return `${column},${row}`;
  }

  /** Every path's `d` attribute, in document order. */
  private pathData(document: string): string[] {
    return [...document.matchAll(PATH_DATA_PATTERN)].map((match) => match[0]);
  }

  /** The lattice index a raw coordinate sits at, refusing one that is not on a lattice line. */
  private snap(value: number, scale: LatticeScale): number {
    const index = (value - scale.origin) / scale.pitch;

    if (Math.abs(index - Math.round(index)) > LATTICE_TOLERANCE_FRACTION) {
      throw new OffLatticeCoordinateError(value, scale.pitch);
    }

    return Math.round(index);
  }

  /** The one stroke width the whole document is drawn at, refusing a document that declares none or more than one. */
  private strokeWidth(document: string): number {
    const declared = new Set(
      [...document.matchAll(STROKE_WIDTH_PATTERN)].map((match) =>
        Number(match[1]),
      ),
    );
    const [strokeWidth] = [...declared];

    if (declared.size !== 1 || strokeWidth === undefined || strokeWidth <= 0) {
      throw new UnmeasurableDocumentError(
        `expected exactly one positive stroke width, found ${declared.size}`,
      );
    }

    return strokeWidth;
  }

  /** Walks one path's commands, marking everything they paint onto `draft`. */
  private trace(
    draft: LatticeDraft,
    commands: readonly PathCommand[],
    scale: LatticeScale,
  ): void {
    let column = 0;
    let row = 0;

    for (const command of commands) {
      if (command.command === "M") {
        column = this.snap(command.x, scale);
        row = this.snap(command.y, scale);
      } else if (command.command === "H") {
        const to = this.snap(command.x, scale);

        this.addHorizontal(draft, row, { from: column, to });
        column = to;
      } else {
        const to = this.snap(command.y, scale);

        this.addVertical(draft, column, { from: row, to });
        row = to;
      }
    }
  }

  // 🌎 Public Methods

  /** Reduces a rendered meander to the lattice steps and points its ink paints. */
  build(document: string): LatticeGraph {
    const strokeWidth = this.strokeWidth(document);
    const pitch = strokeWidth * GRID_PITCH_IN_STROKE_WIDTHS;
    const coordinates: LatticeScale = { origin: strokeWidth / 2, pitch };
    const extents: LatticeScale = { origin: strokeWidth, pitch };
    const draft: LatticeDraft = {
      horizontalEdges: new Set<string>(),
      nodes: new Set<string>(),
      verticalEdges: new Set<string>(),
    };

    for (const pathData of this.pathData(document)) {
      this.trace(draft, this.commands(pathData), coordinates);
    }

    return {
      columns: this.snap(this.dimension(document, SVG_WIDTH_PATTERN), extents),
      horizontalEdges: draft.horizontalEdges,
      nodes: draft.nodes,
      rows: this.snap(this.dimension(document, SVG_HEIGHT_PATTERN), extents),
      verticalEdges: draft.verticalEdges,
    };
  }
}
