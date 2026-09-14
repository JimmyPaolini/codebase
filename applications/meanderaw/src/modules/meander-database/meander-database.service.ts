import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Meander } from "./entities/Meander.entity";

import type { MeanderRecord } from "./meander-database.types";

/**
 * Persists meanders to the committed sqlite database. Holds no decoding or
 * rendering logic of its own — every field it writes arrives already
 * computed, so this is the one seam between the generic rendering pipeline
 * and TypeORM.
 */
@Injectable()
export class MeanderDatabaseService {
  // 🏗 Dependency Injection

  constructor(
    @InjectRepository(Meander)
    private readonly meanderRepository: Repository<Meander>,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Writes one meander row, letting the database assign its `id`.
   *
   * Refuses — by rejecting, through the `code` column's own unique
   * constraint, rather than by checking here — a `code` a row already
   * committed carries, since a Code is a meander's whole identity and two
   * rows sharing one would mean the same meander was recorded twice.
   */
  async save(record: MeanderRecord): Promise<Meander> {
    return this.meanderRepository.save(record);
  }
}
