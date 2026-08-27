# Base class

**`super.run()` → `BaseTaskService.run`**

An override calling up into what it overrode. The frame recorded is the base
declaration the checker resolves to, not the override making the call — so a
stack shows where the work actually happens.

```text
🚀 BaseClassService.run(): string
  └─> BaseTaskService.run(): string
```
