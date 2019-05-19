# relay-hooks
Use Relay as React hooks

## Installation

Install react-relay and relay-hooks using yarn or npm:

```
yarn add react-relay relay-hooks
```

## Usage QueryRenderer Backward Compatibility 

Change the renderer 

```ts
import {QueryRenderer} from 'relay-hooks'; 
```

## Usage Hooks

* useQuery

```ts
import {useQuery, graphql } from 'relay-hooks';

const AppTodo = function (appProps)  {
  const hooksProps = useQuery({environment: modernEnvironment,
    query: graphql`
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
* useFragment

```ts
import { useFragment, graphql } from 'relay-hooks';

const fragmentSpec = {
  user: graphql`
    fragment TodoApp_user on User {
      id
      userId
      totalCount
    }
  `,
};

const TodoApp = (props) => {
    const { user, relay } = useFragment(props, fragmentSpec);
    return (   
        <div>
            <p> {user.id} </p>
            <p> {user.userId} </p>
            <p> {user.totalCount} </p>
        </div>
        );
};
  
```