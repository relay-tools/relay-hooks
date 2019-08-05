---
id: getting-started
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

* **Please sponsor me** and recommend me at [github sponsorship](https://docs.google.com/forms/d/e/1FAIpQLSdE8nL7U-d7CBTWp9X7XOoezQD06wCzCAS9VpoUW6lJ03KU7w/viewform), so that i can use it

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

`useQuery` will no longer take environment as an argument. Instead it reads the environment set in context; this also implies that it no longer sets any React context. 

- [ ] `useQuery` will now take a `fetchPolicy` as part of a 3rd configuration argument, to determine whether it should use data cached in the Relay store and whether to send a network request. The options are:
  - [ ] `store-or-network` (default): Reuse data cached in the store; if the whole query is cached, skip the network request
  - [ ] `store-and-network`: Reuse data cached in the store; always send a network request.
  - [ ] `network-only`: Don't reuse data cached in the store; always send a network request. (This is the default behavior of Relay's existing `QueryRenderer`.
  - [ ] `store-only`: Reuse data cached in the store; never send a network request.

```ts
import {useQuery, graphql } from 'relay-hooks';

const AppTodo = function (appProps)  {
  const {props, error, retry, cached} = useQuery({ query: graphql`
      query appQuery($userId: String) {
        user(id: $userId) {
          ...TodoApp_user
        }
      }
    `,
    variables: {
      userId: 'me',
    }});

  if (props && props.user) {
    return <TodoApp {...hooksProps} />;
  } else if (error) {
    return <div>{error.message}</div>;
  }
  return <div>loading</div>;

}
```