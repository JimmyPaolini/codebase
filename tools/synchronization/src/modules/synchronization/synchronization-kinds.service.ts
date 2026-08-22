import { Injectable } from "@nestjs/common";

import {
  SYNCHRONIZATION_KIND_SEPARATOR,
  SYNCHRONIZATION_KIND_SET,
  SYNCHRONIZATION_KINDS,
} from "./synchronization.constants";

import type {
  SynchronizationKind,
  SynchronizationKindSelection,
} from "./synchronization.types";

/**
 * Reads a `--kinds` value into the synchronizations a run drives.
 *
 * Selection lives here rather than in a list a workflow file keeps, so which
 * synchronizations a pull request answers for is a property of the commands
 * themselves. A workflow naming them one by one goes stale the moment a
 * seventh is added, and goes stale silently.
 */
@Injectable()
export class SynchronizationKindsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** States what `--kinds` accepts, in front of whatever went wrong. */
  private describeAcceptedKinds(problem: string): string {
    return `${problem}. It takes a comma-separated set drawn from ${this.listAcceptedKinds()}, as in "--kinds ${SYNCHRONIZATION_KINDS.join(SYNCHRONIZATION_KIND_SEPARATOR)}".`;
  }

  /** Whether a written name is a kind a command can declare. */
  private isSynchronizationKind(name: string): name is SynchronizationKind {
    return SYNCHRONIZATION_KIND_SET.has(name);
  }

  /**
   * The accepted kinds as English rather than as an array.
   *
   * A third kind turned the old `join(" and ")` into prose no reader would have
   * written, and a message telling somebody what a flag takes is the last place
   * to make them work for it. `Intl.ListFormat` punctuates a list of any length
   * correctly with no branch of ours to get wrong — and no branch a fourth kind
   * would leave untested.
   */
  private listAcceptedKinds(): string {
    return new Intl.ListFormat("en", {
      style: "long",
      type: "conjunction",
    }).format(SYNCHRONIZATION_KINDS.map((kind) => `"${kind}"`));
  }

  /** Keeps the kinds `--kinds` knows and complains about the rest. */
  private validateKinds(
    names: string[],
    errors: string[],
  ): Set<SynchronizationKind> {
    const accepted = new Set<SynchronizationKind>();

    for (const name of names) {
      if (this.isSynchronizationKind(name)) {
        accepted.add(name);
        continue;
      }

      errors.push(
        this.describeAcceptedKinds(`--kinds does not accept "${name}"`),
      );
    }

    return accepted;
  }

  // 🌎 Public Methods

  /**
   * Reads the flag into the kinds this run drives.
   *
   * An absent flag selects every kind, because the flag narrows a run rather
   * than enabling one: somebody at a prompt asking to synchronize means all of
   * it. A flag carrying nothing is refused instead of read as "every kind" or
   * as "none": `--kinds "$SIDE"` with the variable unset would otherwise
   * either publish reports from a pull request or synchronize nothing at all
   * while reporting success.
   */
  public select(
    value: string | true | undefined,
  ): SynchronizationKindSelection {
    if (value === undefined) {
      return { errors: [], kinds: new Set(SYNCHRONIZATION_KINDS) };
    }

    const errors: string[] = [];
    const names =
      value === true
        ? []
        : value
            .split(SYNCHRONIZATION_KIND_SEPARATOR)
            .map((name) => name.trim())
            .filter((name) => name !== "");

    if (names.length === 0) {
      errors.push(this.describeAcceptedKinds("--kinds needs a value"));
      return { errors, kinds: new Set() };
    }

    return { errors, kinds: this.validateKinds(names, errors) };
  }
}
