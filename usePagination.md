# usePagination

```ts
import { usePagination, graphql } from 'relay-hooks';

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
    const [ user, { isLoading, hasMore, loadMore } ] = usePagination(fragmentSpec, props.user);
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