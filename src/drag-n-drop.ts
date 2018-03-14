export type DragElement = HTMLElement | SVGElement;

export interface DragMouseEvent<TElement extends DragElement> extends MouseEvent {
    target: TElement
}

export interface DragMessage<TElement extends DragElement> {
    /// the item being dragged
    item: TElement
    /// the starting position of the item being dragged
    itemOffset: ClientRect
    /// the current target to which the item is being dragged
    target?: TElement
    /// the mouse-event that generated this message
    event: MouseEvent
    /// horizontal distance dragged (in pixels)
    dx: number
    /// vertical distance dragged (in pixels)
    dy: number
}

export interface DragHook<TElement extends DragElement> {
    (message: DragMessage<TElement>): void
}

export interface ElementSelector<TElement extends DragElement> {
    (el: TElement): TElement | undefined
}

export type ElementFilter = string | { (element: Element): boolean }

export interface DragOptions<TElement extends DragElement = HTMLElement> {
    /// this hook is triggered once when the drag-operation starts
    onStart?: DragHook<TElement>
    /// this hook is triggered repeatedly during the drag-operation
    onDrag?: DragHook<TElement>
    /// this hook is triggered once when the drag-operation ends
    onDrop?: DragHook<TElement>
    /// this function can be used to filter or change the item being dragged
    selectItem?: ElementSelector<TElement>
    /// this function can be used to filter or change the target being dragged to
    selectTarget?: ElementSelector<TElement>
    /// minimum drag-distance threshold (in pixels) before the drag-operation starts
    dragThreshold?: number
    /// minimum time (in milliseconds) before changing the target of a drag-operation
    deferTargeting?: number
}

export interface MouseEventHandler<TElement extends DragElement> {
    (event: DragMouseEvent<TElement>): void
}

export interface TargetCoords {
    left: number;
    top: number;
    right: number;
    bottom: number;
    x: number;
    y: number;
}

export interface ItemPosition {
    left: number;
    top: number;
}

/**
 * Builds a `mousedown` event-listener for custom drag-and-drop behavior defined
 * by a set of hooks and filters.
 */
export function makeListener<TElement extends DragElement = HTMLElement>(options: DragOptions<TElement>): MouseEventHandler<TElement> {
    const { dragThreshold, deferTargeting } = options;

    if (dragThreshold) { 
        options = applyDragThreshold(dragThreshold, options);
    }

    if (deferTargeting) {
        options = applyDeferredTargeting(deferTargeting, options);
    }

    let { onStart, onDrag, onDrop, selectItem, selectTarget } = options;

    return function onMouseDown(event: DragMouseEvent<TElement>) {
        const offsetX = event.pageX;
        const offsetY = event.pageY;
        const item: TElement = selectItem
            ? selectItem(event.target)!
            : event.target;

        if (!item) {
            return;
        }
        
        const itemOffset = item.getBoundingClientRect();
        
        let oldPointerEvents = item.style.pointerEvents;
        
        item.style.pointerEvents = "none";

        function trigger(hook: DragHook<TElement> | undefined, event: DragMouseEvent<TElement>) {
            if (hook) {
                let target = selectTarget
                    ? selectTarget(event.target)
                    : event.target;
                
                hook({
                    item,
                    itemOffset,
                    target,
                    event,
                    dx: event.pageX - offsetX,
                    dy: event.pageY - offsetY
                });
            }
        }

        trigger(onStart, event);

        const onMouseMove = (event: DragMouseEvent<TElement>) => {
            trigger(onDrag, event);
        };

        const onMouseUp = (event: DragMouseEvent<TElement>) => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            
            item.style.pointerEvents = oldPointerEvents;

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
export function targetCoordsFrom<TElement extends DragElement>({ event, target }: DragMessage<TElement>): TargetCoords | undefined {
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
export function itemPositionFrom<TElement extends DragElement>({ itemOffset, dx, dy }: DragMessage<TElement>): ItemPosition {
    return {
        left: itemOffset.left + dx,
        top: itemOffset.top + dy
    }
}

/**
 * Applies a minimum drag-distance threshold (in pixels) to the given options.
 */
function applyDragThreshold<TElement extends DragElement>(dist_px: number, { onStart, onDrag, onDrop, ...rest }: DragOptions<TElement>): DragOptions<TElement> {
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
 * Applies deferred targeting (in milliseconds) to the given options.
 */
function applyDeferredTargeting<TElement extends DragElement>(time_msec: number, { selectTarget, onStart, onDrag, onDrop, ...rest }: DragOptions<TElement>): DragOptions<TElement> {
    let timer: any;
    let current_target: TElement | undefined;
    let next_target: TElement | undefined;
    let last_message: DragMessage<TElement>;

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
