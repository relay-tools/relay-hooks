import * as areEqual from 'fbjs/lib/areEqual';
import { useRef, useMemo, useEffect } from 'react';
import {
    GraphQLTaggedNode,
    OperationType,
    OperationDescriptor,
    Variables,
    CacheConfig,
} from 'relay-runtime';
import { getOrCreateQueryFetcher, QueryFetcher } from './QueryFetcher';
import { RenderProps, QueryOptions, InternalQueryOptions } from './RelayHooksType';
import { useForceUpdate } from './useForceUpdate';
import { useRelayEnvironment } from './useRelayEnvironment';
import { createOperation, forceCache } from './Utils';

type Reference<TOperationType extends OperationType = OperationType> = {
    queryFetcher: QueryFetcher<TOperationType>;
};

function useDeepCompare<T>(value: T): T {
    const latestValue = useRef(value);
    if (!areEqual(latestValue.current, value)) {
        latestValue.current = value;
    }
    return latestValue.current;
}

function useMemoOperationDescriptor(
    gqlQuery: GraphQLTaggedNode,
    variables: Variables,
    cacheConfig?: CacheConfig | null,
): OperationDescriptor {
    const memoVariables = useDeepCompare(variables);
    return useMemo(() => createOperation(gqlQuery, memoVariables, cacheConfig), [
        gqlQuery,
        memoVariables,
        cacheConfig,
    ]);
}

const useQueryFetcher = <TOperationType extends OperationType>(
    query?: OperationDescriptor,
): QueryFetcher<TOperationType> => {
    const forceUpdate = useForceUpdate();
    const ref = useRef<Reference<TOperationType>>();
    if (ref.current === null || ref.current === undefined) {
        ref.current = {
            queryFetcher: getOrCreateQueryFetcher(query, forceUpdate),
        };
    }
    //const { queryFetcher } = ref.current;
    useEffect(() => {
        ref.current.queryFetcher.setMounted();
        return (): void => ref.current.queryFetcher.dispose();
    }, []);
    return ref.current.queryFetcher;
};

const useInternalQuery = <TOperationType extends OperationType = OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'] = {},
    options: InternalQueryOptions = {},
    networkCacheConfig: CacheConfig,
    suspense: boolean,
): RenderProps<TOperationType> => {
    const environment = useRelayEnvironment();
    const query = useMemoOperationDescriptor(gqlQuery, variables, networkCacheConfig);
    const queryFetcher = useQueryFetcher<TOperationType>(suspense ? query : null);
    queryFetcher.execute(environment, query, options);
    queryFetcher.checkAndSuspense(suspense, suspense);
    return queryFetcher.getData();
};

export const useQuery = <TOperationType extends OperationType = OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'] = {},
    options: QueryOptions = {},
): RenderProps<TOperationType> => {
    return useInternalQuery(gqlQuery, variables, options, options.networkCacheConfig, false);
};

export const useLazyLoadQuery = <TOperationType extends OperationType = OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'] = {},
    options: QueryOptions = {},
): RenderProps<TOperationType> => {
    const { networkCacheConfig = forceCache } = options;
    return useInternalQuery(gqlQuery, variables, options, networkCacheConfig, true);
};
