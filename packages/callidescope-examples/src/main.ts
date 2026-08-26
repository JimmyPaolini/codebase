import { InventoryService } from "./modules/injected-dependency/inventory.service.js";
import { OrdersService } from "./modules/injected-dependency/orders.service.js";

/**
 * The `module-bootstrap` entry-point kind.
 *
 * A function named `bootstrap` or `main` in `src/main.ts` is where a project
 * starts itself, so it is a root regardless of whether anything imports it.
 * This one is never executed — the package ships fixtures, not a program.
 */
export const bootstrap = (): number =>
  new OrdersService(new InventoryService()).place(3);
