# useRefetch

```ts
import { useRefetch, graphql } from 'relay-hooks';

const fragmentSpec = graphql`
    fragment TodoList_user on User {
      todos(
        first: 2147483647 # max GraphQLInt
      ) @connection(key: "TodoList_todos") {
        edges {
          node {
            id
            complete
            ...Todo_todo
          }
        }
      }
      id
      userId
      totalCount
      completedCount
      ...Todo_user
    }
  `;

const TodoApp = (props) => {
    const [ user, refetch ] = useRefetch(fragmentSpec, props.user);
    const handlerRefetch = () => {
    const response = refetch(QueryApp,
      {userId: 'me'},  
      null,  
      () => { console.log('Refetch done') },
      {force: true},  
    );
    //response.dispose(); 

  }

    return (   
        <div>
            <p> {user.id} </p>
            <p> {user.userId} </p>
            <p> {user.totalCount} </p>
            <button onClick={handlerRefetch}> Refetch </button>
        </div>
        );
};
  
```