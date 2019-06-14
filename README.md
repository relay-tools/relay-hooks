# relay-hooks
Use Relay as React hooks

## Installation

Install react-relay and relay-hooks using yarn or npm:

```
yarn add react-relay relay-hooks
```

## RelayEnvironmentProvider

Since queries with useQuery no longer set context, we will expose a new RelayEnvironmentProvider component that takes an environment and sets it in context; variables will no longer be part of context. A RelayEnvironmentProvider should be rendered once at the root of the app, and multiple useQuery's can be rendered under this environment provider.

```ts
ReactDOM.render(
    <RelayEnvironmentProvider environment={modernEnvironment}>
      <AppTodo/>
    </RelayEnvironmentProvider>,
    rootElement,
  );
```

## useQuery

```ts
import {useQuery, graphql } from 'relay-hooks';

const AppTodo = function (appProps)  {
  const hooksProps = useQuery({ query: graphql`
      query appQuery($userId: String) {
        user(id: $userId) {
          ...TodoApp_user
        }
      }
    `,
    variables: {
      userId: 'me',
    }});

  const {props, error, retry, cached} = hooksProps;
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