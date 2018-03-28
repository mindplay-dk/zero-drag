/**
 * This type union defines the expected types of draggable Elements
 */
export type DragElement = HTMLElement | SVGElement;

/**
 * This interface defines the message format for the `onStart`, `onDrag` and `onDrop` hooks of `DragOptions`.
 */
export interface DragMessage<TElement extends DragElement, TItemValue, TTargetValue> {
    /**
     * The item being dragged
     */
    item: TElement

    /**
     * The derived value of the item being dragged; see `DragOptions.deriveValue`
     */
    itemValue: TItemValue;

    /**
     * The starting position of the item being dragged
     */
    itemOffset: ClientRect

    /**
     * The current target to which the item is being dragged
     */
    target?: TElement

    /**
     * The derived value of the target to which the item is being dragged; see `DragOptions.deriveValue`
     */
    targetValue?: TTargetValue;

    /**
     * The mouse-event that generated this message
     */
    event: MouseEvent

    /**
     * Horizontal distance dragged (in pixels)
     */
    dx: number

    /**
     * Vertical distance dragged (in pixels)
     */
    dy: number
}

/**
 * This interface defines the callback signature of your `DragMessage` listeners
 */
export interface DragHook<TElement extends DragElement, TItemValue, TTargetValue> {
    (message: DragMessage<TElement, TItemValue, TTargetValue>): void
}

/**
 * This interface the defines the callback signature of the item and target selectors.
 */
export interface ElementSelector<TElement extends DragElement> {
    (el: TElement): TElement | undefined
}

/**
 * This interface defines the callback signature of a function that derives the value
 * of an item or target element; see `getItemValue` and `getTargetValue` of `DragOptions`.
 * 
 * The value can be anything, but a typical strategy is to attach a globally unique
 * ID as an attribute of item/target elements, and either return that, or use this
 * function to look up a model object in a map or registry of some sort.
 * 
 * The derived value is also used internally when comparing item/target identity,
 * and may be required when working within a framework such as React (etc.) where
 * asynchronous rendering and element recycling can make the elements themselves
 * unreliable in terms of identity: a drag handler might trigger a re-render,
 * and swapping two elements in a list, for example, could mean that the state
 * and contents (including the ID attribute!) of two elements are swapped.
 */
export interface ValueDelegate<TElement extends DragElement, TValue = TElement> {
    (el: TElement): TValue;
}

/**
 * This union defines the allowed types for the `selectParent` utility function, and
 * the `makeParentSelector` factory-function, which accept either a string (a CSS selector)
 * or a predicate for manual filtering.
 */
export type ElementFilter = string | { (element: Element): boolean }

/**
 * This type defines the options that can be passed to `makeListener` factory-function.
 */
export interface DragOptions<TElement extends DragElement = HTMLElement, TItemValue = TElement, TTargetValue = TItemValue> {
    /**
     * This hook is triggered once when the drag-operation starts
     */
    onStart?: DragHook<TElement, TItemValue, TTargetValue>

    /**
     * This hook is triggered repeatedly during the drag-operation
     */
    onDrag?: DragHook<TElement, TItemValue, TTargetValue>

    /**
     * This hook is triggered once when the drag-operation ends
     */
    onDrop?: DragHook<TElement, TItemValue, TTargetValue>

    /**
     * This function can be used to filter or change the item being dragged
     */
    selectItem?: ElementSelector<TElement>

    /**
     * This function derives the value of an item from an item element.
     * 
     * The derived value is made available to listeners as `DragMessage.itemValue`.
     */
    getItemValue?: ValueDelegate<TElement, TItemValue>

    /**
     * This function can be used to filter or change the target being dragged to
     */
    selectTarget?: ElementSelector<TElement>

    /**
     * This function derives the value of an item from an item element.
     * 
     * The derived value is made available to listeners as `DragMessage.itemValue`.
     */
    getTargetValue?: ValueDelegate<TElement, TTargetValue>

    /**
     * Minimum drag-distance threshold (in pixels) before the drag-operation starts.
     * 
     * If specified, the `onStart` hook will not be triggered until the mouse has moved
     * a minimum distance from the position of the initial `mousedown` event - this
     * allows you to add your own `click` handlers.
     */
    dragThreshold?: number

