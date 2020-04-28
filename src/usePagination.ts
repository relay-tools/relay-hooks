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
import { useOssFragment } from './useOssFragment';

export function usePagination<
    TKey extends KeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [$Call<KeyReturnType<TKey>>, PaginationFunction<TOperationType['variables']>];
export function usePagination<
    TKey extends KeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [$Call<KeyReturnType<TKey>> | null, PaginationFunction<TOperationType['variables']>];
export function usePagination<
    TKey extends ArrayKeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [
    ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>>,
    PaginationFunction<TOperationType['variables']>,
];
export function usePagination<
    TKey extends ArrayKeyType,
    TOperationType extends OperationType = OperationType
>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): [
    ReadonlyArray<$Call<ArrayKeyReturnType<TKey>>> | null,
    PaginationFunction<TOperationType['variables']>,
] {
    const [data, resolver] = useOssFragment(fragmentNode, fragmentRef);

    const fns = useMemo(() => {
        return {
            loadMore: resolver.loadMore,
            hasMore: resolver.hasMore,
            isLoading: resolver.isLoading,
            refetchConnection: resolver.refetchConnection,
        };
    }, [resolver]);

    return [data, fns];
}
