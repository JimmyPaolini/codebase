import { Injectable } from "@nestjs/common";

import { formatCurrency } from "../misplaced-callable/format-currency.js";

/**
 * The module both of `formatCurrency`'s callers live in.
 *
 * Two callers is the configured minimum for judging placement at all, and both
 * of them being here is the whole of the majority the finding needs.
 */
@Injectable()
export class ReceiptService {
  // 🌎 Public Methods

  /** Renders one line of a receipt. */
  public renderLine(amount: number): string {
    return `1 × ${formatCurrency(amount)}`;
  }

  /** Renders the total line of a receipt. */
  public renderTotal(amount: number): string {
    return `Total ${formatCurrency(amount)}`;
  }
}
