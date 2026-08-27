# Implementation fan-out

**`sink.emit(line)` → nothing, because three candidates exceed a cap of two**

`maximumImplementationCandidates` is the primary noise control on structural
matching. A member named `emit`, `run`, or `sync` matches dozens of unrelated
classes in a real workspace, and expanding all of them manufactures call stacks
no execution ever takes.

Past the cap the **whole expansion is dropped**, not narrowed to a favorite —
picking one would be a guess presented as a fact — and the call is recorded as
unfollowable, so the run says it happened rather than quietly under-reporting.

The default is eight. This package sets it to two so three small classes
demonstrate the same behavior that would otherwise need nine.

Raise the cap and the three edges appear:
[`testing/findings.integration.test.ts`](../../testing/findings.integration.test.ts)
traces the fixtures a second time with the cap lifted and asserts exactly that,
which is the only way to show a cap doing something.

Compare with [`structural-interface`](../structural-interface), where one
implementation sits under the cap and resolves.
