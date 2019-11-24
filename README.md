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

`useQuery` does not take an environment as an argument. Instead, it reads the environment set in the context; this also implies that it does not set any React context.
In addition to `query` (first argument) and `variables` (second argument), `useQuery` accepts a third argument `options`. `fetchPolicy` in `options` determine whether it should use data cached in the Relay store and whether to send a network request. The options are:
  * `store-or-network` (default): Reuse data cached in the store; if the whole query is cached, skip the network request
  * `store-and-network`: Reuse data cached in the store; always send a network request.
  * `network-only`: Don't reuse data cached in the store; always send a network request. (This is the default behavior of Relay's existing `QueryRenderer`.)
  * `store-only`: Reuse data cached in the store; never send a network request.

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
