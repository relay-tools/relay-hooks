# Relay Hooks NextJS SSR TodoMVC

## Installation

```
yarn
```

## Running

Set up generated files:

```
yarn
yarn compile
```

Start a local server:

```
yarn dev
```

## difference with nextjs-ssr-example no suspense

### createRelayEnvironment.ts

```ts
// suspense
import {loadLazyQuery} from 'relay-hooks';
const prefetch = loadLazyQuery();

// no suspense
import {loadQuery} from 'relay-hooks';
const prefetch = loadQuery();
```
