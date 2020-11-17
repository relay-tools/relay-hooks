import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { RenderProps, QueryOptions } from './RelayHooksType';
import { useMemoOperationDescriptor } from './useQuery';
import { useQueryFetcher } from './useQueryFetcher';
import { useRelayEnvironment } from './useRelayEnvironment';
import { forceCache } from './Utils';

export const useLazyLoadQuery = <TOperationType extends OperationType = OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'] = {},
    options: QueryOptions = {},
): RenderProps<TOperationType> => {
    const environment = useRelayEnvironment();
    const { networkCacheConfig = forceCache } = options;
    const query = useMemoOperationDescriptor(gqlQuery, variables, networkCacheConfig);
    const queryFetcher = useQueryFetcher<TOperationType>(query);
    return queryFetcher.execute(environment, query, options);
};