    /**
     * Minimum time (in milliseconds) before changing the target of a drag-operation.
     * 
     * If specified, the `target` property of every `DragMessage` will not change unless
     * the user points at the same target for the specified period of time - this helps prevent
     * erratic targeting and may better track the user's intent when dragging over many small
     * moving targets, for example in a drag-and-drop list or tree.
     */
    deferTargeting?: number
}

export interface TargetCoords {
    /**
     * Distance (in pixels) from the left edge of the current target element
     */
    left: number;

    /**
     * Distance (in pixels) from the top edge of the current target element
     */
    top: number;

    /**
     * Distance (in pixels) from the right edge of the current target element
     */
    right: number;

    /**
     * Distance (in pixels) from the bottom edge of the current target element
     */
    bottom: number;

    /**
     * Horizontal pointer location as a unit coordinate for the current target
     */
    x: number;

    /**
     * Vertical pointer location as a unit coordinate for the current target
     */
    y: number;
}

/**
 * Absolute position of the tracked element, as reported by the `itemPositionFrom` utility function.
 * 
 * These coordinates can be directly applied to an element's `style.left` and `style.top` properties,
 * just make sure you add a `px` unit suffix.
 */
export interface ItemPosition {
    left: number;
    top: number;
}

function sameValue<TElement, TValue>(el: TElement): TValue {
    return el as any as TValue;
}

/**
 * Builds a `mousedown` event-listener for custom drag-and-drop behavior defined
 * by a set of hooks and filters.
 */
export function makeListener<TElement extends DragElement = HTMLElement, TItemValue = TElement, TTargetValue = TItemValue>(options: DragOptions<TElement, TItemValue, TTargetValue>) {
    const { dragThreshold, deferTargeting } = options;

    if (dragThreshold) { 
        options = applyDragThreshold(dragThreshold, options);
    }

    if (deferTargeting) {
        options = applyDeferredTargeting(deferTargeting, options);
    }

    let { onStart, onDrag, onDrop, selectItem, selectTarget, getItemValue = sameValue, getTargetValue = sameValue } = options;

    return function onMouseDown(event: MouseEvent) {
        const offsetX = event.pageX;
        const offsetY = event.pageY;
        const item = selectItem
            ? selectItem(event.target as TElement)
            : event.target as TElement;

        if (!item) {
            return;
        }
        
        const itemOffset = item.getBoundingClientRect();
        
        function trigger(hook: DragHook<TElement, TItemValue, TTargetValue> | undefined, event: MouseEvent) {
            if (hook) {
                let target = selectTarget
                    ? selectTarget(event.target as TElement)
                    : event.target as TElement;

                let itemValue = getItemValue(item!);
                let targetValue = target ? getTargetValue(target) : undefined;

                if (itemValue === targetValue as any) {
                    // same item/target - remove target/value from message:
                    target = undefined;
                    targetValue = undefined;
                }
                
                hook({
                    item: item!,
                    itemValue,
                    itemOffset,
                    target,
                    targetValue,
                    event,
                    dx: event.pageX - offsetX,
                    dy: event.pageY - offsetY
                });
            }
        }

        trigger(onStart, event);

        const onMouseMove = (event: MouseEvent) => {
            trigger(onDrag, event);
        };

        const onMouseUp = (event: MouseEvent) => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            
            trigger(onDrop, event);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };
}

/**
 * This function produces an element-selector that can be used to select
 * an item or target, by scanning for the nearest ancestor that matches
 * a given CSS selector or user-defined filter-function.
 */
export function makeParentSelector<TElement extends DragElement>(filter: ElementFilter): ElementSelector<TElement> {
    return (node: TElement) => selectParent(node, filter) as TElement
}

/**
 * Utility function to select the nearest ancestor from a given element (or the
 * element itself) matching a given CSS selector or predicate.
 */
export function selectParent(element: Element, filter: ElementFilter): Element | undefined {
    const match = typeof filter === "string"
        ? (element: Element) => element.matches(filter)
        : filter;
    
    while (element) {
        if (element instanceof Element && match(element)) {
            return element;
        }

        element = element.parentElement!;
    }
}

