import { useMemo } from 'react';
import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import {
    PaginationFunction,
    KeyType,
    KeyReturnType,
    $Call,
    ArrayKeyType,
    ArrayKeyReturnType,
} from './RelayHooksType';
import useOssFragment from './useOssFragment';

function usePagination<TKey extends KeyType, TOperationType extends OperationType = OperationType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [$Call<KeyReturnType<TKey>>, PaginationFunction<TOperationType['variables']>];
function usePagination<TKey extends KeyType, TOperationType extends OperationType = OperationType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [$Call<KeyReturnType<TKey>> | null, PaginationFunction<TOperationType['variables']>];
function usePagination<
    TKey extends ArrayKeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [
    ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>,
    PaginationFunction<TOperationType['variables']>,
];
function usePagination<
    TKey extends ArrayKeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [
    ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null,
    PaginationFunction<TOperationType['variables']>,
] {
    const [data, resolverFunction] = useOssFragment(fragmentNode, fragmentRef);

    const fns = useMemo(() => {
        return {
            loadMore: resolverFunction.loadMore,
            hasMore: resolverFunction.hasMore,
            isLoading: resolverFunction.isLoading,
            refetchConnection: resolverFunction.refetchConnection,
        };
    }, [resolverFunction]);

    return [data, fns];
}

export default usePagination;
