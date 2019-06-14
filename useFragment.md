# useFragment

```ts
import { useFragment, graphql } from 'relay-hooks';

const fragmentSpec = graphql`
    fragment TodoApp_user on User {
      id
      userId
      totalCount
    }
  `;

const TodoApp = (props) => {
    const user = useFragment(fragmentSpec, props.user);
    return (   
        <div>
            <p> {user.id} </p>
            <p> {user.userId} </p>
            <p> {user.totalCount} </p>
        </div>
        );
};
  