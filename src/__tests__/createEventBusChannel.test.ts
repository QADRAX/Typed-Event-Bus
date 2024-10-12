import { createEventBusChannel, EventBusChannel, EventKey, EventMap } from '..';

interface MyEvents extends EventMap {
  userLoggedIn: (user: { id: number; name: string }) => void;
  dataFetched: (data: string[]) => void;
  errorOccurred: (error: Error) => void;
  numericEvent: (value: number) => void;
  symbolEvent: (description: string) => void;
}

describe('createEventBusChannel', () => {
  let eventBus: EventBusChannel<MyEvents>;
  let onErrorMock: jest.Mock;

  beforeEach(() => {
    onErrorMock = jest.fn();
    eventBus = createEventBusChannel<MyEvents>({
      onError: onErrorMock,
    });
  });

  describe('on and emit', () => {
    it('should call the handler when the event is emitted', () => {
      const handler = jest.fn();
      eventBus.on('userLoggedIn', handler);

      const user = { id: 1, name: 'John Doe' };
      eventBus.emit('userLoggedIn', user);

      expect(handler).toHaveBeenCalledWith(user);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should pass the correct payload to the handler', () => {
      const handler = jest.fn();
      eventBus.on('dataFetched', handler);

      const data = ['item1', 'item2', 'item3'];
      eventBus.emit('dataFetched', data);

      expect(handler).toHaveBeenCalledWith(data);
    });

    it('should handle events with different key types', () => {
      const symbolKey = Symbol('symbolEvent');
      const symbolHandler = jest.fn();
      const numericHandler = jest.fn();

      // Extend MyEvents for symbol and numeric keys
      interface ExtendedEvents extends MyEvents {
        [symbolKey]: (description: string) => void;
        numericEvent: (value: number) => void;
      }

      const extendedEventBus = createEventBusChannel<ExtendedEvents>({
        onError: onErrorMock,
      });

      extendedEventBus.on(symbolKey, symbolHandler);
      extendedEventBus.on('numericEvent', numericHandler);

      extendedEventBus.emit(symbolKey, 'A symbol-based event');
      extendedEventBus.emit('numericEvent', 42);

      expect(symbolHandler).toHaveBeenCalledWith('A symbol-based event');
      expect(numericHandler).toHaveBeenCalledWith(42);
    });

    it('should not fail when emitting an event with no handlers', () => {
      expect(() => {
        eventBus.emit('userLoggedIn', { id: 2, name: 'Jane Doe' });
      }).not.toThrow();
    });
  });

  describe('off', () => {
    it('should remove the handler so it is not called after unsubscribing', () => {
      const handler = jest.fn();
      eventBus.on('userLoggedIn', handler);

      // Unsubscribe the handler
      eventBus.off('userLoggedIn', handler);

      const user = { id: 3, name: 'Alice' };
      eventBus.emit('userLoggedIn', user);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove the specified handler', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('dataFetched', handler1);
      eventBus.on('dataFetched', handler2);

      // Unsubscribe handler1
      eventBus.off('dataFetched', handler1);

      const data = ['data1', 'data2'];
      eventBus.emit('dataFetched', data);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(data);
    });
  });

  describe('unsubscribe function returned by on', () => {
    it('should unsubscribe the handler when the returned function is called', () => {
      const handler = jest.fn();
      const unsubscribe = eventBus.on('userLoggedIn', handler);

      // Emit first time
      const user1 = { id: 4, name: 'Bob' };
      eventBus.emit('userLoggedIn', user1);
      expect(handler).toHaveBeenCalledWith(user1);
      expect(handler).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Emit second time
      const user2 = { id: 5, name: 'Charlie' };
      eventBus.emit('userLoggedIn', user2);
      expect(handler).toHaveBeenCalledTimes(1); // No additional calls
    });

    it('should allow multiple subscriptions and unsubscriptions independently', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      const unsubscribe1 = eventBus.on('dataFetched', handler1);
      const unsubscribe2 = eventBus.on('dataFetched', handler2);

      const data1 = ['alpha', 'beta'];
      eventBus.emit('dataFetched', data1);
      expect(handler1).toHaveBeenCalledWith(data1);
      expect(handler2).toHaveBeenCalledWith(data1);

      unsubscribe1();

      const data2 = ['gamma', 'delta'];
      eventBus.emit('dataFetched', data2);
      expect(handler1).toHaveBeenCalledTimes(1); // No additional calls
      expect(handler2).toHaveBeenCalledWith(data2);

      unsubscribe2();
    });
  });

  describe('error handling', () => {
    it('should call onError when a handler throws an error', () => {
      const error = new Error('Handler error');
      const handler = jest.fn(() => {
        throw error;
      });

      eventBus.on('errorOccurred', handler);

      eventBus.emit('errorOccurred', error);

      expect(handler).toHaveBeenCalledWith(error);
      expect(onErrorMock).toHaveBeenCalledWith(error, 'errorOccurred', error);
    });

    it('should continue calling other handlers even if one throws an error', () => {
      const error = new Error('Handler error');
      const handler1 = jest.fn(() => {
        throw error;
      });
      const handler2 = jest.fn();

      eventBus.on('dataFetched', handler1);
      eventBus.on('dataFetched', handler2);

      const data = ['itemA', 'itemB'];
      eventBus.emit('dataFetched', data);

      expect(handler1).toHaveBeenCalledWith(data);
      expect(handler2).toHaveBeenCalledWith(data);
      expect(onErrorMock).toHaveBeenCalledWith(error, 'dataFetched', data);
    });

    it('should not call onError if no config is provided and a handler throws an error', () => {
      const error = new Error('Unhandled error');
      const handler = jest.fn(() => {
        throw error;
      });

      // Create a new event bus without onError config
      const silentEventBus = createEventBusChannel<MyEvents>();

      silentEventBus.on('errorOccurred', handler);

      // Spy on console.error to ensure no logging happens
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        silentEventBus.emit('errorOccurred', error);
      }).not.toThrow();

      expect(handler).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('multiple event keys', () => {
    it('should handle multiple event keys independently', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('userLoggedIn', handler1);
      eventBus.on('dataFetched', handler2);

      const user = { id: 6, name: 'Diana' };
      const data = ['x', 'y', 'z'];

      eventBus.emit('userLoggedIn', user);
      eventBus.emit('dataFetched', data);

      expect(handler1).toHaveBeenCalledWith(user);
      expect(handler2).toHaveBeenCalledWith(data);
    });

    it('should allow the same handler to be subscribed to multiple events', () => {
      const handler = jest.fn();

      eventBus.on('userLoggedIn', handler);
      eventBus.on('dataFetched', handler);

      const user = { id: 7, name: 'Eve' };
      const data = ['foo', 'bar'];

      eventBus.emit('userLoggedIn', user);
      eventBus.emit('dataFetched', data);

      expect(handler).toHaveBeenCalledWith(user);
      expect(handler).toHaveBeenCalledWith(data);
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('event key types', () => {
    it('should handle numeric event keys correctly', () => {
      const handler = jest.fn();

      // Extend MyEvents for numeric keys
      interface NumericEvents extends MyEvents {
        [100]: (value: number) => void;
      }

      const numericEventBus = createEventBusChannel<NumericEvents>({
        onError: onErrorMock,
      });

      numericEventBus.on(100, handler);
      numericEventBus.emit(100, 999);

      expect(handler).toHaveBeenCalledWith(999);
    });

    it('should handle symbol event keys correctly', () => {
      const handler = jest.fn();
      const symbolKey: EventKey = Symbol('uniqueSymbol');

      // Extend MyEvents for symbol keys
      interface SymbolEvents extends MyEvents {
        symbolKey: (description: string) => void;
      }

      const symbolEventBus = createEventBusChannel<SymbolEvents>({
        onError: onErrorMock,
      });

      symbolEventBus.on(symbolKey, handler);
      symbolEventBus.emit(symbolKey, 'Symbol event triggered');

      expect(handler).toHaveBeenCalledWith('Symbol event triggered');
    });
  });
});
