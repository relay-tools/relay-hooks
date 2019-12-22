import useOssFragment from './useOssFragment';
import { PaginationFunction } from './RelayHooksType';
import { GraphQLTaggedNode } from 'relay-runtime';
import { KeyType, KeyReturnType, $Call, ArrayKeyType, ArrayKeyReturnType } from './RelayHooksType';

function usePagination<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [$Call<KeyReturnType<TKey>>, PaginationFunction];
function usePagination<TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [$Call<KeyReturnType<TKey>> | null, PaginationFunction];
function usePagination<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>, PaginationFunction];
function usePagination<TKey extends ArrayKeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null, PaginationFunction] {
    const [data, { loadMore, hasMore, isLoading, refetchConnection }] = useOssFragment(
        fragmentNode,
        fragmentRef,
    );

    return [data, { loadMore, hasMore, isLoading, refetchConnection }];
}

export default usePagination;
