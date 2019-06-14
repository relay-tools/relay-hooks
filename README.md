# relay-hooks
Use Relay as React hooks

## Installation

Install react-relay and relay-hooks using yarn or npm:

```
yarn add react-relay relay-hooks
```

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

## useFragment

[See useFragment.md](./useFragment.md)

## useRefetch

[See useRefetch.md](./useRefetch.md)

## usePagination

[See usePagination.md](./usePagination.md)

## useMutation

[See useMutation.md](./useMutation.md)

## useOssFragment

the useOssFragment is a hooks not provided in the official version of react-relay. Using it you can manage fragment, refetch and pagination containers.
For reasons of cost of migration to the react-relay version it is recommended to use the other hooks.

[See useOssFragment.md](./useOssFragment.md)