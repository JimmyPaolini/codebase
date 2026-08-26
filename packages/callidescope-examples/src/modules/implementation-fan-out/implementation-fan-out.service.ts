import { Injectable } from "@nestjs/common";

import type { LineSink } from "./implementation-fan-out.types.js";

/**
 * Shows what `maximumImplementationCandidates` is protecting against.
 *
 * Three classes in this module satisfy `LineSink` structurally, and this
 * package caps the expansion at two. A member named `emit`, `run`, or `sync`
 * matches dozens of unrelated classes in a real workspace, and expanding all of
 * them manufactures call stacks no execution ever takes — so the cap drops the
 * whole expansion rather than picking a favorite.
 */
@Injectable()
export class ImplementationFanOutService {
  // 🌎 Public Methods

  /** Emits one line through whichever sink was handed in. */
  public write(sink: LineSink, line: string): string {
    return sink.emit(line);
  }
}
