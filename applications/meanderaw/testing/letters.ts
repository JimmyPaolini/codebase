import { CharacteristicContextService } from "../src/modules/characteristics/characteristic-context.service";
import { LetterUtilitiesService } from "../src/modules/characteristics/submatrix/letter/letter-utilities.service";
import { LETTER_ORIENTATION_NAMES } from "../src/modules/characteristics/submatrix/letter/letter.constants";
import { SubmatrixUtilitiesService } from "../src/modules/characteristics/submatrix/submatrix-utilities.service";
import { CodeModule } from "../src/modules/code/code.module";
import { MatrixModule } from "../src/modules/matrix/matrix.module";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
  SubmatrixWindow,
} from "../src/modules/characteristics/characteristics.types";
import type { LetterOrientationName } from "../src/modules/characteristics/submatrix/letter/letter.types";
import type { ModuleMetadata, Type } from "@nestjs/common";

/**
 * Compiles one letter service for its unit test and reads its sixteen
 * orientation evaluators back by name, so each letter's test states only its
 * own fixtures: every distinct orientation drawn as a Code holding one
 * isolated copy, beside every orientation name that draws that ink.
 */

// 🏷️ Types

/** One alias of a letter, and every orientation name drawing the ink it reads as. */
export interface LetterAliasFixture {
  readonly alias: string;
  readonly names: readonly LetterOrientationName[];
}

/** A compiled letter service's evaluators, read by orientation name. */
export interface LetterHarness {
  /** Compiles the letter service; the letter's test runs it in `beforeAll`. */
  compile(): Promise<void>;
  /** Each orientation's count of a fixture's ink, in orientation-name order. */
  counts(
    fixture: string,
  ): readonly (readonly [LetterOrientationName, number])[];
  /** The span of a fixture's inked points, in lattice points. */
  inkedWindow(fixture: string): SubmatrixWindow;
  /** Every evaluator's metadata key, in orientation-name order. */
  keys(): readonly string[];
  /** Every evaluator's `letter` mark, in orientation-name order. */
  marks(): readonly (true | undefined)[];
  /** The orientation names whose descriptions mention `text`, in orientation-name order. */
  namesDescribing(text: string): readonly LetterOrientationName[];
  /** The declared window of each named orientation. */
  windows(
    names: readonly LetterOrientationName[],
  ): readonly (SubmatrixWindow | undefined)[];
}

/**
 * Compiles a testing module — `Test.createTestingModule(metadata).compile()`
 * — passed in by the letter's test, which owns the Nest testing dependency.
 */
export type LetterModuleCompiler = (
  metadata: ModuleMetadata,
) => Promise<{ resolve<T>(type: Type<T>): Promise<T> }>;

/** One distinct orientation of a letter: a Code holding one isolated copy of its ink, and every orientation name drawing that ink. */
export interface LetterOrientationFixture {
  readonly fixture: string;
  readonly names: readonly LetterOrientationName[];
}

// 🌎 Utilities

/** The counts a fixture should get: one under each name that draws its ink and zero under every other, in orientation-name order. */
export function expectedCounts(
  names: readonly LetterOrientationName[],
): readonly (readonly [LetterOrientationName, number])[] {
  return LETTER_ORIENTATION_NAMES.map((name) => [
    name,
    names.includes(name) ? 1 : 0,
  ]);
}

/** Reads `service`'s evaluators back by orientation name once its `compile` — run by the test's `beforeAll` — has compiled it with `compileModule`. */
export function letterHarness(
  service: Type<CharacteristicEvaluatorGroup<number>>,
  compileModule: LetterModuleCompiler,
): LetterHarness {
  let contextService: CharacteristicContextService;
  let evaluators: readonly CharacteristicEvaluator<number>[] = [];

  const compile = async (): Promise<void> => {
    const module = await compileModule({
      imports: [CodeModule, MatrixModule],
      providers: [
        CharacteristicContextService,
        LetterUtilitiesService,
        SubmatrixUtilitiesService,
        service,
      ],
    });

    contextService = await module.resolve(CharacteristicContextService);
    const group = await module.resolve(service);
    evaluators = group.evaluators;
  };

  const named = (
    name: LetterOrientationName,
  ): CharacteristicEvaluator<number> | undefined =>
    evaluators[LETTER_ORIENTATION_NAMES.indexOf(name)];

  return {
    compile,
    counts: (fixture) => {
      const context = contextService.create(fixture);
      return LETTER_ORIENTATION_NAMES.map((name) => [
        name,
        named(name)?.compute(context) ?? -1,
      ]);
    },
    inkedWindow: (fixture) => {
      const inked = contextService
        .create(fixture)
        .matrix.flatMap((points, row) =>
          points.flatMap((point, column) =>
            Object.values(point).includes(true) ? [{ column, row }] : [],
          ),
        );
      return {
        columns: new Set(inked.map(({ column }) => column)).size,
        rows: new Set(inked.map(({ row }) => row)).size,
      };
    },
    keys: () => evaluators.map(({ metadata }) => metadata.key),
    marks: () => evaluators.map(({ metadata }) => metadata.letter),
    namesDescribing: (text) =>
      LETTER_ORIENTATION_NAMES.filter(
        (name) => named(name)?.metadata.description.includes(text) === true,
      ),
    windows: (names) => names.map((name) => named(name)?.metadata.submatrix),
  };
}
