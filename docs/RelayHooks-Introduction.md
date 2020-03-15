---
id: relay-hooks
title: Getting Started
---

# relay-hooks
Use Relay as React hooks

## Installation

Install react-relay and relay-hooks using yarn or npm:

```
yarn add react-relay relay-hooks
```

## Contributing

* **Give a star** to the repository and **share it**, you will **help** the **project** and the **people** who will find it useful

* **Create issues**, your **questions** are a **valuable help**

* **PRs are welcome**, but it is always **better to open the issue first** so as to **help** me and other people **evaluating it**

* **Please sponsor me**

## RelayEnvironmentProvider

Since queries with `useQuery` no longer set context, we will expose a new `RelayEnvironmentProvider` component that takes an `environment` and sets it in context; 
variables will no longer be part of context. 
A `RelayEnvironmentProvider` should be rendered once at the root of the app, and multiple useQuery's can be rendered under this environment provider.

```ts
ReactDOM.render(
    <RelayEnvironmentProvider environment={modernEnvironment}>
      <AppTodo/>
    </RelayEnvironmentProvider>,
    rootElement,
  );
```

## useQuery

`useQuery` does not take an environment as an argument. Instead, it reads the environment set in the context; this also implies that it does not set any React context.
In addition to `query` (first argument) and `variables` (second argument), `useQuery` accepts a third argument `options`. 

**options**

`fetchPolicy`: determine whether it should use data cached in the Relay store and whether to send a network request. The options are:
  * `store-or-network` (default): Reuse data cached in the store; if the whole query is cached, skip the network request
  * `store-and-network`: Reuse data cached in the store; always send a network request.
  * `network-only`: Don't reuse data cached in the store; always send a network request. (This is the default behavior of Relay's existing `QueryRenderer`.)
  * `store-only`: Reuse data cached in the store; never send a network request.

`fetchKey`: [Optional] A fetchKey can be passed to force a refetch of the current query and variables when the component re-renders, even if the variables didn't change, or even if the component isn't remounted (similarly to how passing a different key to a React component will cause it to remount). If the fetchKey is different from the one used in the previous render, the current query and variables will be refetched.

`networkCacheConfig`: [Optional] Object containing cache config options for the network layer. Note the the network layer may contain an additional query response cache which will reuse network responses for identical queries. If you want to bypass this cache completely, pass {force: true} as the value for this option.

`skip`: [Optional] If skip is true, the query will be skipped entirely.

```ts
import {useQuery, graphql } from 'relay-hooks';

const query = graphql`
  query appQuery($userId: String) {
    user(id: $userId) {
      ...TodoApp_user
    }
  }
`;

const variables = {
  userId: 'me',
}; 

const options = {
  fetchPolicy: 'store-or-network', //default
  networkCacheConfig: undefined,
}

const AppTodo = function (appProps)  {
  const {props, error, retry, cached} = useQuery(query, variables, options);

  if (props && props.user) {
    return <TodoApp user={props.user} />;
  } else if (error) {
    return <div>{error.message}</div>;
  }
  return <div>loading</div>;

}
```

## useLazyLoadQuery

same to useQuery

```ts
import * as React from 'react';
import {useQuery, graphql, RelayEnvironmentProvider } from 'relay-hooks';

const query = graphql`
  query appQuery($userId: String) {
    user(id: $userId) {
      ...TodoApp_user
    }
  }
`;

class ErrorBoundary extends React.Component {
    state = { error: null };
    componentDidCatch(error) {
        this.setState({ error });
    }
    render() {
        const { children, fallback } = this.props;
        const { error } = this.state;
        if (error) {
            return React.createElement(fallback, { error });
        }
        return children;
    }
}

const variables = {
  userId: 'me',
}; 

const options = {
  fetchPolicy: 'store-or-network', //default
  networkCacheConfig: undefined,
}


const AppTodo = function (appProps)  {
  const {props, cached} = useLazyLoadQuery(query, variables, options);
  return <TodoApp user={props.user} />;

}


const App = (
  <RelayEnvironmentProvider environment={modernEnvironment}>
    <ErrorBoundary fallback={({ error }) => `Error: ${error.message + ': ' + error.stack}`}>
      <React.Suspense fallback={<div>loading suspense</div>}>
        <AppTodo />
      </React.Suspense>
    </ErrorBoundary>
  </RelayEnvironmentProvider>
);
```
