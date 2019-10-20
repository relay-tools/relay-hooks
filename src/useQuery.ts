import { useState, useEffect, useRef, useMemo } from "react";
import { OperationType, GraphQLTaggedNode } from "relay-runtime";
import * as areEqual from "fbjs/lib/areEqual";
import { FetchPolicy, RenderProps } from "./RelayHooksType";
import { CacheConfig } from "relay-runtime";
import { createOperationDescriptor, getRequest } from "relay-runtime";

import UseQueryFetcher from "./UseQueryFetcher";
import useFragment from "./useFragment";
import { __internal } from "relay-runtime";
import useRelayEnvironment from "./useRelayEnvironment";

type Reference = {
  queryFetcher: UseQueryFetcher;
};

function useDeepCompare<T>(value: T): T {
  const latestValue = useRef(value);
  if (!areEqual(latestValue.current, value)) {
    latestValue.current = value;
  }
  return latestValue.current;
}

const defaultPolicy = "store-or-network";

function useMemoOperationDescriptor(
  gqlQuery: GraphQLTaggedNode,
  variables: any
): any {
  const memoVariables = useDeepCompare(variables);
  return useMemo(() => {
    const query = createOperationDescriptor(
      getRequest(gqlQuery),
      memoVariables
    );
    return [
      query,
      query.node.fragment || query.request.node.fragment, // v5.0.0 || v6.0.0
      {
        __id: query.fragment.dataID,
        __fragments: {
          [query.fragment.node.name]:
            query.fragment.variables || query.request.variables
        },
        __fragmentOwner: query.fragment || query.request // v5.0.0 || v6.0.0
      }
    ];
  }, [gqlQuery, memoVariables]);
}

export const useQuery = function<TOperationType extends OperationType>(
  gqlQuery: GraphQLTaggedNode,
  variables: TOperationType["variables"],
  options: {
    fetchPolicy?: FetchPolicy;
    networkCacheConfig?: CacheConfig;
  } = {}
): RenderProps<TOperationType> {
  const environment = useRelayEnvironment();
  const [, forceUpdate] = useState(null);
  const { fetchPolicy = defaultPolicy, networkCacheConfig } = options;
  // const latestVariables = useDeepCompare(variables);

  const [query, fragmentDef, rootFragmentRef] = useMemoOperationDescriptor(
    gqlQuery,
    variables
  );

  // const prev = usePrevious({ environment, query });

  const ref = useRef<Reference>();
  if (ref.current === null || ref.current === undefined) {
    ref.current = {
      queryFetcher: new UseQueryFetcher(forceUpdate)
    };
  }
  const { queryFetcher } = ref.current;
  useEffect(() => {
    return () => queryFetcher.dispose();
  }, []);

  useEffect(() => {
    const disposable = environment.retain(query.root);
    return () => {
      disposable.dispose();
    };
  }, [environment, query]);

  const extraData = queryFetcher.execute(
    environment,
    query,
    fetchPolicy,
    networkCacheConfig
  );

  const data = useFragment(fragmentDef, rootFragmentRef);

  return {
    props: { ...data },
    ...extraData
  };
};

export default useQuery;
