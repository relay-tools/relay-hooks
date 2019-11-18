import { useRef, useMemo } from 'react';
import { GraphQLTaggedNode, OperationType, OperationDescriptor, Variables } from 'relay-runtime';
import * as areEqual from 'fbjs/lib/areEqual';
import { RenderProps, QueryOptions } from './RelayHooksType';
import useRelayEnvironment from './useRelayEnvironment';
import useQueryFetcher from './useQueryFetcher';
import { createOperation } from './Utils';

export function useDeepCompare<T>(value: T): T {
    const latestValue = useRef(value);
    if (!areEqual(latestValue.current, value)) {
        latestValue.current = value;
    }
    return latestValue.current;
}

export function useMemoOperationDescriptor(
    gqlQuery: GraphQLTaggedNode,
    variables: Variables,
): OperationDescriptor {
    const memoVariables = useDeepCompare(variables);
    return useMemo(() => createOperation(gqlQuery, memoVariables), [gqlQuery, memoVariables]);
}

export const useQuery: <TOperationType extends OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    options: QueryOptions,
) => RenderProps<TOperationType> = <TOperationType extends OperationType>(
    gqlQuery,
    variables,
    options = {},
) => {
    const environment = useRelayEnvironment();
    const query = useMemoOperationDescriptor(gqlQuery, variables);
    const queryFetcher = useQueryFetcher<TOperationType>();

    return queryFetcher.execute(environment, query, options);
};

export default useQuery;
