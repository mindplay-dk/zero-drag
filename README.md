# `zero-drag`

A minimalist abstraction of drag-and-drop *interactions only - without* abstracting the effects. ([why?](#why))

**Features:**

  * Generates drag-and-drop event listeners exposing simple start/drag/drop hooks
  * Minimally abstracts dragged item and drop-target selection
  * Reports drag distances and target locations in various useful ways
  * Optional drag threshold (in pixels) before triggering your start hook
  * Optional delayed re-targeting (improves user experience by tracking user intent)
  * Small: just over 1K
  * Works basically anywhere
  * Written in Typescript: fully type-hinted

## Examples

TODO

## Install

To install in your project:

    npm install zero-drag --save

To import from Typescript:

```ts
import { makeListener } from "zero-drag";
```

Use auto-completion and refer to inline documentation for usage and API details.

<a name="why"></a>
## Why?

Because reasons:

  * Correctly implementing drag-and-drop interactions is difficult, error-prone and distracting.
  * Implementing the *effects* of those interactions is already easy - there's no reason to abstract that.
  * Cleanly separating the complexity of drag-and-drop from potentially complex effects make sense either way.
  * Avoiding the implementation of any effects makes this library useful in many contexts, including plain DOM as well as most view-libraries/frameworks.

## Alternatives

TODO
