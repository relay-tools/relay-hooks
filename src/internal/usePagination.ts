import { useMemo } from 'react';
import { GraphQLTaggedNode, OperationType } from 'relay-runtime';
import { KeyType, KeyTypeData, LoadMoreFn, RefetchFnDynamic } from '../RelayHooksType';
import { useOssFragment } from '../useOssFragment';

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
    isLoading: boolean;
    isLoadingNext: boolean;
    isLoadingPrevious: boolean;
    refetch: RefetchFnDynamic<TQuery, TKey>;
}

export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey,
    suspense: boolean,
): // tslint:disable-next-line no-unnecessary-generics
ReturnType<TQuery, TKey, KeyTypeData<TKey>>;
export function usePagination<TQuery extends OperationType, TKey extends KeyType>(
    fragmentNode: GraphQLTaggedNode,
    fragmentRef: TKey | null,
    suspense: boolean,
): // tslint:disable-next-line no-unnecessary-generics
ReturnType<TQuery, TKey | null, KeyTypeData<TKey> | null> {
    const [data, resolver] = useOssFragment(fragmentNode, fragmentRef, suspense);

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
        isLoading: resolver.isLoading(),
        isLoadingNext,
        isLoadingPrevious,
        refetch: fns.refetch,
    };
}
