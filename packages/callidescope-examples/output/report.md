<!-- CALL_STACKS_START -->

# 🔭 Callidescope

| Measure | Value |
| --- | --- |
| Callables | 69 |
| Files | 37 |
| Calls traced | 53 |
| Call stacks | 23 |
| Deepest stack | 8 |
| Stacks through recursion | 1 |
| Unfollowable calls | 2 |

## Call stacks over the depth limit (4)

**1. `ComputedMemberService.dispatch`** — depth ≥ 8 · orphan-root

```text
🚀 ComputedMemberService.dispatch(format: string): string [packages/callidescope-examples/src/modules/computed-member/computed-member.service.ts:56]
   ↳ Dispatches a report request to a handler named at runtime.
  └─> ComputedMemberService.read(format: string): string [packages/callidescope-examples/src/modules/computed-member/computed-member.service.ts:39]
     ↳ Reads the request's format and passes it on.
    └─> ComputedMemberService.normalize(format: string): string [packages/callidescope-examples/src/modules/computed-member/computed-member.service.ts:29]
       ↳ Normalizes the requested format before anything routes on it.
      └─> ComputedMemberService.route(format: string): string [packages/callidescope-examples/src/modules/computed-member/computed-member.service.ts:44]
         ↳ Routes the request one layer further down.
        └─> ComputedMemberService.select(format: string): string [packages/callidescope-examples/src/modules/computed-member/computed-member.service.ts:49]
           ↳ Selects the branch that prepares the format.
          └─> ComputedMemberService.prepare(format: string): string [packages/callidescope-examples/src/modules/computed-member/computed-member.service.ts:34]
             ↳ Prepares the format string the handler table is keyed by.
            └─> ComputedMemberService.choose(format: string): string [packages/callidescope-examples/src/modules/computed-member/computed-member.service.ts:24]
               ↳ Chooses a handler by name.
              └─> ComputedMemberService.apply(format: string): string [packages/callidescope-examples/src/modules/computed-member/computed-member.service.ts:19]
                 ↳ Applies the selected handler, whichever one that turns out to be.
```

**2. `DeepStackService.quote`** — depth 8 · orphan-root

```text
🚀 DeepStackService.quote(amount: number): number [packages/callidescope-examples/src/modules/deep-stack/deep-stack.service.ts:50]
   ↳ Quotes one order, priced through every stage below.
  └─> DeepStackService.validate(amount: number): number [packages/callidescope-examples/src/modules/deep-stack/deep-stack.service.ts:43]
     ↳ Rejects a negative amount before anything else reads it.
    └─> DeepStackService.removeDiscount(amount: number): number [packages/callidescope-examples/src/modules/deep-stack/deep-stack.service.ts:33]
       ↳ Removes the tier discount from the validated amount.
      └─> DeepStackService.resolveTier(amount: number): number [packages/callidescope-examples/src/modules/deep-stack/deep-stack.service.ts:38]
         ↳ Picks the pricing tier the discounted amount falls into.
        └─> DeepStackService.loadRate(amount: number, tier: number): number [packages/callidescope-examples/src/modules/deep-stack/deep-stack.service.ts:28]
           ↳ Looks up the tax rate the resolved tier pays.
          └─> DeepStackService.applyTax(amount: number, rate: number): number [packages/callidescope-examples/src/modules/deep-stack/deep-stack.service.ts:18]
             ↳ Adds tax at the resolved rate.
            └─> DeepStackService.convertCurrency(amount: number): number [packages/callidescope-examples/src/modules/deep-stack/deep-stack.service.ts:23]
               ↳ Converts to the reporting currency and rounds through the shared tail.
              └─> roundToCents(amount: number): number [packages/callidescope-examples/src/modules/shared-tail/shared-tail.utilities.ts:10]
                 ↳ The tail two of this package's deep stacks share.
```

**3. `ForwardingStackService.handle`** — depth 8 · orphan-root

