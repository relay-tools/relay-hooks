# usePagination

You can use `usePagination` to render a fragment that uses a `@connection` and paginate over it:

## Arguments:

They are the same as [useFragment](./useFragment.md).

## Return Value:

Object containing the following properties:

* `data`: Object that contains data which has been read out from the Relay store; the object matches the shape of specified fragment.
* `error`: Error will be defined if an error has occurred while refetching the query
* `errorNext`: Error will be defined if an error has occurred while fetching the *next* items
* `errorPrevious`: Error will be defined if an error has occurred while fetching the *previous* items
* `isLoading`: Boolean value which indicates if a refetch is currently in flight, including any incremental data payloads.
* `isLoadingNext`: Boolean value which indicates if a pagination request for the *next* items in the connection is currently in flight, including any incremental data payloads.
* `isLoadingPrevious`: Boolean value which indicates if a pagination request for the *previous* items in the connection is currently in flight, including any incremental data payloads.
* `hasNext`: Boolean value which indicates if the end of the connection has been reached in the “forward” direction. It will be true if there are more items to query for available in that direction, or false otherwise.
* `hasPrevious`: Boolean value which indicates if the end of the connection has been reached in the “backward” direction. It will be true if there are more items to query for available in that direction, or false otherwise.
* `loadNext`: Function used to fetch more items in the connection in the “forward” direction.
    * Arguments:
        * `count`: Number that indicates how many items to query for in the pagination request.
        * `options`: *_[Optional]_* options object
            * `onComplete`: Function that will be called whenever the refetch request has completed, including any incremental data payloads.
    * Return Value:
        * `disposable`: Object containing a `dispose` function. Calling `disposable.dispose()` will cancel the pagination request.
    * Behavior:
        * Calling `loadNext`  ***will not*** cause the component to suspend. Instead, the `isLoadingNext` value will be set to true while the request is in flight, and the new items from the pagination request will be added to the connection, causing the component to re-render.
        * Pagination requests initiated from calling `loadNext` will *always* use the same variables that were originally used to fetch the connection, *except* pagination variables (which need to change in order to perform pagination); changing variables other than the pagination variables during pagination doesn't make sense, since that'd mean we'd be querying for a different connection.
* `loadPrevious`: Function used to fetch more items in the connection in the “backward” direction.
    * Arguments:
        * `count`: Number that indicates how many items to query for in the pagination request.
        * `options`: *_[Optional]_* options object
            * `onComplete`: Function that will be called whenever the refetch request has completed, including any incremental data payloads.
    * Return Value:
        * `disposable`: Object containing a `dispose` function. Calling `disposable.dispose()` will cancel the pagination request.
    * Behavior:
        * Calling `loadPrevious`  ***will not*** cause the component to suspend. Instead, the `isLoadingPrevious` value will be set to true while the request is in flight, and the new items from the pagination request will be added to the connection, causing the component to re-render.
        * Pagination requests initiated from calling `loadPrevious` will *always* use the same variables that were originally used to fetch the connection, *except* pagination variables (which need to change in order to perform pagination); changing variables other than the pagination variables during pagination doesn't make sense, since that'd mean we'd be querying for a different connection.
* `refetch`: Function used to refetch the connection fragment with a potentially new set of variables.
    * Arguments:
        * `variables`: Object containing the new set of variable values to be used to fetch the `@refetchable` query.
            * These variables need to match GraphQL variables referenced inside the fragment.
            * However, only the variables that are intended to change for the refetch request need to be specified; any variables referenced by the fragment that are omitted from this input will fall back to using the value specified in the original parent query. So for example, to refetch the fragment with the exact same variables as it was originally fetched, you can call `refetch({})`.
            * Similarly, passing an `id` value for the `$id` variable is _*optional*_, unless the fragment wants to be refetched with a different `id`. When refetching a `@refetchable` fragment, Relay will already know the id of the rendered object.
        * `options`: *_[Optional]_* options object
            * `fetchPolicy`: Determines if cached data should be used, and when to send a network request based on cached data that is available. See the [`useLazyLoadQuery`](#uselazyloadquery) section for full specification.
            * `onComplete`: Function that will be called whenever the refetch request has completed, including any incremental data payloads.
    * Return value:
        * `disposable`: Object containing a `dispose` function. Calling `disposable.dispose()` will cancel the refetch request.
    * Behavior:
        * Calling `refetch` with a new set of variables will fetch the fragment again ***with the newly provided variables***. Note that the variables you need to provide are only the ones referenced inside the fragment. In this example, it means fetching the translated body of the currently rendered Comment, by passing a new value to the `lang` variable.
        * Calling `refetch` ***will not*** cause the component to suspend. Instead, the `isLoading` value will be set to true while the request is in flight

#### Behavior

* The component is automatically subscribed to updates to the fragment data: if the data for this particular `User` is updated anywhere in the app (e.g. via fetching new data, or mutating existing data), the component will automatically re-render with the latest updated data.
* The component will suspend if any data for that specific fragment is missing, and the data is currently being fetched by a parent query.
    * For more details on Suspense, see our [Loading States with Suspense](a-guided-tour-of-relay#loading-states-with-suspense) guide.
* Note that pagination (`loadNext` or `loadPrevious`), ***will not*** cause the component to suspend.

#### Differences with `PaginationContainer`

* A pagination query no longer needs to be specified in this api, since it will be automatically generated by Relay by using a `@refetchable` fragment.
* This api supports simultaneous bi-directional pagination out of the box.
* This api no longer requires passing a `getVariables` or `getFragmentVariables` configuration functions, like the `PaginationContainer` does.
    * This implies that pagination no longer has a between `variables` and `fragmentVariables`, which were previously vaguely defined concepts. Pagination requests will always use the same variables that were originally used to fetch the connection, *except* pagination variables (which need to change in order to perform pagination); changing variables other than the pagination variables during pagination doesn't make sense, since that'd mean we'd be querying for a different connection.
* This api no longer takes additional configuration like `direction` or `getConnectionFromProps` function (like Pagination Container does). These values will be automatically determined by Relay.
* Refetching no longer has a distinction between `variables` and `fragmentVariables`, which were previously vaguely defined concepts. Refetching will always correctly refetch and render the fragment with the variables you provide (any variables omitted in the input will fallback to using the original values in the parent query).
* Refetching will unequivocally update the component, which was not always true when calling `refetchConnection` from `PaginationContainer` (it would depend on what you were querying for in the refetch query and if your fragment was defined on the right object type).


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