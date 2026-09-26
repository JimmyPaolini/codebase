import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { MatrixService } from "../matrix/matrix.service";

import type { Code, CodeObject } from "../code/code.types";
import type { CharacteristicContext } from "./characteristics.types";

/**
 * Prepares the one {@link CharacteristicContext} every characteristic
 * evaluator reads, so the Code is parsed and decoded once per meander rather
 * than once per evaluator. It measures the Code exactly as given — reducing
 * it to its repeating unit is the caller's decision, not this service's.
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

  /** Builds the context for a formatted Code string or an already parsed Code. */
  public create(code: Code | CodeObject): CharacteristicContext {
    const parsed =
      typeof code === "string" ? this.codeService.parse(code) : code;

    return {
      code: parsed,
      columns: parsed.columns,
      matrix: this.matrixService.fromCode(parsed),
      rows: parsed.rows,
    };
  }
}
