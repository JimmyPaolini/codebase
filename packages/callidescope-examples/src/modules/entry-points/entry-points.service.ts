import { Get, Injectable } from "@nestjs/common";

/**
 * Two of the entry-point kinds, in the shapes a framework really calls.
 *
 * Neither method is called by anything in this package. Both are still roots,
 * and for stated reasons rather than as a fallback: one carries a configured
 * decorator, the other is a NestJS lifecycle hook. Each calls one helper so it
 * has a stack to appear in — a root with nothing below it is a root, but not
 * yet a call stack.
 */
@Injectable()
export class EntryPointsService {
  // 🔏 Private Methods

  /** Builds the body a decorated request handler answers with. */
  private buildReport(): string {
    return "report";
  }

  /** Does the work a lifecycle hook is called to do. */
  private prepareCache(): string {
    return "prepared";
  }

  // 🌎 Public Methods

  /** A lifecycle hook a framework calls — the `lifecycle` kind. */
  public onModuleInit(): string {
    return this.prepareCache();
  }

  /** A decorated method — the `decorated-method` kind. */
  @Get()
  public readReport(): string {
    return this.buildReport();
  }
}