```text
🚀 ForwardingStackService.handle(amount: number): number [packages/callidescope-examples/src/modules/forwarding-stack/forwarding-stack.service.ts:53]
   ↳ Handles one amount, through six layers that do nothing to it.
  └─> ForwardingStackService.process(amount: number): number [packages/callidescope-examples/src/modules/forwarding-stack/forwarding-stack.service.ts:41]
     ↳ Forwards, unchanged.
    └─> ForwardingStackService.execute(amount: number): number [packages/callidescope-examples/src/modules/forwarding-stack/forwarding-stack.service.ts:21]
       ↳ Forwards, unchanged.
      └─> ForwardingStackService.forward(amount: number): number [packages/callidescope-examples/src/modules/forwarding-stack/forwarding-stack.service.ts:31]
         ↳ Forwards, unchanged.
        └─> ForwardingStackService.perform(amount: number): number [packages/callidescope-examples/src/modules/forwarding-stack/forwarding-stack.service.ts:36]
           ↳ Forwards, unchanged.
          └─> ForwardingStackService.relay(amount: number): number [packages/callidescope-examples/src/modules/forwarding-stack/forwarding-stack.service.ts:46]
             ↳ Forwards, unchanged.
            └─> ForwardingStackService.finish(amount: number): number [packages/callidescope-examples/src/modules/forwarding-stack/forwarding-stack.service.ts:26]
               ↳ Rounds the amount, which is the only work on this path.
              └─> roundToCents(amount: number): number [packages/callidescope-examples/src/modules/shared-tail/shared-tail.utilities.ts:10]
                 ↳ The tail two of this package's deep stacks share.
```

<details>
<summary>1 more call stacks</summary>

**4. `FrameAnnotationsService.trace`** — depth 7 · orphan-root

```text
🚀 FrameAnnotationsService.trace(value: string): string [packages/callidescope-examples/src/modules/frame-annotations/frame-annotations.service.ts:91]
   ↳ Traces one value through every annotation shape below.
  └─> FrameAnnotationsService.render(value: number | string): string | string[] [packages/callidescope-examples/src/modules/frame-annotations/frame-annotations.service.ts:84]
     ↳ Renders one value for display, in the form its type calls for.
    └─> FrameAnnotationsService.summarize(rendered: string): string [packages/callidescope-examples/src/modules/frame-annotations/frame-annotations.service.ts:23]
       ↳ Collapses a rendered value to something a description can quote.
      └─> FrameAnnotationsService.describe({ count, name }: DescribeArguments): string [packages/callidescope-examples/src/modules/frame-annotations/frame-annotations.service.ts:60]
         ↳ Describes a value from a parameter with no name at all in the syntax.
        └─> FrameAnnotationsService.compose(description: string): string [packages/callidescope-examples/src/modules/frame-annotations/frame-annotations.service.ts:29]
           ↳ Joins the parts a description was built from.
          └─> FrameAnnotationsService.collapseThisSignatureBecauseItRunsLong(…): string [packages/callidescope-examples/src/modules/frame-annotations/frame-annotations.service.ts:49]
             ↳ Takes three parameters whose rendered signature runs past eighty characters, so the printed frame collapses it to `(…):…
            └─> FrameAnnotationsService.finish(description: string): string [packages/callidescope-examples/src/modules/frame-annotations/frame-annotations.service.ts:39]
               ↳ Finishes the chain and hands back what the layers above it built.
```

</details>

## Module spread

| Callable | Spread | Calls directly | Location |
| --- | --- | --- | --- |
| `ModuleSpreadService.orchestrate` | 6 | `packages/callidescope-examples:modules/base-class`, `packages/callidescope-examples:modules/callback-argument`, `packages/callidescope-examples:modules/constructed-class`, `packages/callidescope-examples:modules/injected-dependency`, `packages/callidescope-examples:modules/plain-call` | `packages/callidescope-examples/src/modules/module-spread/module-spread.service.ts:32` |

## Callables over the breadth limit (0)

None.

## Possibly misplaced

| Callable | Declared in | Called from | Callers |
| --- | --- | --- | --- |
| `formatCurrency` | `packages/callidescope-examples:modules/misplaced-callable` | `packages/callidescope-examples:modules/receipt` | 2/2 |

<!-- CALL_STACKS_END -->
