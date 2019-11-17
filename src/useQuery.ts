import { useEffect, useRef, useMemo } from 'react';
import { GraphQLTaggedNode } from 'relay-runtime';
import * as areEqual from 'fbjs/lib/areEqual';
import { UseQueryType } from './RelayHooksType';
import useRelayEnvironment from './useRelayEnvironment';
import useQueryFetcher from './useQueryFetcher';
import { createOperation } from './Utils';

function useDeepCompare<T>(value: T): T {
    const latestValue = useRef(value);
    if (!areEqual(latestValue.current, value)) {
        latestValue.current = value;
    }
    return latestValue.current;
}

export function useMemoOperationDescriptor(gqlQuery: GraphQLTaggedNode, variables: any): any {
    const memoVariables = useDeepCompare(variables);
    return useMemo(() => createOperation(gqlQuery, memoVariables), [gqlQuery, memoVariables]);
}

export const useQuery: UseQueryType = (gqlQuery, variables, options = {}) => {
    const environment = useRelayEnvironment();
    const query = useMemoOperationDescriptor(gqlQuery, variables);
    const queryFetcher = useQueryFetcher();

    useEffect(() => {
        const disposable = environment.retain(query.root);
        return () => {
            disposable.dispose();
        };
    }, [environment, query]);

    return queryFetcher.execute(environment, query, options);
};

export default useQuery;
