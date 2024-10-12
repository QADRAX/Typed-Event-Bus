/**
 * Represents the key type for events.
 */
export type EventKey = string | symbol | number;

/**
 * Defines the shape of an event handler function.
 *
 * @template T - The type of the payload that the handler will receive.
 * @param payload - The data associated with the event.
 */
export type EventHandler<T = any> = (payload: T) => void;

/**
 * Maps each event key to its corresponding event handler.
 */
export type EventMap = Record<EventKey, EventHandler>;

/**
 * Configuration options for the Event Bus.
 */
export type EventBusConfig<E extends EventMap> = {
  /**
   * Callback function invoked when an error occurs within an event handler.
   *
   * @param error - The error that was thrown.
   * @param eventKey - The key of the event during which the error occurred.
   * @param payload - The payload that was being processed when the error occurred.
   */
  onError: (error: unknown, eventKey?: EventKey, payload?: Parameters<E[keyof E]>[]) => void;
};

/**
 * Represents the internal storage structure of the Event Bus.
 * Maps each event key to an array of its associated event handlers.
 *
 * @template E - The EventMap defining all possible events and their handlers.
 */
type Bus<E> = Map<keyof E, E[keyof E][]>;

/**
 * Defines the interface for the Event Bus Channel.
 * Provides methods to subscribe, unsubscribe, and emit events.
 *
 * @template T - The EventMap defining all possible events and their handlers.
 */
export type EventBusChannel<T extends EventMap> = {
  /**
   * Subscribes a handler to a specific event.
   *
   * @template Key - The key of the event to subscribe to.
   * @param key - The event key.
   * @param handler - The event handler function.
   * @returns A function to unsubscribe the handler from the event.
   */
  on<Key extends keyof T>(key: Key, handler: T[Key]): () => void;

  /**
   * Unsubscribes a handler from a specific event.
   *
   * @template Key - The key of the event to unsubscribe from.
   * @param key - The event key.
   * @param handler - The event handler function to remove.
   */
  off<Key extends keyof T>(key: Key, handler: T[Key]): void;

  /**
   * Emits an event, invoking all subscribed handlers with the provided payload.
   *
   * @template Key - The key of the event to emit.
   * @param key - The event key.
   * @param payload - The data to pass to each event handler.
   */
  emit<Key extends keyof T>(key: Key, ...payload: Parameters<T[Key]>): void;
};

/**
 * Creates a new Event Bus Channel.
 * Allows subscribing, unsubscribing, and emitting events with type safety.
 *
 * @template E - The EventMap defining all possible events and their handlers.
 * @param config - Optional configuration for the Event Bus.
 * @returns An object implementing the EventBusChannel interface.
 *
 * @example
 * ```typescript
 * interface MyEvents {
 *   userLoggedIn: (user: User) => void;
 *   dataFetched: (data: Data) => void;
 * }
 *
 * const eventBus = createEventBusChannel<MyEvents>({
 *   onError: (error, eventKey, payload) => {
 *     console.error(`Error in event ${String(eventKey)}:`, error, payload);
 *   },
 * });
 *
 * const unsubscribe = eventBus.on('userLoggedIn', (user) => {
 *   console.log('User logged in:', user);
 * });
 *
 * eventBus.emit('userLoggedIn', currentUser);
 * unsubscribe();
 * ```
 */
export function createEventBusChannel<E extends EventMap>(
  config?: EventBusConfig<E>
): EventBusChannel<E> {
  // Internal storage for event handlers using a Map for efficient lookups.
  const bus: Bus<E> = new Map();

  /**
   * Subscribes a handler to a specific event.
   *
   * @param key - The event key.
   * @param handler - The event handler function.
   * @returns A function to unsubscribe the handler.
   */
  const on: EventBusChannel<E>['on'] = (key, handler) => {
    if (!bus.has(key)) {
      bus.set(key, []);
    }
    bus.get(key)!.push(handler);

    // Return an unsubscribe function for convenience.
    return () => {
      off(key, handler);
    };
  };

  /**
   * Unsubscribes a handler from a specific event.
   *
   * @param key - The event key.
   * @param handler - The event handler function to remove.
   */
  const off: EventBusChannel<E>['off'] = (key, handler) => {
    const handlers = bus.get(key);
    if (handlers) {
      // Filter out the handler to be removed.
      bus.set(
        key,
        handlers.filter((h) => h !== handler)
      );
    }
  };

  /**
   * Emits an event, invoking all subscribed handlers with the provided payload.
   *
   * @param key - The event key.
   * @param payload - The data to pass to each event handler.
   */
  const emit: EventBusChannel<E>['emit'] = (key, payload) => {
    const handlers = bus.get(key);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(payload);
        } catch (e) {
          // Invoke the onError callback if provided.
          config?.onError(e, key, payload);
        }
      });
    }
  };

  // Expose the EventBusChannel interface.
  return { on, off, emit };
}
