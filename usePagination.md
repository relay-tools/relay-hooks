# usePagination

```ts
import { usePagination, graphql } from 'relay-hooks';

const fragmentSpec = graphql`
      fragment Feed_user on User
      @argumentDefinitions(
        count: {type: "Int", defaultValue: 10}
        cursor: {type: "ID"}
        orderby: {type: "[FriendsOrdering]", defaultValue: [DATE_ADDED]}
      )
      @refetchable(queryName: "FeedRefetchQuery") {
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


const Feed = (props) => {
    const { data: user, isLoadingNext, hasNext, loadNext } = usePagination(fragmentSpec, props.user);
    const _loadMore = () => {
      if (!hasMore || isLoading) {
        return;
      }

      const onComplete = (error: Error | null) => {
        console.log("Complete", error);
      }

      loadMore(10, { onComplete });
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