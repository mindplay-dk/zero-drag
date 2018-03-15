# `zero-drag`

A minimalist abstraction of drag-and-drop *interactions only - without* abstracting the effects. ([why?](#why))

Purpose-built for custom in-app drag-and-drop UI - if you need to exchange data/files with the desktop,
this is not the library you're looking for.

**Features:**

  * Generates drag-and-drop event listeners exposing simple start/drag/drop hooks
  * Minimally abstracts dragged item and drop-target selection
  * Reports drag distances and target locations in various useful ways
  * Optional drag threshold (in pixels) before triggering your start hook
  * Optional delayed re-targeting (improves user experience by tracking user intent)
  * Small: just over 1K
  * Works basically anywhere
  * Written in Typescript: fully type-hinted

**TODO:** tests, touch events, exchanging files/data with the desktop? (contributions welcome.)

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

Some alternative libs and how they differ:

  * [`dragula`](https://www.npmjs.com/package/dragula) - more high-level library implementing things like sort-order
    and visual effects; bridges to React and Angular.
  * [`drag-on-drop`](https://www.npmjs.com/package/drag-on-drop) - larger, more high-level library implementing sortable
    lists and trees; bridge to React.
  * [`drag-drop`](https://www.npmjs.com/package/drag-drop) - uses HTML5 `drag`-events - if you need to exchange data
    and files with the desktop, this may be the lib you want.
