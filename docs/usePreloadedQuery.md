---
id: use-preloaded-query
title: usePreloadedQuery
---

# [sample project with nextjs and SSR](https://github.com/relay-tools/relay-hooks/tree/master/examples/relay-hook-example/nextjs-ssr-preload)

# loadQuery

* input parameters

same as useQuery + environment

* output parameters
  * `next: (
        environment: IEnvironment,
        gqlQuery: GraphQLTaggedNode,
        variables?: TOperationType['variables'],
        options?: QueryOptions,
    ) => Promise<void>`:  fetches data. A promise returns to allow the await in case of SSR
  * `dispose: () => void`: cancel the subscription and dispose of the fetch
  * `subscribe: (callback: (value: any) => any) => () => void`:  used by the usePreloadedQuery
  * `getValue: (environment?: IEnvironment) => RenderProps<TOperationType> | Promise<any>`:  used by the usePreloadedQuery

```ts
import {graphql, loadQuery} from 'relay-hooks';
import {environment} from ''./environment';

const query = graphql`
  query AppQuery($id: ID!) {
    user(id: $id) {
      name
    }
  }
`;

const prefetch = loadQuery();
prefetch.next(
  environment,
  query,
  {id: '4'},
  {fetchPolicy: 'store-or-network'},
);
// pass prefetch to usePreloadedQuery()
```

# loadLazyQuery

**is the same as loadQuery but must be used with suspense**

# usePreloadedQuery

* input parameters
  * loadQuery | loadLazyQuery

* output parameters
  * same as useQuery

```ts
function Component(props) {
  data = usePreloadedQuery(props.prefetched);
  return data;
}
```