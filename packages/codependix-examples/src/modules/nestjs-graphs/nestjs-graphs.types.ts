// 🏷️ Types

/**
 * One fixture project's exploration outcome.
 *
 * Modelled on `codependix-cli`'s split between `ProjectRunResult` and
 * `ProjectRunFailure`: a project either produced a graph or never got that
 * far, and the two must not be representable at once — which is what lets a
 * run report exactly which projects failed while completing every other one.
 */
export type FixtureExploration =
  | {
      readonly error: string;
      readonly name: string;
      readonly outcome: "failed";
    }
  | {
      readonly moduleCount: number;
      readonly name: string;
      readonly outcome: "explored";
    };
