# useOssFragment

## useOssFragment only data

```ts
import { useOssFragment, graphql } from 'relay-hooks';

const fragmentSpec = graphql`
    fragment TodoApp_user on User {
      id
      userId
      totalCount
    }
  `;

const TodoApp = (props) => {
    const [user, ] = useOssFragment(fragmentSpec, props.user);
    return (   
        <div>
            <p> {user.id} </p>
            <p> {user.userId} </p>
            <p> {user.totalCount} </p>
        </div>
        );
};
  
```

## useOssFragment with refetch (refetchContainer)

```ts
import { useOssFragment, graphql } from 'relay-hooks';

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
    const [ user, { refetch } ] = useOssFragment(fragmentSpec, props.user);
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

## useOssFragment with isLoading, hasMore, loadMore (paginationContainer)

```ts
import { useOssFragment, graphql } from 'relay-hooks';

const fragmentSpec = graphql`
      fragment Feed_user on User
      @argumentDefinitions(
        count: {type: "Int", defaultValue: 10}
        cursor: {type: "ID"}
        orderby: {type: "[FriendsOrdering]", defaultValue: [DATE_ADDED]}
      ) {
        feed(
          first: $count
          after: $cursor
          orderby: $orderBy # Non-pagination variables
        ) @connection(key: "Feed_feed") {
          edges {
            node {
              id
              ...Story_story
            }
          }
        }
      }
    `;

const connectionConfig = {
    getVariables(props, {count, cursor}, fragmentVariables) {
      return {
        count,
        cursor,
        orderBy: fragmentVariables.orderBy,
        // userID isn't specified as an @argument for the fragment, but it should be a variable available for the fragment under the query root.
        userID: fragmentVariables.userID,
      };
    },
    query: graphql`
      # Pagination query to be fetched upon calling 'loadMore'.
      # Notice that we re-use our fragment, and the shape of this query matches our fragment spec.
      query FeedPaginationQuery(
        $count: Int!
        $cursor: ID
        $orderBy: [FriendsOrdering]!
        $userID: ID!
      ) {
        user: node(id: $userID) {
          ...Feed_user @arguments(count: $count, cursor: $cursor, orderBy: $orderBy)
        }
      }
    `
};

const Feed = (props) => {
    const [ user, { isLoading, hasMore, loadMore } ] = useOssFragment(fragmentSpec, props.user);
    const _loadMore = () => {
      if (!hasMore() || isLoading()) {
        return;
      }

      loadMore(
        connectionConfig,
        10,  // Fetch the next 10 feed items
        error => {
          console.log(error);
        },
      );
    }

    return (   
        <div>
        {user.feed.edges.map(
          edge => <Story story={edge.node} key={edge.node.id} />
        )}
        <button
          onPress={_loadMore}
          title="Load More"
        />
      </div>
        );
};
  
```