import { Injectable } from "@nestjs/common";

/** One of three structural `LineSink` implementations, past the cap of two. */
@Injectable()
export class ConsoleSinkService {
  // 🔑 Public Fields

  /** Emits one line to the console sink. */
  public readonly emit = (line: string): string => `console:${line}`;
}
