# Constructed class

**`new ParserService(source)` → `ParserService.constructor`**

Construction is a call, and a constructor with a body is a frame like any other.
A constructor with no body is not — there is nothing to descend into, so
recording it would add a frame that no stack trace would ever show.

```text
🚀 ConstructedClassService.count(source: string): number
  └─> ParserService.constructor(source: string)
```
