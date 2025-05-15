import { useRef, useEffect } from 'react';
import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { getOrCreateQueryFetcher, QueryFetcher } from './QueryFetcher';
import { RenderProps, QueryOptions } from './RelayHooksTypes';
import { useForceUpdate } from './useForceUpdate';
import { useRelayEnvironment } from './useRelayEnvironment';
import { forceCache } from './Utils';

type Reference<TOperationType extends OperationType = OperationType> = {
    queryFetcher: QueryFetcher<TOperationType>;
};

const useInternalQuery = <TOperationType extends OperationType = OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    options: QueryOptions,
    suspense: boolean,
): RenderProps<TOperationType> => {
    const environment = useRelayEnvironment();
    const forceUpdate = useForceUpdate();
    const ref = useRef<Reference<TOperationType>>(undefined);
    const maybeHiddenOrFastRefresh = useRef(false);
    if (ref.current === null || ref.current === undefined || maybeHiddenOrFastRefresh.current == true) {
        ref.current = {
            queryFetcher: getOrCreateQueryFetcher(suspense, gqlQuery, variables, options.networkCacheConfig),
        };
        maybeHiddenOrFastRefresh.current = false;
    }

    useEffect(() => {
        if (maybeHiddenOrFastRefresh.current == true) {
            forceUpdate();
        }
        return (): void => {
            ref.current.queryFetcher.dispose();
            maybeHiddenOrFastRefresh.current = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { queryFetcher } = ref.current;
    queryFetcher.resolve(environment, gqlQuery, variables, options);
    queryFetcher.checkAndSuspense(suspense, suspense);
    queryFetcher.setForceUpdate(forceUpdate);
    return queryFetcher.getData();
};

export const useQuery = <TOperationType extends OperationType = OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'] = {},
    options: QueryOptions = {},
): RenderProps<TOperationType> => {
    return useInternalQuery(gqlQuery, variables, options, false);
};

export const useLazyLoadQuery = <TOperationType extends OperationType = OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'] = {},
    options: QueryOptions = {},
): RenderProps<TOperationType> => {
    options.networkCacheConfig = options.networkCacheConfig ?? forceCache;
    return useInternalQuery(gqlQuery, variables, options, true);
};
