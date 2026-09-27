import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { MatrixService } from "../matrix/matrix.service";

import type { Code, CodeObject } from "../code/code.types";
import type { Matrix } from "../matrix/matrix.types";
import type { CharacteristicContext } from "./characteristics.types";

/**
 * Prepares the one {@link CharacteristicContext} every characteristic
 * evaluator reads, so the Code is parsed and decoded once per meander rather
 * than once per evaluator. Like `CharacteristicsService.measure`, it reduces
 * the Code to its smallest repeating unit first, so a Code drawn at two
 * repeats measures the same as the same Code drawn at one.
 *
 * The context's `code` is re-spelled from the decoded matrix, so every
 * evaluator reads lowercase digits exactly `rows × columns` long — the same
 * digits the legacy computation re-encoded before its grid predicates ran —
 * whatever casing or length the caller's parsed Code carried.
 */
@Injectable()
export class CharacteristicContextService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(MatrixService)
    private readonly matrixService: MatrixService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the context for exactly the Code given, with its digits re-spelled from its decoded matrix. */
  private build(code: CodeObject): CharacteristicContext {
    const matrix = this.matrixService.fromCode(code);

    return {
      code: { ...code, digits: this.spell(matrix) },
      columns: code.columns,
      matrix,
      rows: code.rows,
    };
  }

  /** Parses a formatted Code string, or passes an already parsed Code through. */
  private parse(code: Code | CodeObject): CodeObject {
    return typeof code === "string" ? this.codeService.parse(code) : code;
  }

  /** One lowercase hexadecimal digit per point, in reading order, worth `8` north, `4` south, `2` east, `1` west. */
  private spell(matrix: Matrix): string {
    return matrix
      .flatMap((row) =>
        row.map((point) =>
          (
            (point.north ? 8 : 0) +
            (point.south ? 4 : 0) +
            (point.east ? 2 : 0) +
            (point.west ? 1 : 0)
          ).toString(16),
        ),
      )
      .join("");
  }

  // 🌎 Public Methods

  /**
   * Builds the context for the repeating unit of a formatted Code string or
   * an already parsed Code.
   */
  public create(code: Code | CodeObject): CharacteristicContext {
    return this.build(this.codeService.reduceToUnit(this.parse(code)));
  }

  /**
   * Builds the context for a Code exactly as filed, without reducing it to
   * its repeating unit — for the one reading that depends on where the tile
   * is cut rather than on the unit, the canonical-phase scorer
   * `CharacteristicRegistryService.tileCrossingComponentDeltaCount`.
   */
  public createUnreduced(code: Code | CodeObject): CharacteristicContext {
    return this.build(this.parse(code));
  }
}
