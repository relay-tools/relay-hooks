import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { RenderProps, QueryOptions } from './RelayHooksType';
import { useMemoOperationDescriptor } from './useQuery';
import useQueryFetcher from './useQueryFetcher';
import useRelayEnvironment from './useRelayEnvironment';

export const useLazyLoadQuery = <TOperationType extends OperationType>(
    gqlQuery: GraphQLTaggedNode,
    variables: TOperationType['variables'] = {},
    options: QueryOptions = {},
): RenderProps<TOperationType> => {
    const environment = useRelayEnvironment();
    const query = useMemoOperationDescriptor(gqlQuery, variables);
    const queryFetcher = useQueryFetcher<TOperationType>(query);
    return queryFetcher.execute(environment, query, options);
};

export default useLazyLoadQuery;