/**
 * Use this function to get the local target coordinates during a drag-operation.
 * 
 * The `left`, `right`, `top` and `bottom` coordinates report the pointer's distance
 * from each target's edge, in pixels - this can be useful, for example, if you want 
 * to check how close the pointer is hovering near the edges of the target.
 * 
 * The `x` and `y` coordinates report the pointer's location within the target in unit
 * coordinates - this can be useful, for example, if you want to check if the pointer
 * is hovering over the top (`y < 0.5`) or bottom (`y >= 0.5`) of the target.
 */
export function targetCoordsFrom<TElement extends DragElement>({ event, target }: DragMessage<TElement, any, any>): TargetCoords | undefined {
    if (target) {
        const bounds = target.getBoundingClientRect();

        const left = event.clientX - bounds.left;
        const top = event.clientY - bounds.top;

        return {
            left,
            top,
            right: bounds.width - left,
            bottom: bounds.height - top,
            x: left / bounds.width,
            y: top / bounds.height
        };
    }
}

/**
 * Use this function to calculate the absolute position of the dragged item
 * (or a "ghost" representation of the dragged item) during a drag-operation.
 * 
 * This takes into account the dragged item's offset position at the start of
 * the drag-operation, which means that these coordinates can be applied directly
 * (with a `px` unit suffix) to the `style.left` and `style.top` properties of
 * an absolutely-positioned element, e.g. from the `onDrag` hook.
 */
export function itemPositionFrom<TElement extends DragElement>({ itemOffset, dx, dy }: DragMessage<TElement, any, any>): ItemPosition {
    return {
        left: itemOffset.left + dx,
        top: itemOffset.top + dy
    }
}

/**
 * Internally applies a minimum drag-distance behavior (using a theshold in pixels) to the given options.
 */
function applyDragThreshold<TElement extends DragElement, TItemValue, TTargetValue>(dist_px: number, { onStart, onDrag, onDrop, ...rest }: DragOptions<TElement, TItemValue, TTargetValue>): DragOptions<TElement, TItemValue, TTargetValue> {
    let active = false;

    return {
        onStart: message => {
            active = false;
        },
        onDrag: message => {
            if (active) {
                onDrag && onDrag(message);
            } else {
                active = message.dx * message.dx + message.dy * message.dy > dist_px * dist_px;

                if (active && onStart) {
                    onStart(message);
                }
            }
        },
        onDrop: message => {
            if (active && onDrop) {
                onDrop(message);
            }
        },
        ...rest
    };
}

/**
 * Internally applies deferred targeting behavior (with timeout in milliseconds) to the given options.
 */
function applyDeferredTargeting<TElement extends DragElement, TItemValue, TTargetValue>(time_msec: number, { selectTarget, onStart, onDrag, onDrop, ...rest }: DragOptions<TElement, TItemValue, TTargetValue>): DragOptions<TElement, TItemValue, TTargetValue> {
    let timer: any;
    let current_target: TElement | undefined;
    let next_target: TElement | undefined;
    let last_message: DragMessage<TElement, TItemValue, TTargetValue>;

    function setTarget(new_target: TElement | undefined) {
        if (new_target !== next_target) {
            cancel();

            next_target = new_target;

            timer = window.setTimeout(() => {
                current_target = next_target;

                if (onDrag) {
                    onDrag({ ...last_message, target: current_target });
                }
            }, time_msec);
        }
    }
    
    function cancel() {
        if (timer) {
            window.clearTimeout(timer);
            
            timer = null;
        }
    }

    return {
        selectTarget: el => {
            let new_target = selectTarget
                ? selectTarget(el)
                : el;

            setTarget(new_target);

            return current_target;
        },
        onStart: message => {
            current_target = undefined;
            next_target = undefined;
            last_message = message;
            
            if (onStart) {
                onStart(message);
            }
        },
        onDrag: message => {
            last_message = message;

            if (onDrag) {
                onDrag({ ...message, target: current_target });
            }
        },
        onDrop: message => {
            cancel();

            if (onDrop) {
                onDrop({ ...message, target: current_target });
            }
        },
        ...rest
    };
}
