import { useMemo } from 'react';
import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { KeyType, KeyTypeData, LoadMoreFn, RefetchFnDynamic } from './RelayHooksType';
import { useOssFragment } from './useOssFragment';
/*
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentInput: GraphQLTaggedNode,
    parentFragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
[KeyTypeData<TKey> | null, PaginationFunction<TQuery, TKey | null>];
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): [KeyTypeData<TKey>, PaginationFunction<TQuery, TKey>] {*/

export interface ReturnType<
    TQuery extends OperationType,
    TKey extends KeyType | null,
    TFragmentData
> {
    data: TFragmentData;
    loadNext: LoadMoreFn<TQuery>;
    loadPrevious: LoadMoreFn<TQuery>;
    hasNext: boolean;
    hasPrevious: boolean;
    isLoadingNext: boolean;
    isLoadingPrevious: boolean;
    refetch: RefetchFnDynamic<TQuery, TKey>;
}

export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
): // tslint:disable-next-line no-unnecessary-generics
ReturnType<TQuery, TKey, KeyTypeData<TKey>>;
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
): // tslint:disable-next-line no-unnecessary-generics
ReturnType<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    const [data, resolver] = useOssFragment(fragmentNode, fragmentRef);

    const fns = useMemo(() => {
        return {
            loadPrevious: resolver.loadPrevious,
            loadNext: resolver.loadNext,
            refetch: resolver.refetch,
        };
    }, [resolver]);

    const [hasNext, isLoadingNext] = resolver.getPaginationData('forward');
    const [hasPrevious, isLoadingPrevious] = resolver.getPaginationData('backward');

    return {
        data,
        loadNext: fns.loadNext,
        loadPrevious: fns.loadPrevious,
        hasNext,
        hasPrevious,
        isLoadingNext,
        isLoadingPrevious,
        refetch: fns.refetch,
    };
}
