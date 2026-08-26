// 🏷️ Types

/** A sink with more implementations than the configured cap allows. */
export interface LineSink {
  emit: (line: string) => string;
}
