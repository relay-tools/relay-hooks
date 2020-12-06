import { useMemo } from 'react';
import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import {
    KeyType,
    KeyTypeData,
    ReturnTypePagination,
    ReturnTypePaginationSuspense,
} from './RelayHooksType';
import { useOssFragment } from './useOssFragment';

function useInternalPagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
    suspense: boolean,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePagination<TQuery, TKey, KeyTypeData<TKey>>;
function useInternalPagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    suspense: boolean,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePagination<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    const [data, resolver] = useOssFragment(fragmentNode, fragmentRef, suspense, 'usePagination');

    resolver.checkRefechAndSuspense(suspense);

    const [loadPrevious, loadNext, refetch] = useMemo(
        () => [resolver.loadPrevious, resolver.loadNext, resolver.refetch],
        [resolver],
    );
    const [
        hasNext,
        isLoadingNext,
        hasPrevious,
        isLoadingPrevious,
        isLoading,
    ] = resolver.getPaginationData();
    return {
        data,
        loadNext,
        loadPrevious,
        refetch,
        hasNext,
        isLoadingNext,
        hasPrevious,
        isLoadingPrevious,
        isLoading,
    };
}

export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePagination<TQuery, TKey, KeyTypeData<TKey>>;
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePagination<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    return useInternalPagination(fragmentNode, fragmentRef, false);
}

export function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePaginationSuspense<TQuery, TKey, KeyTypeData<TKey>>;
export function usePaginationFragment<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnTypePaginationSuspense<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    return useInternalPagination(fragmentNode, fragmentRef, true);
}
