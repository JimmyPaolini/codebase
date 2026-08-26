import { Injectable } from "@nestjs/common";

/** One of three structural `LineSink` implementations, past the cap of two. */
@Injectable()
export class MemorySinkService {
  // 🔑 Public Fields

  /** Emits one line to the memory sink. */
  public readonly emit = (line: string): string => `memory:${line}`;
}
