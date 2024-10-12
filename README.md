# Typed Event Bus

Typed Event Bus is a lightweight and fully type-safe event management library for TypeScript applications. It provides a simple and intuitive API to subscribe, unsubscribe, and emit events, ensuring strong type guarantees and enhancing code reliability. Perfect for building scalable and maintainable event-driven architectures in modern web and server-side projects.

## Installation

Install the package via npm:

```
npm install typed-event-bus
```

Or using Yarn:

```
yarn add typed-event-bus
```

## Usage

### Defining Events

First, define an interface that maps event keys to their respective handler signatures:

```typescript
// events.ts

import { EventMap } from 'typed-event-bus';

export interface MyEvents extends EventMap {
  userLoggedIn: (user: { id: number; name: string }) => void;
  dataFetched: (data: string[]) => void;
  errorOccurred: (error: Error) => void;
}
```

### Creating an Event Bus

Create an instance of the Event Bus using your defined EventMap:

```typescript
// eventBus.ts

import { createEventBusChannel } from 'typed-event-bus';
import { MyEvents } from './events';

export const eventBus = createEventBusChannel<MyEvents>({
  onError: (error, eventKey, payload) => {
    console.error(`Error in event "${String(eventKey)}":`, error, payload);
  },
});
```

### Subscribing to Events

Subscribe to an event using the on method. It returns an unsubscribe function for convenience:

```typescript
// subscriber.ts

import eventBus from './eventBus';

const unsubscribe = eventBus.on('userLoggedIn', (user) => {
  console.log('User logged in:', user);
});

// To unsubscribe later
unsubscribe();
```

### Emitting Events

Emit an event using the emit method, passing the event key and the required payload:

```typescript
// emitter.ts

import eventBus from './eventBus';

const currentUser = { id: 1, name: 'John Doe' };
eventBus.emit('userLoggedIn', currentUser);
```

### Unsubscribing from Events

You can unsubscribe from events either by using the unsubscribe function returned by on or by directly calling off:

```typescript
// Using the unsubscribe function
const unsubscribe = eventBus.on('dataFetched', (data) => {
  console.log('Data fetched:', data);
});

// Later in the code
unsubscribe();

// Or directly using off
const handler = (data: string[]) => {
  console.log('Data fetched:', data);
};

eventBus.on('dataFetched', handler);
// To unsubscribe
eventBus.off('dataFetched', handler);
```

