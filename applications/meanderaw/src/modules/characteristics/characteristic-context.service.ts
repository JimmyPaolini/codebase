import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { MatrixService } from "../matrix/matrix.service";

import type { Code, CodeObject } from "../code/code.types";
import type { CharacteristicContext } from "./characteristics.types";

/**
 * Prepares the one {@link CharacteristicContext} every characteristic
 * evaluator reads, so the Code is parsed and decoded once per meander rather
 * than once per evaluator. Like `CharacteristicsService.measure`, it reduces
 * the Code to its smallest repeating unit first, so a Code drawn at two
 * repeats measures the same as the same Code drawn at one.
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

  // 🌎 Public Methods

  /**
   * Builds the context for the repeating unit of a formatted Code string or
   * an already parsed Code.
   */
  public create(code: Code | CodeObject): CharacteristicContext {
    const parsed =
      typeof code === "string" ? this.codeService.parse(code) : code;
    const unit = this.codeService.reduceToUnit(parsed);

    return {
      code: unit,
      columns: unit.columns,
      matrix: this.matrixService.fromCode(unit),
      rows: unit.rows,
    };
  }
}
