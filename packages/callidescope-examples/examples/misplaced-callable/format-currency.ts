/**
 * A helper filed in the wrong module, and the report says where it belongs.
 *
 * Every caller lives in `receipt`, and none live here. That is what a
 * misplaced-callable finding is: enough callers to judge by, nearly all of them
 * in one other module of the same project, so the suggested move is concrete
 * rather than a hunch about cohesion.
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
