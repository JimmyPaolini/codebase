import { Injectable } from "@nestjs/common";

import { BaseClassService } from "../base-class/base-class.service.js";
import { CallbackArgumentService } from "../callback-argument/callback-argument.service.js";
import { ConstructedClassService } from "../constructed-class/constructed-class.service.js";
import { OrdersService } from "../injected-dependency/orders.service.js";
import { PlainCallService } from "../plain-call/plain-call.service.js";

/**
 * A callable personally orchestrating five unrelated modules.
 *
 * Both halves of the finding are here. Its callees reach more modules than
 * `spreadThreshold` allows, and it calls five of them *directly* — so it is not
 * a caller that happens to sit above a large subtree, it is the place the
 * unrelated concerns are being joined together.
 */
@Injectable()
export class ModuleSpreadService {
  // 🏗 Dependency Injection

  constructor(
    private readonly baseClassService: BaseClassService,
    private readonly callbackArgumentService: CallbackArgumentService,
    private readonly constructedClassService: ConstructedClassService,
    private readonly ordersService: OrdersService,
    private readonly plainCallService: PlainCallService,
  ) {}

  // 🌎 Public Methods

  /** Touches five modules in one method, which is the finding. */
  public orchestrate(label: string): string {
    return [
      this.plainCallService.render(label),
      String(this.ordersService.place(3)),
      String(this.constructedClassService.count(label)),
      this.baseClassService.run(),
      ...this.callbackArgumentService.shoutAll([label]),
    ].join("/");
  }
}
