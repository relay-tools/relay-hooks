import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import useOssFragment from './useOssFragment';
import { PaginationFunction } from './RelayHooksType';
import { KeyType, KeyReturnType, $Call, ArrayKeyType, ArrayKeyReturnType } from './RelayHooksType';

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
    const [data, { loadMore, hasMore, isLoading, refetchConnection }] = useOssFragment(
        fragmentNode,
        fragmentRef,
    );

    return [data, { loadMore, hasMore, isLoading, refetchConnection }];
}

export default usePagination;
