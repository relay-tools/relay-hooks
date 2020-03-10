import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { RenderProps, QueryOptions } from './RelayHooksType';
import useRelayEnvironment from './useRelayEnvironment';
import useQueryFetcher from './useQueryFetcher';
import { useMemoOperationDescriptor } from './useQuery';

export const useLazyLoadQuery: <TOperationType extends OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'],
    options?: QueryOptions,
) => RenderProps<TOperationType> = <TOperationType extends OperationType>(
    gqlQuery,
    variables,
    options = {} as QueryOptions,
) => {
    const environment = useRelayEnvironment();
    const query = useMemoOperationDescriptor(gqlQuery, variables);
    const queryFetcher = useQueryFetcher<TOperationType>(query);
    return queryFetcher.execute(environment, query, options);
};

export default useLazyLoadQuery;
