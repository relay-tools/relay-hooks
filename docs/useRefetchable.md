---
id: use-refetchable
title: useRefetchable
---


```ts
import { useRefetchable, graphql } from 'relay-hooks';

const fragmentSpec = graphql`
    fragment TodoList_user on User
    @refetchable(queryName: "TodoListRefetchQuery") {
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

const options = {
    renderVariables: null,
    observerOrCallback: () => { console.log('Refetch done') },
    refetchOptions: {force: true},
}

const TodoApp = (props) => {
    const { data: user, refetch } = useRefetchable(fragmentSpec, props.user);
    const handlerRefetch = () => {
    const response = refetch({userId: 'me'}, options);
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